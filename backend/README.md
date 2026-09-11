# NanoAffiliate — Backend

Single Node/Express app hosting the Attention Trust Oracle, the Hedera Agent
consumer loop, the Link Redirect Service, and the Tick Scheduler — see
[`architecture/README.md`](../architecture/README.md) §3 for the full
component map and §19 for build order.

## Structure

```
src/
  index.ts           entrypoint
  app.ts             express app assembly
  config/env.ts       env var loading
  routes/
    health.ts          GET /health
    redirect.ts         GET /t/:topicId            (§6.3)
    oracle.ts           POST /verify-attention      (§8)
    signals.ts          POST /report-signals        (§6.4)
    webhooks.ts          purchase/selfie-check callbacks (§6.6, §10)
  scoring/
    scoreSession.ts     pure attention-scoring function (§8)
  hedera/
    client.ts           Hedera client setup           (§16)
  queue/
    tickQueue.ts         BullMQ scheduler + worker      (§12.2)
  lib/
    supabase.ts          Supabase client
    redis.ts             Redis client
  types/                 shared domain types (§4)
```

## Setup

```bash
npm install
cp .env.example .env   # fill in Hedera/Supabase/Redis credentials
npm run dev
```

## Scripts

- `npm run dev` — run with hot reload
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run the compiled build
- `npm run typecheck` — type-check without emitting
