# NanoAffiliate — Backend

Single Node/Express app hosting the Attention Trust Oracle, the Hedera Agent
consumer loop, the Link Redirect Service, and the Tick Scheduler — see
[`architecture/README.md`](../architecture/README.md) for the full design.

World ID / Selfie Check verification is **not** implemented (by request) —
sessions that trip the `require_selfie_check` threshold are logged and simply
stay unpaid until that's built.

## One-time setup

### 1. Install dependencies
```bash
npm install
```

### 2. Apply the database schema
There's no DB connection string in this environment, so this one step is
manual: open your Supabase project → **SQL Editor** → paste the contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) → run it.
Everything else in this backend assumes those tables exist.

### 3. Redis
```bash
brew install redis && brew services start redis
```

### 4. Environment
```bash
cp .env.example .env   # fill in Hedera/Supabase credentials
```

### 5. Bootstrap Hedera identity (architecture §11)
Generates the Oracle's and Agent's HCS-14 UAIDs, creates the global
identity-registry HCS topic, and publishes both HCS-11 profiles to it:
```bash
npm run bootstrap:identity
```
Copy the printed `HCS_TOPIC_IDENTITY_REGISTRY`, `ORACLE_UAID`, `AGENT_UAID`
into `.env`. Run this once per environment (the UAIDs are deterministic —
rerunning is safe, it just republishes the same profile).

## Running

```bash
npm run dev     # hot reload
npm run build && npm start   # production
```

`npm run dev`/`start` boots the Express app, the BullMQ tick worker, the
bonus-release worker, and the heartbeat/rate-setter schedulers all in one
process (matches the single-process deployment in architecture §15/§18).

## Testing

```bash
npm test
```

Unit tests cover the pure scoring function, UAID generation, and the async
submission-queue mutex. Integration tests hit a real local Redis (diversity
aggregate) and mock Supabase for route-validation tests. The x402 payment
flow (Oracle ⇄ Blocky402 ⇄ Agent) was verified manually against the live
Blocky402 testnet facilitator — see "Manual end-to-end flow" below; it isn't
in the automated suite since it needs live network + funded testnet accounts.

## Demo flow, end to end

```bash
# 1. Onboard a seller (creates + funds an escrow account keyed to the Agent)
curl -X POST localhost:3000/sellers -H 'Content-Type: application/json' \
  -d '{"hedera_account_id":"0.0.XXXX"}'
# -> fund the returned `fund_this_account` from the seller's own wallet

# 2. Add a product
curl -X POST localhost:3000/sellers/<seller_id>/products -H 'Content-Type: application/json' \
  -d '{"source_url":"https://example.com/product","title":"Widget","affiliate_tag":"tag123"}'

# 3. Register a creator
curl -X POST localhost:3000/creators -H 'Content-Type: application/json' \
  -d '{"hedera_account_id":"0.0.YYYY"}'

# 4. Create a link (creates a dedicated HCS topic)
curl -X POST localhost:3000/links -H 'Content-Type: application/json' \
  -d '{"creator_id":"<id>","product_id":"<id>","rate_unverified_per_tick":0.001,"rate_verified_per_tick":0.002,"rate_purchase_bonus":0.05}'

# 5. Open the returned shareable_url in a browser — the attention page runs
#    the 5s tick loop automatically and shows the live pay/reject decision.
```

Every link's full history (clicks, ticks, rejects, conversions) is publicly
viewable at `https://hashscan.io/testnet/topic/{hcs_topic_id}`.

## Structure

```
src/
  index.ts            entrypoint — boots the app, queue workers, schedulers
  app.ts               express app assembly + error handling
  config/env.ts         env var loading
  routes/
    health.ts            GET /health
    redirect.ts           GET /t/:topicId — link click, session start   (§6.3)
    oracle.ts             POST /verify-attention, x402-gated             (§8)
    signals.ts            POST /report-signals — the 5s tick loop        (§6.4)
    sessionLifecycle.ts   POST /session-end + heartbeat/hard-cap logic   (§6.5)
    conversions.ts        POST /conversions/self-report (Path A)         (§6.6)
    webhooks.ts           POST /webhooks/purchase-confirmed (Path B)     (§6.6)
    sellers.ts, creators.ts, links.ts   onboarding + link creation       (§6.1, §6.2)
  services/
    scoring.ts            Oracle's scoring pipeline (updates session trust state)
    tickService.ts         Agent's per-tick worker logic (pay Oracle, pay creator, log HCS)
  x402/
    oracleServer.ts        x402 resource-server middleware for the Oracle
    agentClient.ts          x402 client — Agent pays the Oracle
  hedera/
    client.ts               Hedera Client construction (Oracle + Agent operators)
    hcs.ts                   topic creation + message submission           (§5, §7)
    payments.ts              escrow accounts, payouts, scheduled bonus     (§16, §17)
    mirrorNode.ts            live balance reads via Mirror Node            (§6.4)
  identity/
    uaid.ts                  HCS-14 UAID generation                        (§11.3)
    profiles.ts               HCS-11 profile documents                     (§11.4)
  queue/
    tickQueue.ts             BullMQ tick-scoring queue + worker            (§12.2)
    bonusQueue.ts             delayed conversion-bonus release             (§6.6, §17)
    scheduler.ts              heartbeat sweep, pending-payout retries, rate-setter hook
  db/                       one file per Supabase table, thin CRUD wrappers  (§4)
  lib/
    supabase.ts, redis.ts    clients
    diversity.ts              session-diversity aggregate                  (§12.1)
    mutex.ts                  serializes Agent-signed Hedera transactions  (§15)
  scoring/scoreSession.ts   pure attention-scoring function                (§8)
  web/attentionPage.ts       the inline "attention page" served after a click
  types/index.ts            domain types mirroring the Supabase schema     (§4)
scripts/
  bootstrap-identity.ts     one-time UAID + identity-registry setup        (§11, §19 step 8)
supabase/migrations/
  0001_init.sql              full schema                                  (§4)
```

## Scope notes (things deliberately not built)

- **World ID / Selfie Check** — excluded by request. `require_selfie_check`
  sessions are logged (`selfie_check_triggered`) and left unpaid.
- **`fraud_flag`, `payout_queued/released/dropped`, `rate_snapshot` HCS
  message types** — architecture §7/§20 explicitly scope these out as
  roadmap items. The underlying mechanics they'd report on (pending-payout
  retries, the Dynamic Rate Setter cron) are still built; they just don't
  emit those specific message types yet.
- **Dynamic Rate Setter** — scheduled hourly per the component map, but the
  architecture doc doesn't specify a pricing algorithm, so it's a wired-up
  no-op hook (`queue/scheduler.ts`) ready for real logic.
- **Dashboard** — out of scope for "backend"; every link's HCS topic is
  already independently viewable on HashScan without one.
- **RLS on Supabase tables** — left disabled; this backend is the only
  writer and there's no end-user auth model in the architecture doc to hang
  policies off of. Revisit before exposing any table to a browser client
  directly.
