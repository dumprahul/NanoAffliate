import cron from 'node-cron';
import { findActiveSessions, getSessionContext } from '../db/sessions.js';
import { endSession } from '../routes/sessionLifecycle.js';
import { getUnresolvedPendingPayouts, resolvePendingPayout, incrementRetryCount } from '../db/pendingPayouts.js';
import { getHbarBalanceTinybar } from '../hedera/mirrorNode.js';
import { payCreatorFromEscrow } from '../hedera/payments.js';

const MAX_PAYOUT_RETRIES = 10;

const HEARTBEAT_TIMEOUT_MS = 30_000;
const HARD_CAP_MS = 2 * 60 * 60 * 1000;

/**
 * Session-end sweep — architecture §6.5 options 2 and 3: a heartbeat timeout
 * (no signal for 30s) or a hard cap (open > 2h) force-ends a session even if
 * the client never sends an explicit end ping.
 */
export async function sweepStaleSessions(): Promise<void> {
  const activeSessions = await findActiveSessions();
  const now = Date.now();

  for (const session of activeSessions) {
    const startedAt = new Date(session.started_at).getTime();
    const lastTickAt = session.last_tick_at ? new Date(session.last_tick_at).getTime() : startedAt;

    if (now - startedAt > HARD_CAP_MS) {
      await endSession(session.id, 'hard_cap_2h');
    } else if (now - lastTickAt > HEARTBEAT_TIMEOUT_MS) {
      await endSession(session.id, 'heartbeat_timeout');
    }
  }
}

/**
 * Retries queued payouts once escrow balance allows — architecture §16/§19
 * build order step 9 ("Add escrow balance checks + pending_payouts retry
 * queue"). Runs alongside the heartbeat sweep.
 *
 * Deliberately does not emit `payout_queued`/`payout_released` HCS messages:
 * §7 and §20 both list that message family as roadmap/out-of-scope for this
 * build (dispute-resolution messaging a clean demo won't exercise). Only the
 * `pending_payouts` bookkeeping and the retry itself are in scope here.
 */
export async function retryPendingPayouts(): Promise<void> {
  const pending = await getUnresolvedPendingPayouts();

  for (const payout of pending) {
    if (payout.retry_count >= MAX_PAYOUT_RETRIES) continue;

    const context = await getSessionContext(payout.session_id);
    if (!context?.seller.escrow_hedera_account_id) {
      await incrementRetryCount(payout.id, payout.retry_count + 1);
      continue;
    }

    const escrowTinybar = await getHbarBalanceTinybar(context.seller.escrow_hedera_account_id);
    const requiredTinybar = BigInt(Math.round(payout.amount * 1e8));

    if (escrowTinybar < requiredTinybar) {
      await incrementRetryCount(payout.id, payout.retry_count + 1);
      continue;
    }

    await payCreatorFromEscrow(
      context.seller.escrow_hedera_account_id,
      context.creator.hedera_account_id,
      payout.amount,
    );
    await resolvePendingPayout(payout.id);
  }
}

/**
 * Dynamic Rate Setter — architecture §3 component map, hourly cron adjusting
 * seller rates. The doc doesn't specify a pricing algorithm (rate_snapshot
 * messages are explicitly "roadmap, don't build" per §7/§20), so this is a
 * scheduling hook only — wire real demand-based logic here when it exists.
 */
export async function runDynamicRateSetterTick(): Promise<void> {
  // Intentionally a no-op placeholder — see comment above.
}

let heartbeatTask: ReturnType<typeof setInterval> | undefined;
let rateSetterTask: cron.ScheduledTask | undefined;

export function startSchedulers(): void {
  if (!heartbeatTask) {
    heartbeatTask = setInterval(() => {
      sweepStaleSessions().catch((err) => console.error('sweepStaleSessions failed:', err));
      retryPendingPayouts().catch((err) => console.error('retryPendingPayouts failed:', err));
    }, 10_000);
  }
  if (!rateSetterTask) {
    rateSetterTask = cron.schedule('0 * * * *', () => {
      runDynamicRateSetterTick().catch((err) => console.error('runDynamicRateSetterTick failed:', err));
    });
  }
}

export function stopSchedulers(): void {
  if (heartbeatTask) {
    clearInterval(heartbeatTask);
    heartbeatTask = undefined;
  }
  rateSetterTask?.stop();
  rateSetterTask = undefined;
}
