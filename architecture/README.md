# NanoAffiliate — Pay-Per-Second Attention Payments on Hedera

> Affiliate payouts by the second, not the month. No bots. No delay. Just Hedera.

Creators earn real, on-chain micropayments for every verified 5-second interval of
genuine human attention their affiliate links drive — metered and settled natively
on Hedera, fraud-resisted by a paid x402 trust oracle, and hardened against
wallet/session farming by an optional Selfie Check biometric layer. Every link is
its own self-describing, independently auditable HCS topic — the link you share
and the on-chain record of everything that happened on it are the same identifier.

---

## 1. What this actually is

Two things bolted together on purpose, not by accident:

1. **A real x402-gated service on Hedera** — the *Attention Trust Oracle*, a
   pay-per-call API that scores whether a browsing session looks like genuine
   human attention. Any agent can call it, pay for it, and get a verdict.
2. **A consuming platform** — the NanoAffiliate backend, running a Hedera Agent
   that calls the Oracle every 5 seconds per active session, and pays the
   creator out of the seller's escrow whenever the Oracle says the attention
   was real.

Every payment — the Oracle's per-call fee and the creator's payout — is a real
Hedera transaction. Every trust decision is logged, permanently and publicly,
to a Hedera Consensus Service topic **dedicated to that specific link**, so
nobody has to take the platform's word for why a payout happened — they can
paste the link's own topic ID into any Hedera explorer and see it directly.
Both the Oracle and the Agent carry a portable, independently-verifiable
HCS-14 identity, so the x402 service relationship isn't just "an account
number paying another account number."

---

## 2. System diagram

```
Creator ──creates link──┐
                         ▼
                 NanoAffiliate Platform
                         │
        ┌────────────────┼─────────────────────┐
        ▼                ▼                      ▼
   Link Redirect     Tick Scheduler        Dynamic Rate
   Service            (BullMQ + Redis)      Setter (hourly)
        │                │                      │
        ▼                ▼                      │
   sessions row     Hedera Agent  ◄──────────────┘
   created           (Agent Kit,
   (Supabase)         AUTONOMOUS mode,
                       UAID: uaid:aid:...)
                         │
             ┌───────────┼────────────┐
             ▼                        ▼
     Attention Trust Oracle    Selfie Check Verifier
     (x402-gated service,      (World ID / IDKit,
      Railway, UAID:            triggered on borderline
      uaid:aid:...)             trust or premium tier)
             │
             │ decision
             ▼
     Creator Payout Transaction (Hedera TransferTransaction)
             │
             ▼
     THIS LINK'S OWN HCS TOPIC (0.0.xxxxxxx)  ──►  Mirror Node / HashScan
     Global HCS Topic ("identity-registry")   ──►  Oracle + Agent HCS-11 profiles
```

---

## 3. Component map — what runs where

| Component | Role | Deployed on |
|---|---|---|
| Attention Trust Oracle | x402-gated scoring service, holds a UAID | Railway (Node/Express) |
| Hedera Agent (consumer) | Signs & submits all Hedera transactions, holds a UAID | Railway, same process cluster as scheduler |
| Tick Scheduler / Job Queue | Fires a scoring job per active session every 5s | BullMQ + Redis (Railway add-on or Upstash) |
| Link Redirect Service | Resolves a link's topic ID → real product URL, creates session, logs the click to that link's topic | Same Express app as Oracle, different route |
| Dynamic Rate Setter | Hourly cron adjusting seller rates | node-cron, same process, or a scheduled job |
| Supabase | Catalog, session state, rate config, link↔topic mapping (Postgres under the hood) | Supabase (managed) |
| Redis | Rolling diversity aggregate, BullMQ job queue | Railway add-on or Upstash |
| Hedera Ledger | Actual money movement | Hedera testnet (demo) / mainnet |
| Per-link HCS Topics | One dedicated topic per link — click/tick/fraud/conversion event log | Hedera Consensus Service |
| HCS Topic — "identity-registry" | Global — Oracle/Agent/creator UAID + HCS-11 profiles | Hedera Consensus Service |
| Mirror Node | Public read layer for dashboard + Oracle diversity checks | Hedera-hosted, public REST API |
| HashScan (or any Hedera explorer) | Public verification of any single link's full history | hashscan.io |
| Dashboard | Live seller/creator view | Next.js (Vercel), reads Mirror Node directly |
| Selfie Check | Biometric verification | World ID App, via IDKit deep link/QR |

---

## 4. Data model (Supabase)

