const logger = require('../lib/logger');
const { marketExpiryQueue } = require('./marketExpiryJob');
const { leaderboardQueue } = require('./leaderboardJob');
const { analyticsQueue } = require('./analyticsJob');
const { fraudQueue } = require('./fraudScanJob');
const { notifyLockingSoonQueue } = require('./notifyLockingSoonJob');

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

// Registers the repeatable schedules. Without this, the Queue/Worker pairs in each job file
// exist but nothing ever calls .add() — they'd sit idle forever. Each registration is bounded
// by a timeout so a Redis outage at boot can't hang startup — it just logs and moves on; BullMQ
// picks the schedules up on its own once Redis becomes reachable and this runs again.
async function startScheduler() {
  const registrations = [
    () => marketExpiryQueue.add('checkExpiry', {}, { repeat: { every: 60 * 1000 }, jobId: 'checkExpiry-repeat' }),
    () => leaderboardQueue.add('refresh', {}, { repeat: { every: 15 * 60 * 1000 }, jobId: 'refresh-repeat' }),
    () => analyticsQueue.add('compute', {}, { repeat: { every: 5 * 60 * 1000 }, jobId: 'compute-repeat' }),
    () => fraudQueue.add('scan', {}, { repeat: { every: 10 * 60 * 1000 }, jobId: 'scan-repeat' }),
    () => notifyLockingSoonQueue.add('check', {}, { repeat: { every: 5 * 60 * 1000 }, jobId: 'locking-soon-repeat' }),
  ];

  let registered = 0;
  for (const register of registrations) {
    try {
      await withTimeout(register(), 5000, 'Queue.add');
      registered++;
    } catch (err) {
      logger.warn('Scheduler: failed to register a repeatable job (Redis unavailable?): ' + err.message);
    }
  }
  logger.info(`Scheduler: ${registered}/${registrations.length} repeatable jobs registered`);
}

module.exports = { startScheduler };
