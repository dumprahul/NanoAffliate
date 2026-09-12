import { Queue, Worker, type Job } from 'bullmq';
import { env } from '../config/env.js';
import { getScheduleStatus, cancelScheduledTransaction } from '../hedera/payments.js';
import { getConversionById, markConversionPaid, markConversionCancelled } from '../db/conversions.js';
import { submitHcsMessage } from '../hedera/hcs.js';
import { getLinkById } from '../db/links.js';
import { getSessionById } from '../db/sessions.js';

const connection = { url: env.redisUrl };

export interface BonusJobData {
  conversionId: string;
  scheduleId: string;
}

export const bonusQueue = new Queue<BonusJobData>('bonus-release', { connection });

let worker: Worker<BonusJobData> | undefined;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Confirms a scheduled conversion bonus once the fraud-check delay window
 * has passed — architecture §6.6 Path B / §17. With `waitForExpiry(true)`
 * (see hedera/payments.ts), the Hedera network itself executes the transfer
 * at `expirationTime` — there's nothing for us to sign. This job just
 * verifies the outcome via Mirror Node and updates our own record of it.
 * A few seconds of polling covers the clock-skew gap between BullMQ's delay
 * firing and the network actually reaching consensus on the expiry.
 */
export function startBonusWorker(): Worker<BonusJobData> {
  if (worker) return worker;
  worker = new Worker<BonusJobData>(
    'bonus-release',
    async (job: Job<BonusJobData>) => {
      const conversion = await getConversionById(job.data.conversionId);
      if (!conversion || conversion.status !== 'pending') return;

      let status = await getScheduleStatus(job.data.scheduleId);
      for (let attempt = 0; !status.executed && !status.deleted && attempt < 5; attempt++) {
        await delay(3000);
        status = await getScheduleStatus(job.data.scheduleId);
      }

      const session = await getSessionById(conversion.session_id);
      const link = session ? await getLinkById(session.link_id) : null;

      if (status.executed && status.transactionId) {
        await markConversionPaid(conversion.id, status.transactionId);
        if (link) {
          await submitHcsMessage(link.hcs_topic_id, {
            type: 'conversion',
            session_id: conversion.session_id,
            confirmation_type: 'webhook_verified',
            bonus_payout_tx_id: status.transactionId,
          });
        }
      } else if (status.deleted) {
        await markConversionCancelled(conversion.id);
      } else {
        throw new Error(`schedule ${job.data.scheduleId} neither executed nor deleted after polling`);
      }
    },
    { connection, concurrency: 5 },
  );
  worker.on('failed', (job, err) => {
    console.error(`bonus-release job ${job?.id} failed:`, err.message);
  });
  return worker;
}

export async function scheduleBonusRelease(data: BonusJobData, delayMs: number): Promise<void> {
  // A little slack after the schedule's own expirationTime so the network has
  // time to actually process it before we poll Mirror Node for the result.
  await bonusQueue.add('release-bonus', data, { delay: delayMs + 5000, removeOnComplete: 100, removeOnFail: 100 });
}

export async function cancelPendingBonus(scheduleId: string): Promise<void> {
  await cancelScheduledTransaction(scheduleId);
}
