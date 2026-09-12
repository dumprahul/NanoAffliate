/**
 * Serializes async work through a single queue — architecture/README.md §15:
 * "Hedera transaction SIGNING is funneled through a single submission queue,
 * one at a time... to avoid operator-key nonce/ordering conflicts when many
 * payouts fire in the same instant."
 */
export class AsyncMutex {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(task: () => Promise<T>): Promise<T> {
    const result = this.tail.then(task, task);
    this.tail = result.catch(() => undefined);
    return result;
  }
}

/** One shared instance — every Agent-signed Hedera transaction goes through this. */
export const hederaSubmissionQueue = new AsyncMutex();
