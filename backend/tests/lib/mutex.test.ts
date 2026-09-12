import { describe, expect, it } from 'vitest';
import { AsyncMutex } from '../../src/lib/mutex.js';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('AsyncMutex', () => {
  it('runs tasks one at a time in submission order', async () => {
    const mutex = new AsyncMutex();
    const order: number[] = [];

    const tasks = [1, 2, 3].map((n) =>
      mutex.run(async () => {
        order.push(n * -1); // marks start
        await delay(n === 1 ? 20 : 1); // first task is slowest
        order.push(n); // marks end
        return n;
      }),
    );

    const results = await Promise.all(tasks);
    expect(results).toEqual([1, 2, 3]);
    // if tasks ran concurrently, task 2/3 would finish before task 1 (which sleeps longest)
    expect(order).toEqual([-1, 1, -2, 2, -3, 3]);
  });

  it('continues processing later tasks after an earlier one rejects', async () => {
    const mutex = new AsyncMutex();

    const failing = mutex.run(async () => {
      throw new Error('boom');
    });
    const succeeding = mutex.run(async () => 'ok');

    await expect(failing).rejects.toThrow('boom');
    await expect(succeeding).resolves.toBe('ok');
  });
});