Supabase (Postgres under the hood, accessed via Supabase's client/API) holds
**process state** — everything mutable, high-frequency, or operational. It
never claims a payment or an event happened; it stores a pointer (`tx_id`,
`hcs_topic_id`) to the real record on Hedera.

```sql
sellers (
  id, hedera_account_id, escrow_hedera_account_id, escrow_balance_cached,
  created_at
)

products (
  id, seller_id, source_url, title, image_url, price_display,
  affiliate_tag, created_at
)

creators (
  id, hedera_account_id, uaid NULLABLE,        -- optional HCS-14 identity, tier 3
  cold_start_started_at, cumulative_attention_events,
  trust_penalty_multiplier DEFAULT 1.0
)

links (
  id, creator_id, product_id, slug,
  hcs_topic_id,                                -- e.g. "0.0.6560884" — THIS is
                                                --   the identifier shared in
                                                --   the public URL
  rate_unverified_per_tick, rate_verified_per_tick, rate_purchase_bonus,
  bundle_id NULLABLE, created_at
)

sessions (
  id, link_id, reader_fingerprint_hash,
  reader_uaid NULLABLE, is_verified BOOLEAN DEFAULT false,
  verified_until TIMESTAMP NULLABLE,
  cumulative_trust_score FLOAT, borderline_tick_count INT DEFAULT 0,
  status ENUM('active','paused','ended'),
  started_at, last_tick_at
)

ticks (
  id, session_id, tick_number,
  oracle_trust_score, oracle_call_tx_id, payout_tx_id NULLABLE,
  hcs_message_seq_number,                      -- sequence number on the
                                                --   link's own topic
  rate_tier ENUM('unverified','verified'),
  amount_paid, created_at
)

conversions (
  id, session_id, order_id_self_reported NULLABLE,
  seller_webhook_payload NULLABLE,
  confirmation_type ENUM('self_reported','webhook_verified'),
  bonus_payout_tx_id NULLABLE, created_at
)

paid_attention_seconds_today (
  link_id, identity_key,           -- reader_uaid if verified, else fingerprint_hash
  seconds_paid, window_date
)

pending_payouts (
  id, session_id, tick_id, reason, queued_at, retry_count
)
```

Redis (separate from Supabase, see §12) holds two short-lived structures that
don't belong in a durable database:
- `diversity:{link_id}` — sorted set of recent `{timestamp: fingerprint/IP-ASN}`, auto-trimmed to a 10-minute window
- The BullMQ job queue itself (tick jobs, payout retries)

Hedera holds the two things that must be independently verifiable:
- Every real transfer (Oracle payment, creator payout, escrow funding)
- Every trust decision, click, and identity document — one topic per link,
  plus the global identity-registry topic

---

## 5. Link identity — every link IS its own HCS topic

This is the core architectural choice that makes the whole system
self-verifying, not just self-reporting.

```
Creator picks a product → backend creates a NEW HCS topic:

  const topicTx = await new TopicCreateTransaction()
    .setTopicMemo(`nanoaffiliate:${creatorId}:${productId}`)   // ≤100 bytes
    .execute(client);
  const topicId = (await topicTx.getReceipt(client)).topicId;   // e.g. 0.0.6560884

  → stored in links.hcs_topic_id
  → the very first message submitted to it is a self-contained manifest
    (see §7) — anyone opening this topic cold understands what it is
    with zero dependency on NanoAffiliate's own database

Shareable URL:  nanoaffiliate.io/t/0.0.6560884
```

**One identifier, two doors:**

| Where it's used | What happens |
|---|---|
| Pasted into a browser | `GET /t/:topicId` → resolve link → create session → redirect to the real product |
| Pasted into HashScan (`hashscan.io/testnet/topic/0.0.6560884`) | Full, live, tamper-proof history of every click, tick, flag, and conversion on *that specific link* — publicly readable, independent of NanoAffiliate's own dashboard or API |

**Why this is honest, not a trick:** a browser URL and a Hedera entity ID are
different namespaces — you can't literally paste the marketing slug into
HashScan. What makes this work is that the *raw topic ID is embedded directly
in the link itself*, so anyone holding the link already holds the on-chain
identifier — no separate lookup, no translation step required.

**Cost trade-off, stated plainly:** creating a dedicated topic per link costs
a small real fee (~$0.01 on testnet, trivial) instead of reusing one shared
topic. For a hackathon demo with a handful of links this is a non-issue and
doubles as a selling point ("radical per-link transparency"). At real
production scale, a hybrid (shared topic for long-tail links, dedicated
topics for active/high-value ones) would be the natural next step — noted as
a scaling consideration, not built here.

---

## 6. End-to-end flow

### 6.1 Seller onboarding
```
1. Seller signs up → row in `sellers`
2. Seller submits product (manual entry: title/image/price/URL — no PA-API dependency)
3. Platform creates a NEW escrow account for the seller, keyed to the
   Agent's own public key (see §16) → escrow_hedera_account_id stored
4. Seller funds THAT escrow account with a real, seller-signed transfer
   from their own wallet
5. Platform reads escrow balance via Mirror Node, caches it
```

### 6.2 Creator link creation
```
1. Creator picks a product from the catalog, sets/inherits rates
2. Platform creates a dedicated HCS topic for this link (see §5)
3. First message submitted: the `link_created` manifest (see §7)
4. Row created in `links`, including `hcs_topic_id`
5. Shareable URL: nanoaffiliate.io/t/{hcs_topic_id}
```

### 6.3 Buyer clicks the link
```
GET /t/:topicId
  1. Look up link by hcs_topic_id → product, creator, rates
  2. Create `sessions` row → session_id issued
  3. Submit a `click` message to THIS LINK'S topic (not a shared one)
  4. Serve the attention page

← the link's job is done here. Everything from this point on revolves
  around the session, not the link.
```

### 6.4 The 5-second tick loop (the core mechanic)
```
Client: setInterval every 5s while document.visibilityState === 'visible'
  → gather signals: tab_active, last_interaction_ms_ago,
    scroll_velocity_curve, device_fingerprint_hash
  → POST /report-signals { session_id, signals }

Backend: enqueue a "score-this-session" job (BullMQ, see §12)

Worker (Hedera Agent, AUTONOMOUS mode):
  1. Call Oracle: POST /verify-attention (session_id, signals)
     a. First call → 402 Payment Required (response includes the Oracle's
        own UAID, see §11)
     b. Agent verifies that UAID against the identity-registry topic
        (optional, tier 2 — see §11)
     c. Agent signs a TransferTransaction (x402/hedera exact scheme)
     d. Resubmits with X-PAYMENT header
     e. Blocky402 facilitator verifies + settles → real Hedera transfer fires
     f. Oracle now runs its scoring pipeline, returns a decision
  2. Branch on decision:
     - pay_full / pay_reduced:
         check seller's live escrow balance (Mirror Node)
         → sufficient: sign & submit creator payout TransferTransaction,
           submit a `tick` message to this link's topic
         → insufficient: queue in `pending_payouts`, submit a
           `payout_queued` message, alert seller
     - require_selfie_check: submit a `selfie_check_triggered` message,
       push a WebSocket event, client renders IDKit
     - reject: no payment, no payout — submit a `tick_rejected` message
       with the reason, so the audit trail records rejects as precisely
       as it records payouts
  3. Write oracle_call_tx_id + payout_tx_id + hcs_message_seq_number to `ticks`

Tab backgrounds → client stops the interval entirely (no signals sent,
no Oracle call made, no cost incurred, no HCS message submitted)
→ resumes on visibilitychange
```

### 6.5 Session end
```
Detected via (in order of preference):
  1. beforeunload / pagehide event — explicit "ending" ping
  2. Heartbeat timeout — no signal received for 30s → mark `ended` server-side
  3. Hard cap — session open > 2h → force-ended

`sessions.status = 'ended'`, a `session_end` message is submitted to this
link's topic, scheduler stops enqueueing jobs for it
```

### 6.6 Purchase confirmation (two explicit, separately labeled paths)
```
Path A — third-party seller (e.g. Amazon), no conversion API exists:
  Buyer redirected to source_url + "?tag=" + affiliate_tag
  Buyer returns, pastes Order ID
  → conversions.confirmation_type = 'self_reported'
  → bonus fires, a `conversion` message is submitted with that label,
    dashboard shows it as "self-reported — unverified"

Path B — seller-controlled checkout (used for the live qualifying demo):
  Seller's server POSTs a signed webhook to /webhooks/purchase-confirmed
  → conversions.confirmation_type = 'webhook_verified'
  → bonus wrapped in a Scheduled Transaction with a short delay (~5 min),
    giving fraud checks a window to flag-and-cancel before funds move
  → a `conversion` message is submitted, dashboard shows it as verified
```

---

## 7. HCS message catalog — precisely what gets written, and where

Every message, whatever the type, shares one envelope shape, so a reader
(human or script) parsing the raw topic can always tell what they're looking
at without guessing:

```json
{ "type": "...", "session_id": "...", "consensus_timestamp": "(set by Hedera)", ...type-specific fields }
```

| Type | Fires | Payload highlights | Tier |
|---|---|---|---|
| `link_created` | Once, first message on the topic | creator_id, product_title, seller_id, affiliate_tag, both rates, created_at — the self-contained manifest | 1 — build |
| `click` | Buyer opens the link | session_id, timestamp | 1 — build |
| `tick` | Every paid 5s tick | tick_number, oracle_call_tx_id, payout_tx_id, trust_score, decision, rate_tier, amount_paid | 1 — build |
| `tick_rejected` | Every rejected 5s tick | tick_number, trust_score, reason, oracle_call_tx_id | 1 — build |
| `session_end` | Session closes | total_ticks, total_paid, end_reason | 1 — build |
| `selfie_check_triggered` | Borderline threshold crossed | borderline_tick_count, trigger_score | 2 — if Selfie Check works |
| `selfie_check_result` | World ID callback resolves | verified boolean, reader_uaid | 2 — if Selfie Check works |
| `conversion` | Purchase confirmed | confirmation_type, bonus_payout_tx_id | 2 — if conversions built |
| `fraud_flag` | Diversity check flags the link | reason, diversity_score, window | 3 — roadmap, don't build for demo |
| `payout_queued` / `payout_released` / `payout_dropped` | Escrow insufficient | tick_id, reason | 3 — roadmap |
| `rate_snapshot` | Seller changes this link's rate | old_rate, new_rate | 3 — roadmap |

**Why `tick_rejected` and `fraud_flag` matter more than they look:** without
them, a creator asking "why wasn't I paid for that 5-minute read" only ever
gets an answer from Supabase — exactly the kind of "trust us" claim the
whole point of HCS was meant to avoid. Logging rejects with a reason makes
the audit trail symmetric: every decision, paid or not, is independently
checkable by anyone, not just the successes.

**Size constraint:** HCS messages are capped at 1024 bytes each (larger
payloads auto-chunk across multiple submissions — avoid this, keep messages
small and flat). Every payload above fits comfortably within that on its
own. Topic **memo** is separately capped around 100 bytes, which is why the
manifest is its own `link_created` message rather than crammed into the memo.

**Global identity-registry topic** (separate from all per-link topics) holds
HCS-11 profile documents for the Oracle and the Agent (see §11) — identity
isn't a per-link concept, so it doesn't move to the per-link topics.

---

## 8. Attention Trust Oracle — full check list

Stateless HTTP service, one meaningful route, gated by x402 middleware
before any scoring code executes.

| # | Check | Signal source | What it catches |
|---|---|---|---|
| 1 | Tab/liveness state | `document.hasFocus()`, Page Visibility API | Backgrounded/minimized tabs — hard gate, short-circuits to reject |
| 2 | Interaction recency | timestamp of last mouse/scroll/key/touch event | Idle tabs left open |
| 3 | Scroll-pace naturalness | buffered scroll deltas, variance analysis | Scripted/linear scroll patterns |
| 4 | Device/fingerprint consistency | canvas/WebGL hash, `navigator.webdriver`, plugin list | Headless browsers, spoofed environments |
| 5 | Session diversity (Fraud Sentinel) | rolling Redis aggregate per `link_id`: IP-ASN spread, fingerprint spread, arrival timing entropy | Coordinated bot farms hitting one link |
| 6 | Cumulative session trust | EMA of this session's own score history (Supabase) | Sustained borderline patterns a single tick would miss |
| 7 | Escalation trigger | `borderline_tick_count > N` | Hands off to Selfie Check instead of guessing |
| 8 | Verified-status read | `sessions.is_verified` + `verified_until` | Applies the premium "verified" rate tier |

```
raw_score =
  0.30 * tab_state_score +
  0.15 * interaction_recency +
  0.15 * scroll_naturalness +
  0.15 * fingerprint_consistency +
  0.25 * session_diversity

adjusted_score = raw_score * session.trust_penalty_multiplier

decision =
  adjusted_score >= 0.75        → pay_full
  0.40–0.75                     → pay_reduced (increments borderline_tick_count)
  borderline_tick_count > 6     → require_selfie_check (overrides above)
  adjusted_score < 0.40         → reject
```

### Route skeleton
```javascript
import express from 'express';
import { paymentMiddleware } from '@x402/express';
import { hederaExactScheme } from '@x402/hedera';

const app = express();

app.use('/verify-attention', paymentMiddleware({
  scheme: hederaExactScheme,
  network: 'hedera-testnet',
  facilitatorUrl: 'https://api.testnet.blocky402.com',
  payTo: process.env.ORACLE_HEDERA_ACCOUNT_ID,
  amount: '0.0005',
  asset: 'HBAR'
}));

app.post('/verify-attention', async (req, res) => {
  const { session_id, signals } = req.body;
  const session = await getSession(session_id);            // Supabase
  const diversityScore = await getDiversityScore(session.link_id); // Redis
  const decision = scoreSession(signals, session, diversityScore);
  await updateSessionState(session_id, decision);           // Supabase
  await logTickToHCS(session.link.hcs_topic_id, session_id, decision); // this link's own topic
  res.json({ ...decision, provider_uaid: ORACLE_UAID });     // see §11
});
```

---

## 9. Fraud & abuse resistance — layered, not absolute

| Layer | Mechanism | Beats | Doesn't beat |
|---|---|---|---|
| Client-side signals | checks 1–4 above | naive scripts, basic headless bots | sophisticated headless + human-like injection |
| Session diversity | check 5 | coordinated farms on narrow IP ranges | residential-proxy-rotated botnets |
| Progressive friction | Selfie Check escalation on sustained borderline score | any script — cannot hold a real face to the camera | nothing, once triggered — this is the hard wall |
| Frequency capping | `paid_attention_seconds_today` per identity (UAID if verified, else fingerprint) per link | unlimited self-farming/replay | unverified identity resets (fingerprint clears) — caught instead by diversity check on the link as a whole |
| Economic bounding | per-link, per-window payout caps; delayed settlement via Scheduled Transactions | unbounded loss from any bypass that gets through | doesn't prevent fraud, bounds the cost of it |

**Honest framing for the README/pitch:** the goal is not "bots are blocked,"
it's "fraud is made expensive and the worst case is bounded." Every layer
above is a probabilistic filter except Selfie Check, which is the one true
hard stop.

---

## 10. Selfie Check integration

Two roles, not one:

1. **Fraud escalation** — sessions with `borderline_tick_count > N` are
   required to pass a Selfie Check to keep earning at full rate.
2. **Premium tier (the product angle)** — a reader who verifies once unlocks
   a portable "verified" status good for 90 days, platform-wide. Verified
   attention is priced higher (`rate_verified_per_tick`) than unverified,
   because it's a stronger guarantee — sellers are knowingly paying more for
   attention that's biometrically confirmed human.

```
Client: IDKit generates QR (desktop) or deep link (mobile) on trigger
World ID App: user completes camera liveness + face-match flow
Callback: POST /webhooks/selfie-check-result
  { session_id, reader_device_id, proof, verified: boolean }

On success:
  UPDATE sessions SET is_verified = true, verified_until = now() + 90 days,
                       reader_uaid = <derived UAID>
  → submit `selfie_check_result` message to this link's topic
```

> Access-gated feature — request sandbox access early via the hackathon's
> dedicated form before building against it.

---

## 11. Agent identity — HCS-14 UAIDs

### 11.1 What this actually gives you

A portable, independently-recomputable identity for both sides of the
x402 service relationship — the Oracle (service) and the Agent (consumer) —
so that relationship is provable as more than "one account number paying
another." No registry or authority is required to validate a UAID: anyone
who knows the six canonical fields can recompute the same hash themselves.

### 11.2 Who gets one

| Identity | Priority |
|---|---|
| Attention Trust Oracle | Build — this is the whole point |
| Hedera Agent | Build |
| Verified readers | Already covered — `reader_uaid` comes free from Selfie Check (§10) |
| Creators | Tier 3 / optional — no functional gap it closes beyond what reader UAIDs already cover |

### 11.3 Generating the two that matter

Both use the `uaid:aid:` (deterministic, registry-generated) form, since
neither service holds a pre-existing W3C DID.

```
Oracle:
  registry: "hol"
  name: "nanoaffiliate-attention-oracle"
  version: "1.0.0"
  protocol: "hcs-10"
  nativeId: "hedera:testnet:0.0.<oracle_account_id>"
  skills: [21]        // API Integration / data-provider role

Agent:
  registry: "hol"
  name: "nanoaffiliate-attention-verifier-agent"
  version: "1.0.0"
  protocol: "hcs-10"
  nativeId: "hedera:testnet:0.0.<agent_account_id>"
  skills: [4, 21]      // Multi-Agent Coordination + API Integration
```

```javascript
import { createHash } from 'crypto';
import bs58 from 'bs58';

function generateUAID({ registry, name, version, protocol, nativeId, skills }) {
  const canonical = {
    name: name.toLowerCase(),
    nativeId,
    protocol: protocol.toLowerCase(),
    registry: registry.toLowerCase(),
    skills: [...skills].sort((a, b) => a - b),
    version
  }; // alphabetical keys, exactly as HCS-14 requires

  const hash = createHash('sha384').update(JSON.stringify(canonical)).digest();
  const encoded = bs58.encode(hash);

  return `uaid:aid:${encoded};registry=${registry};proto=${protocol};nativeId=${nativeId}`;
}
```

Run once at deploy time and stored — the ID only changes if one of the six
fields changes, so it's never recomputed per-request.

### 11.4 Where it lives — the HCS-11 profile

Written once to the global **identity-registry topic** (not the per-link
topics — identity isn't a per-link concept):

```json
{
  "type": "identity_profile",
  "uaid": "uaid:aid:<hash>;registry=hol;proto=hcs-10;nativeId=hedera:testnet:0.0.5432",
  "display_name": "NanoAffiliate Attention Trust Oracle",
  "endpoint": "https://nanoaffiliate-oracle.up.railway.app/verify-attention",
  "capabilities": ["attention-verification", "x402-payment-gated"],
  "skills": [21]
}
```

Same shape for the Agent. Each account's memo points at this topic
(`hcs-11:hcs://1/0.0.<identity-registry-topic-id>`).

### 11.5 Honest scoping — declarative vs. functional

As specified in §11.1–11.4, identity is **declarative, not enforced**: both
services have a real, resolvable UAID, but nothing in the payment flow
currently checks them — the Agent pays whatever's at the configured Oracle
URL without verifying its asserted identity first. That satisfies the
bounty's literal bar (identity exists, is real, is on-chain) but isn't yet
doing active work.

**Tier 2 stretch — make it functional:** have the Oracle's 402 response
include its own `provider_uaid`, and have the Agent resolve that UAID
against the identity-registry topic (via Mirror Node) before paying —
turning identity into an actual pre-payment trust check, not just a
resolvable label. Build this only once §7 and §8 are solid; it reuses code
you already have for reading the identity-registry topic.

**Build tiers, summarized:**
1. **Build:** UAID generation + HCS-11 profiles for Oracle and Agent, written once
2. **Build if time allows:** Agent verifies the Oracle's UAID before paying (§11.5 stretch)
3. **Skip:** creator UAIDs beyond what Selfie Check already provides

---

## 12. Redis — what it's for, and how it's actually used

Redis is an in-memory data store — fast reads/writes, not meant as a durable
system of record (treat it as disposable, unlike Supabase or Hedera). It's
used for exactly two short-lived jobs, nothing else:

### 12.1 Session diversity aggregate (feeds Oracle check #5)

A **sorted set** keyed by timestamp, so "everything from the last 10
minutes" is one command instead of hand-rolled expiry logic:

```javascript
// New session on a link:
await redis.zadd(`diversity:${linkId}`, Date.now(), `${ipAsn}|${fingerprintHash}`);

// Reading the last 10 minutes, for the Oracle's diversity score:
const tenMinAgo = Date.now() - 10 * 60 * 1000;
const recentEntries = await redis.zrangebyscore(`diversity:${linkId}`, tenMinAgo, '+inf');

// Trimming anything older, so the set never grows forever:
await redis.zremrangebyscore(`diversity:${linkId}`, '-inf', tenMinAgo);
```

### 12.2 The tick scheduler job queue (BullMQ)

BullMQ uses Redis to store "work that needs to happen" — enqueue fast, pop
fast, survive a process restart, and retry automatically on failure
(network blip calling the Oracle, for example).

```javascript
import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL);
const tickQueue = new Queue('tick-scoring', { connection });

// Scheduler — every 5 seconds, one job per active session:
setInterval(async () => {
  const activeSessions = await db.sessions.findActive();  // Supabase
  for (const session of activeSessions) {
    await tickQueue.add('score-session', { session_id: session.id });
  }
}, 5000);

// Worker — pulls jobs, runs the full Oracle→payout flow, can run many in parallel:
const worker = new Worker('tick-scoring', async (job) => {
  await scoreAndPaySession(job.data.session_id);
}, { connection });
```

### 12.3 Where it's deployed

| Option | Verdict |
|---|---|
| Railway Redis add-on | Best fit — same platform as the Oracle/Agent, one click to provision |
| Upstash | Good alternative, serverless, generous free tier |
| Self-hosted | Not worth it for a hackathon — unnecessary ops overhead |

Whichever is chosen, the connection URL goes into `REDIS_URL` (§17).

### 12.4 What stays out of Redis

Nothing that needs to survive a restart or be queried historically —
that's Supabase (session/catalog state) or Hedera (payments, audit trail).
If cut for time, the diversity aggregate can fall back to a plain in-process
JS `Map` (loses cross-restart/horizontal-scale durability, fine for a
single-process demo) — same honesty pattern as every other scope cut in
this README.

---

## 13. The two payments per tick, precisely

| | Oracle payment | Creator payout |
|---|---|---|
| Payer | Hedera Agent (platform) | Seller's escrow account |
| Payee | Oracle's Hedera account | Creator's Hedera account |
| Paying for | The trust-check API call itself | Verified attention reward |
| Protocol | x402 (challenge → pay → unlock) | Plain Hedera `TransferTransaction` — no gate, no resource to unlock, so x402 doesn't apply |
| Fires | Every tick, even on reject | Only on `pay_full` / `pay_reduced` |
| Amount | Fixed, small (e.g. 0.0005 ℏ) | Variable, seller-set rate |

---

## 14. Settlement currency & precision

| Asset | Decimals | Smallest unit | Notes |
|---|---|---|---|
| HBAR | 8 | 0.00000001 ℏ (1 tinybar) | Value floats with market price |
| USDC on Hedera | 6 | $0.000001 | Fixed dollar precision — use this if pitching exact cent/sub-cent pricing |

Testnet USDC: `0.0.429274` · Mainnet USDC: `0.0.456858`

Be consistent in the README/demo about which asset dollar figures refer to
— HBAR-denominated fees are not fixed-dollar unless re-quoted continuously.

---

## 15. Concurrency & scale (single process, many sessions)

```
Scheduler (BullMQ + Redis), every 5s:
  SELECT id FROM sessions WHERE status = 'active'   -- Supabase
  → enqueue one job per session

Workers pull jobs concurrently — scoring (HTTP + math) runs in parallel.
Hedera transaction SIGNING is funneled through a single submission queue,
one at a time, a few hundred ms apart, to avoid operator-key nonce/ordering
conflicts when many payouts fire in the same instant.
```

One Agent process handles many sessions — never one process per buyer.

---

## 16. Escrow — plain account, not a smart contract

Native `TransferTransaction`s do everything needed (instant, cheap, atomic
multi-recipient transfers). A smart contract would add deployment/gas
overhead for zero benefit, since all scoring logic is off-chain.

**One account per seller, one key for all of them.** Each seller gets their
own distinct Hedera account (own account ID, own on-chain balance, own
independently verifiable transaction history on Mirror Node/HashScan) — but
every one of those accounts is created with the **same key: the Agent's own
public key**, not a unique randomly generated key per seller.

```javascript
// At seller onboarding — the escrow account is distinct, the key is not:
const escrowAccountTx = await new AccountCreateTransaction()
  .setKey(agentPublicKey)          // same key across every seller's escrow account
  .setInitialBalance(new Hbar(0))
  .execute(agentClient);
→ store the resulting new account ID as sellers.escrow_hedera_account_id
```

- **Funding (the one moment the seller actually signs):** the seller sends
  HBAR/USDC into their escrow account from their own wallet, signed with
  their own key, on their own device. The platform never touches the
  seller's personal wallet or its key.
- **Every payout after that (Agent-only, no seller signature):**
  ```javascript
  const tx = await new TransferTransaction()
    .addHbarTransfer(seller.escrow_hedera_account_id, new Hbar(-amount))
    .addHbarTransfer(creator.hedera_account_id, new Hbar(amount))
    .freezeWith(agentClient)
    .sign(agentPrivateKey);   // the one key the Agent already holds in memory
  await tx.execute(agentClient);
  ```
  Same signing call for every seller, every tick — no per-seller key lookup,
  no secrets store, no decrypt-then-discard step. The Agent holds exactly
  one private key, loaded once from an environment variable at process
  start, for the life of the process.

**Hackathon scope decision, stated explicitly:** this is custodial —
the platform controls spending from every escrow account via one shared
key. Consolidating to a single key doesn't change that custody posture
(it was already platform-held under a per-seller-key design); it only
removes unnecessary key-management infrastructure a hackathon timeline
doesn't need. Accounts remain individually addressable and independently
verifiable on Mirror Node. Seller-side signing or allowance-based
non-custodial control (a seller-signed `AccountAllowanceApproveTransaction`
capping what the Agent can spend from the seller's *own* wallet, no escrow
account or key handover required) is the named v2 hardening step, not
built here.

---

## 17. Bundle splits & conversion bonus

```
Bundle: two creators co-promoting one product get distinct entry URLs into
one shared session pool (still two separate link topics, each tracking its
own creator's entry traffic). Attention-minutes tagged by entry URL at
session start. Split computed via a single atomic TransferTransaction with
multiple recipient entries — proportional to each creator's share.

Conversion bonus (Path B only): wrapped in a Scheduled Transaction with a
short delay, giving fraud checks a window to cancel before funds move.
```

---

## 18. Deployment checklist

| What | Where | Notes |
|---|---|---|
| Oracle + Agent + Scheduler | Railway | Single Node/Express app, git-push deploy |
| Redis | Railway add-on or Upstash | Diversity aggregate + BullMQ (§12) |
| Supabase | Supabase (managed Postgres) | Catalog, sessions, ticks, conversions, link↔topic mapping |
| Dashboard | Vercel (Next.js) | Reads Mirror Node directly for live feed |
| Hedera accounts | Hedera Portal (testnet) | Operator accounts for Oracle, Agent; per-seller escrow accounts keyed to the Agent's public key (§16) |
| Facilitator | Blocky402 (testnet: `api.testnet.blocky402.com`) | x402 verify/settle |
| HCS Topics | One created per link at link-creation time; one global identity-registry topic created once | `TopicCreateTransaction` |
| Explorer | HashScan (`hashscan.io/testnet/topic/{topicId}`) | No integration needed — public, free |
| Selfie Check | World ID sandbox | Request access early via hackathon form |

### Environment variables
```
ORACLE_HEDERA_ACCOUNT_ID=
ORACLE_HEDERA_PRIVATE_KEY=
ORACLE_UAID=                          # generated once, see §11.3
AGENT_HEDERA_ACCOUNT_ID=
AGENT_HEDERA_PRIVATE_KEY=
AGENT_UAID=                           # generated once, see §11.3
FACILITATOR_URL=https://api.testnet.blocky402.com
HCS_TOPIC_IDENTITY_REGISTRY=
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
REDIS_URL=
WORLD_ID_APP_ID=
WORLD_ID_ACTION_ID=
```
(No `HCS_TOPIC_PAYMENT_EVENTS` — per-link topics are created dynamically and
stored in `links.hcs_topic_id`, not a single fixed env var.)

---

## 19. Build order (do it in this sequence)

1. Scoring function alone (checks 1–6), pure function, unit-tested against
   fabricated payloads — zero Hedera/x402 involvement yet
2. Wrap in Express route, deploy to Railway, no x402 middleware — confirm
   reachable over the internet
3. Add x402 middleware, test against Blocky402 testnet facilitator with a
   manually crafted payment (curl/Postman) — confirm real 402 → real 200
4. Wire Supabase schema + link redirect service
5. Wire per-link HCS topic creation (`link_created` manifest) + click logging
   — confirm a fresh link's topic is visible and readable on HashScan before
   building anything downstream of it
6. Stand up Redis (Railway/Upstash), wire the BullMQ scheduler + diversity
   sorted set
7. Wire the Hedera Agent consumer loop (tick scheduler → Oracle call →
   creator payout → `tick`/`tick_rejected` messages to the link's topic) —
   this is the critical-path loop, get it boringly reliable before adding
   anything else
8. Generate HCS-14 UAIDs for Oracle + Agent, write HCS-11 profiles to the
   global identity-registry topic
9. Add escrow balance checks + `pending_payouts` retry queue (§16 shared-key design)
10. Add Selfie Check escalation + verified-tier pricing + its two message types
11. Add frequency capping / dedup logic
12. Build the dashboard reading Mirror Node directly
13. (Stretch) Agent verifies the Oracle's `provider_uaid` before paying (§11.5)
14. (Stretch) `session_end`, `conversion` messages
15. (Stretch) Scheduled Transactions for conversion bonus delay
16. (Stretch) Bundle split multi-recipient transfers
17. (Roadmap, don't build) `fraud_flag`, `payout_queued/released/dropped`, `rate_snapshot`

---

## 20. Explicitly out of scope for this build

- Amazon PA-API / Creators API integration — access-gated, sales-history
  requirement makes it impractical in a hackathon window; product data is
  entered manually instead
- Real-time Amazon conversion webhooks — do not exist for third-party
  affiliates; self-reported confirmation only (labeled as such)
- Seller-signed per-transaction payout authorization / allowance-based
  non-custodial escrow
- Functional (not just declarative) HCS-14 identity verification before
  payment — designed in §11.5, build only if time allows
- ML-based trust scoring beyond entropy/heuristic checks
- Horizontal multi-instance Agent scaling beyond a single submission queue
- Mobile buyer experience polish
- `fraud_flag`, `payout_queued/released/dropped`, `rate_snapshot` HCS message
  types — designed, not built; dispute-resolution features a clean demo
  won't organically exercise
- Creator-level HCS-14 UAIDs beyond what Selfie Check already provides
  readers

---

## 21. One-paragraph pitch, for the top of the actual submission README

NanoAffiliate pays creators per second of verified human attention, not per
click and not per month. Every affiliate link is its own dedicated Hedera
Consensus Service topic — the same identifier a creator shares as a link is
the identifier anyone can paste into a public Hedera explorer to see that
link's complete, tamper-proof history of clicks, attention ticks, and trust
decisions. A pay-per-call Attention Trust Oracle — a real x402-gated service
on Hedera, carrying its own HCS-14 identity — scores every 5-second interval
of a reader's session; a Hedera Agent, itself identified the same way, pays
for that verdict and, when it passes, pays the creator instantly from the
seller's on-chain escrow. Persistent doubt gets escalated to a Selfie
Check — the one signal a bot farm cannot fake — which also unlocks a
premium, biometrically-verified attention tier sellers can choose to pay
more for.
