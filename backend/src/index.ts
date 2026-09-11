import { createApp } from './app.js';
import { env } from './config/env.js';
import { startTickWorker, closeTickQueue } from './queue/tickQueue.js';
import { startBonusWorker } from './queue/bonusQueue.js';
import { startSchedulers, stopSchedulers } from './queue/scheduler.js';

const app = createApp();

startTickWorker();
startBonusWorker();
startSchedulers();

const server = app.listen(env.port, () => {
  console.log(`nanoaffiliate-backend listening on port ${env.port} (${env.nodeEnv})`);
});

async function shutdown() {
  console.log('Shutting down...');
  stopSchedulers();
  await closeTickQueue();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
