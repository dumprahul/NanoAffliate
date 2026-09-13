# NanoAffiliate Backend — Testing & Readiness Status

_Temporary status doc — a snapshot of what's been built, tested, and verified as of this session. Not part of the permanent repo docs (see `README.md` for that)._

Scope: full backend per `architecture/README.md`, **excluding World ID / Selfie Check** (explicitly not built, per instruction). Everything below ran against real Hedera testnet, the live Blocky402 x402 facilitator, and a real Supabase project — not mocks, unless stated otherwise.

---

## 1. What's fully built and working

| Component | Status |
|---|---|
| Seller onboarding + escrow account creation | ✅ Live-tested |
| Product submission (manual entry) | ✅ Live-tested |
| Creator registration | ✅ Live-tested |
| Link creation (mints a dedicated HCS topic + `link_created` manifest) | ✅ Live-tested |
| Link redirect service (`GET /t/:topicId`) + session creation + `click` logging | ✅ Live-tested |
| Attention page (served inline, runs the real 5s tick loop in-browser) | ✅ Built, loads correctly |
| Attention Trust Oracle (`/verify-attention`), x402-gated | ✅ Live-tested against real Blocky402 testnet facilitator |
| Hedera Agent tick loop (pays Oracle → gets decision → pays creator) | ✅ Live-tested, real Hedera transactions |
| Per-link HCS message logging (`click`, `tick`, `tick_rejected`, `session_end`, `selfie_check_triggered`, `conversion`) | ✅ Live-tested, verified on Mirror Node/HashScan |
| HCS-14 UAID generation + HCS-11 identity-registry publishing | ✅ Bootstrapped, UAIDs live in `.env` |
| Escrow payouts (instant, shared-key design per §16) | ✅ Live-tested, balances verified on-chain |
| Escrow-insufficient fallback → `pending_payouts` queue | ✅ Live-tested |
| Pending-payout retry sweep | ✅ Live-tested (bug found + fixed, see §3) |
| Session diversity aggregate (Redis) | ✅ Integration-tested against real local Redis |
| Frequency capping (`paid_attention_seconds_today`, 4h/day/identity/link) | ✅ Live-tested at the exact boundary |
| Session lifecycle: explicit end, heartbeat timeout (30s), hard cap (2h) | ✅ All three live-tested |
| Conversion Path A (self-reported, instant bonus) | ✅ Live-tested |
| Conversion Path B (webhook, HMAC-verified, Scheduled Transaction bonus with fraud-check delay) | ✅ Live-tested (bug found + fixed, see §3) |
| Scheduled Transaction cancellation (fraud-flag path) | ✅ Live-tested |
| Dynamic Rate Setter (hourly cron) | ⚠️ Wired up, intentionally a no-op — architecture doc doesn't specify a pricing algorithm |

---

## 2. Automated test suite

`npm test` — **18/18 passing**

| File | Covers |
|---|---|
| `tests/scoring/scoreSession.test.ts` (6) | Pure attention-scoring function: full pay, reject on backgrounded tab, reject on stale/idle session, selfie-check escalation threshold, trust-penalty multiplier effect, score always clamped to [0,1] |
| `tests/identity/uaid.test.ts` (5) | UAID determinism, skill-order independence, hash stability across casing, sensitivity to any canonical field change, correct `uaid:aid:` output format |
| `tests/lib/mutex.test.ts` (2) | Hedera-submission serialization queue: tasks run strictly one at a time in order; a failed task doesn't block later ones |
| `tests/lib/diversity.test.ts` (2) | Redis diversity aggregate against a **real local Redis**: lone session gets benefit of the doubt, distinct IP/fingerprint pairs score higher than repeated ones |
| `tests/routes/health.test.ts` (1) | Health endpoint |
| `tests/routes/creators.test.ts` (2) | Zod validation on `POST /creators` (mocked DB layer) |

Not in the automated suite (needs live network + funded testnet accounts, so it was verified manually instead — see §3): the x402 payment round-trip, Hedera transaction flows, Scheduled Transactions.

---

## 3. Live end-to-end tests performed (real money, real Hedera testnet)

Every one of these produced a real transaction ID and was cross-checked against Mirror Node/HashScan balances — not just HTTP response codes.

