/**
 * Simple scheduler runner for active jobs using cron expression.
 * Runs continuously when backend starts.
 */

const prisma = require('../utils/prisma');
const cron = require('node-cron');



async function executeJob(job, execId) {
  // Set status -> running
  await prisma.schedulerExecutionHistory.update({
    where: { id: execId },
    data: { status: 'running' },
  });

  let recordsProcessed = 0;
  let recordsDeleted = 0;

  // For extra visibility in logs
  let totalSessionsFetched = 0;
  let totalExpiredSessionsToDelete = 0;
  let totalChatRowsDeleted = 0;
  let totalChatBotDeleted = 0;

  const startedAt = new Date();

  try {
    const now = new Date();

    // 0. Debug counts (helps confirm scheduler eligibility)
    const totalWelcomeChats = await prisma.chat.count({ where: { is_welcome: true } });
    const totalExpiredChatBots = await prisma.chatBot.count({
      where: { expires_at: { lt: now } },
    });

    console.log('[schedulerRunner][execId=%s] debug totalExpiredChatBots=%d totalWelcomeChats=%d',
      execId,
      totalExpiredChatBots,
      totalWelcomeChats
    );

    // 1. fetch expired session ids from chatbot
    const allSessions = await prisma.chatBot.findMany({
      where: { expires_at: { lt: now } },
      select: { session_id: true },
    });

    const sessionIds = allSessions.map((s) => s.session_id);
    totalSessionsFetched = sessionIds.length;
    console.log('[schedulerRunner][execId=%s] step1 expiredSessionsFetched=%d', execId, totalSessionsFetched);

    // 2-3. Store expired session ids where Chat has exactly one welcome row or no rows.
    const sessionIdsToDelete = [];

    // batch to avoid too-large IN clauses / long transactions
    const batchSize = 100;
    for (let i = 0; i < sessionIds.length; i += batchSize) {
      const batch = sessionIds.slice(i, i + batchSize);

      const chats = await prisma.chat.findMany({
        where: { session_id: { in: batch } },
        select: { session_id: true, is_welcome: true },
      });

      const chatStatsBySession = new Map();
      for (const chat of chats) {
        const stats = chatStatsBySession.get(chat.session_id) || { count: 0, allWelcome: true };
        stats.count += 1;
        stats.allWelcome = stats.allWelcome && chat.is_welcome === true;
        chatStatsBySession.set(chat.session_id, stats);
      }

      for (const sessionId of batch) {
        const stats = chatStatsBySession.get(sessionId);
        if (!stats || (stats.count === 1 && stats.allWelcome)) {
          sessionIdsToDelete.push(sessionId);
        }
      }
    }

    // de-dup in case session appears in multiple batches
    const uniqueSessionIdsToDelete = Array.from(new Set(sessionIdsToDelete));
    totalExpiredSessionsToDelete = uniqueSessionIdsToDelete.length;
    recordsProcessed = totalExpiredSessionsToDelete;

    console.log('[schedulerRunner][execId=%s] step2-3 expiredSessionDeleteCount=%d sessionIds=%j', execId, totalExpiredSessionsToDelete, uniqueSessionIdsToDelete);

    if (uniqueSessionIdsToDelete.length > 0) {
      await prisma.$transaction(async (tx) => {
        // 4. delete all Chat rows for the stored session ids
        const deleteChatResult = await tx.chat.deleteMany({
          where: { session_id: { in: uniqueSessionIdsToDelete } },
        });
        totalChatRowsDeleted = deleteChatResult.count;

        // 5. delete ChatBot rows for the same stored session ids
        const deleteChatBotResult = await tx.chatBot.deleteMany({
          where: { session_id: { in: uniqueSessionIdsToDelete } },
        });
        totalChatBotDeleted = deleteChatBotResult.count;

        recordsDeleted = totalExpiredSessionsToDelete;

        // 6. update SchedulerExecutionHistory with the stored session-id list count
        await tx.schedulerExecutionHistory.update({
          where: { id: execId },
          data: {
            status: 'completed',
            start_time: startedAt,
            end_time: new Date(),
            records_processed: recordsProcessed,
            records_deleted: recordsDeleted,
            error_message: null,
          },
        });
      });
    } else {
      // 6. update SchedulerExecutionHistory with zero counts
      await prisma.schedulerExecutionHistory.update({
        where: { id: execId },
        data: {
          status: 'completed',
          start_time: startedAt,
          end_time: new Date(),
          records_processed: recordsProcessed,
          records_deleted: recordsDeleted,
          error_message: null,
        },
      });
    }

    console.log('[schedulerRunner][execId=%s] completed processed=%d deletedSessions=%d deletedChatRows=%d deletedChatBotRows=%d', execId, recordsProcessed, recordsDeleted, totalChatRowsDeleted, totalChatBotDeleted);
  } catch (err) {
    await prisma.schedulerExecutionHistory.update({
      where: { id: execId },
      data: {
        status: 'error',
        end_time: new Date(),
        records_processed: recordsProcessed,
        records_deleted: recordsDeleted,
        error_message: err?.message ? String(err.message) : 'Scheduler execution failed',
      },
    });

    console.error('[schedulerRunner][execId=%s] failed: %s', execId, err?.stack || err);
  }
}


async function tickManualQueued() {
  const queued = await prisma.schedulerExecutionHistory.findMany({
    where: { status: 'queued' },
    orderBy: { created_at: 'asc' },
    take: 5,
  });

  for (const exec of queued) {
    const job = await prisma.schedulerConfig.findUnique({
      where: { id: exec.scheduler_id },
    });
    if (!job) {
      await prisma.schedulerExecutionHistory.update({
        where: { id: exec.id },
        data: { status: 'error', end_time: new Date(), error_message: 'Job not found' },
      });
      continue;
    }
    await executeJob(job, exec.id);
  }
}

function startCronSchedules() {
  // Create cron jobs for each active scheduler config.
  cron.validate('*/5 * * * * *');

  const schedules = new Map();

  async function refreshSchedules() {
    const activeJobs = await prisma.schedulerConfig.findMany({
      where: { is_active: true },
    });

    // Remove old schedules if cron changes.
    for (const [key, task] of schedules.entries()) {
      const job = activeJobs.find((j) => j.id === key);
      if (!job) {
        task.stop();
        schedules.delete(key);
      }
    }

    for (const job of activeJobs) {
      if (schedules.has(job.id)) continue;

      // node-cron supports 6 fields if seconds are included.
      // We assume user provides standard cron (>=5 fields). We'll always run at that schedule.
      const cronExpr = job.cron_expression;

      // Schedule callback: create queued execution row.
      const task = cron.schedule(cronExpr, async () => {
        try {
          await prisma.schedulerExecutionHistory.create({
            data: {
              scheduler_id: job.id,
              start_time: new Date(),
              status: 'queued',
              records_processed: 0,
              records_deleted: 0,
              error_message: null,
            },
          });
          await tickManualQueued();
        } catch (e) {
          // ignore
        }
      });

      schedules.set(job.id, task);
    }
  }

  // initial load
  refreshSchedules().catch(() => {});

  // refresh cron schedules every 60 seconds
  setInterval(() => refreshSchedules().catch(() => {}), 60 * 1000);

  // also process queued executions frequently
  setInterval(() => tickManualQueued().catch(() => {}), 5 * 1000);
}

function startSchedulerRunner() {
  // process queued from server start
  tickManualQueued().catch(() => {});
  startCronSchedules();
}

module.exports = { startSchedulerRunner };

