import { Queue, QueueEvents, Worker, type Job } from 'bullmq';
import { env } from '../config/env.js';
import { processTick } from '../services/tickService.js';
import type { SignalInput } from '../scoring/scoreSession.js';

const connection = { url: env.redisUrl };

export interface TickJobData {
  sessionId: string;
  signals: SignalInput;
}

export const tickQueue = new Queue<TickJobData>('tick-scoring', { connection });
export const tickQueueEvents = new QueueEvents('tick-scoring', { connection });

let worker: Worker<TickJobData> | undefined;

/** BullMQ worker — architecture §12.2. Pulls tick jobs, runs the full Oracle -> payout flow. */
export function startTickWorker(): Worker<TickJobData> {
  if (worker) return worker;
  worker = new Worker<TickJobData>(
    'tick-scoring',
    async (job: Job<TickJobData>) => {
      return processTick(job.data.sessionId, job.data.signals);
    },
    { connection, concurrency: 10 },
  );
  worker.on('failed', (job, err) => {
    console.error(`tick job ${job?.id} failed:`, err.message);
  });
  return worker;
}

/** Enqueues one job and awaits its result — architecture §6.4: client posts signals, backend enqueues a scoring job. */
export async function enqueueAndAwaitTick(sessionId: string, signals: SignalInput) {
  const job = await tickQueue.add(
    'score-session',
    { sessionId, signals },
    { removeOnComplete: 100, removeOnFail: 100 },
  );
  return job.waitUntilFinished(tickQueueEvents, 30_000);
}

export async function closeTickQueue(): Promise<void> {
  await worker?.close();
  await tickQueueEvents.close();
  await tickQueue.close();
}