1. **x402 payment gating** — `POST /verify-attention` with no payment → real `402` from the middleware with a valid `PAYMENT-REQUIRED` header from Blocky402. With a signed payment → passes through, settles on success.
2. **`pay_full` tick** — full rate paid, tick + payout tx IDs recorded, `tick` HCS message logged, creator balance increased by exactly the paid amount.
3. **`reject` tick** — weak signals (backgrounded tab, stale interaction, no fingerprint) → score 0.2, no payment, `tick_rejected` HCS message with reason.
4. **`pay_reduced` tick** — moderate signals → score in the 0.4–0.75 band, paid at half rate (0.0005 vs 0.001 HBAR), confirmed across 7 consecutive ticks.
5. **`require_selfie_check` escalation** — after 7 `pay_reduced` ticks (`borderline_tick_count > 6`), the 8th tick correctly escalated regardless of score; `selfie_check_triggered` HCS message logged with the trigger count.
6. **Escrow-insufficient fallback** — created a seller with an unfunded escrow, sent a `pay_full`-scoring tick → no payout, `pending_payouts` row queued with reason `escrow_insufficient`, `amount_paid: 0`.
7. **Pending-payout retry** — funded the escrow after the fact, waited one scheduler cycle → payout fired automatically, `resolved_at` set, creator balance updated. *(Caught and fixed a real bug here — see §4.)*
8. **Daily frequency cap** — set `paid_attention_seconds_today` to exactly the 4h cap, then sent a `pay_full`-scoring tick → correctly rejected with reason `daily_cap_reached` despite the Oracle's positive score. *(Caught and fixed a related bug — see §4.)*
9. **Self-reported conversion (Path A)** — `POST /conversions/self-report` → instant bonus payout, `conversion` HCS message, correct balance change.
10. **Webhook conversion (Path B)** — real HMAC-SHA256 signature verification against the seller's `webhook_secret`, using the actual raw request bytes (not a re-serialized copy). Created a real Hedera Scheduled Transaction.
11. **Scheduled Transaction delay** — confirmed the bonus does **not** execute immediately, waits for the configured delay, then executes automatically via the Hedera network with no further action from the backend. *(This was the most serious bug found — see §4.)*
12. **Scheduled Transaction cancellation** — cancelled a pending scheduled bonus before its delay elapsed → confirmed `deleted: true` on Mirror Node and the balance never moved.
13. **Explicit session end** (`POST /session-end`) — session marked `ended`, `session_end` HCS message logged with totals.
14. **Heartbeat timeout** — two sessions were left idle mid-testing and were auto-ended by the 10s sweep after 30s of no ticks, with `end_reason: heartbeat_timeout` — caught organically, not even manually triggered.
15. **Hard cap (2h)** — backdated a session's `started_at` by 3 hours, confirmed the sweep force-ended it with `end_reason: hard_cap_2h` within one cycle.

---

## 4. Bugs found during this testing pass (all fixed)

| # | Bug | Impact | Fix |
|---|---|---|---|
| 1 | x402 middleware mounted with `.use('/verify-attention', middleware)` inside a router already mounted at that path — Express strips the prefix from `req.path` inside the middleware, so it never matched its own route config and **let unpaid requests straight through**. | Critical — the whole payment gate was a no-op. | Mount with `.use(middleware)` (no path arg) instead. |
| 2 | Webhook HMAC check re-serialized `JSON.stringify(req.body)` instead of using the raw bytes the sender actually signed. | Would reject legitimate signed webhooks on any key-order/whitespace difference. | Capture `req.rawBody` via `express.json({ verify })` and HMAC over that instead. |
| 3 | `scoreSession`'s `adjustedScore` wasn't clamped after applying `trustPenaltyMultiplier`, so a multiplier > 1 could inflate a score above 1. | Low (multiplier is meant to only ever reduce trust, default 1.0) but a real correctness gap. | Clamp `adjustedScore` to [0,1]. |
| 4 | `retryPendingPayouts()` was fully implemented but **never called** from `startSchedulers()`. | Escrow-insufficient payouts would queue forever and never retry. | Wired into the existing 10s heartbeat interval. |
| 5 | `ticks.decision` recorded the Oracle's raw verdict (e.g. `pay_full`) even when the daily cap overrode it to an effective reject, leaving `decision: pay_full` next to `amount_paid: 0` in the same row. | Confusing/self-contradictory audit trail in Supabase (the HCS log was already correct). | Track an `effectiveDecision` separate from the Oracle's raw outcome; record `reject` when the cap is the actual reason nothing was paid. |
| 6 | **Scheduled bonus transfers executed immediately instead of waiting for the fraud-check delay.** Every escrow account is keyed to the Agent's own key (by design, §16), and the Agent also pays for the `ScheduleCreateTransaction` — so Hedera auto-applied that same signature to the inner transfer, fully signing it at creation time. | High — the entire "5-minute window to flag and cancel fraud" from §6.6/§17 did nothing. | Set `waitForExpiry(true)` on the schedule, so Hedera holds execution until the expiration time regardless of when signatures complete. Replaced the old "sign at T+delay" worker logic with a Mirror-Node poll that just confirms the network executed (or the schedule was cancelled) and updates our records. |
| 7 | Self-reported conversion (Path A) response returned the pre-payout `conversion` object even after the bonus was actually paid, so the same JSON response showed `bonus_payout_tx_id` set alongside a stale `status: "pending"`. | Cosmetic API inconsistency, not a data-correctness bug (DB was correct). | Response now reflects the post-payout state when a payout happened. |

---

## 5. Explicitly not built / not tested (by design)

- **World ID / Selfie Check** — excluded per instruction. `require_selfie_check` sessions are logged and simply stay unpaid.
- **`fraud_flag`, `payout_queued/released/dropped`, `rate_snapshot` HCS message types** — out of scope per architecture §7/§20 (roadmap items). The underlying mechanics (pending-payout retries, rate-setter cron) are built; they just don't emit these specific message types.
- **Dashboard (Next.js)** — out of scope for "backend"; every link's HCS topic is independently viewable on HashScan without one.
- **Bundle splits (§17 multi-recipient transfers)** — schema exists (`bundles` table, `links.bundle_id`), logic not built.
- **RLS on Supabase tables** — left disabled; this backend is the only writer.
- **Verified-tier pricing** — blocked on Selfie Check, so `is_verified = true` sessions were never exercised live.

---

## 6. How to reproduce these tests yourself

```bash
npm run build && npm start   # boots app + workers + schedulers in one process
npm test                     # automated suite

# then drive the live flow manually, e.g.:
curl -X POST localhost:3000/sellers -H 'Content-Type: application/json' -d '{"hedera_account_id":"0.0.XXXX"}'
# ...fund the returned escrow, create a product/creator/link, open the shareable_url
```

Full walkthrough is in `README.md`.
