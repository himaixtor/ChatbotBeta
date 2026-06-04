/**
 * Admin scheduler APIs: CRUD jobs, history, run-now.
 */
const prisma = require('../utils/prisma');

function validateCronLike(expression) {
  // Basic validation: at least 5 fields (classic cron) and contains digits/spaces.
  if (!expression || typeof expression !== 'string') return false;
  const parts = expression.trim().split(/\s+/);
  return parts.length >= 5;
}

async function listJobs(req, res, next) {
  try {
    const jobs = await prisma.schedulerConfig.findMany({
      orderBy: { created_at: 'desc' },
    });
    res.json({ data: jobs });
  } catch (error) {
    next(error);
  }
}

async function createJob(req, res, next) {
  try {
    const {
      job_name,
      details,
      run_timing,
      cron_expression,
      is_active,
      created_by,
    } = req.body;

    if (!job_name) return res.status(400).json({ error: 'job_name is required' });
    if (!validateCronLike(cron_expression)) {
      return res.status(400).json({ error: 'cron_expression looks invalid' });
    }

    const job = await prisma.schedulerConfig.create({
      data: {
        job_name: String(job_name),
        details: details ? String(details) : null,
        run_timing: run_timing ? String(run_timing) : null,
        cron_expression: String(cron_expression),
        is_active: is_active === undefined ? true : Boolean(is_active),
        created_by: created_by ? String(created_by) : null,
        updated_by: created_by ? String(created_by) : null,
      },
    });

    res.status(201).json({ data: job });
  } catch (error) {
    next(error);
  }
}

async function updateJob(req, res, next) {
  try {
    const { id } = req.params;
    const {
      job_name,
      details,
      run_timing,
      cron_expression,
      is_active,
      updated_by,
    } = req.body;

    const existing = await prisma.schedulerConfig.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Job not found' });

    const updateData = {};
    if (job_name !== undefined) updateData.job_name = String(job_name);
    if (details !== undefined) updateData.details = details ? String(details) : null;
    if (run_timing !== undefined)
      updateData.run_timing = run_timing ? String(run_timing) : null;

    if (cron_expression !== undefined) {
      if (!validateCronLike(cron_expression)) {
        return res.status(400).json({ error: 'cron_expression looks invalid' });
      }
      updateData.cron_expression = String(cron_expression);
    }

    if (is_active !== undefined) updateData.is_active = Boolean(is_active);
    if (updated_by !== undefined) updateData.updated_by = updated_by ? String(updated_by) : null;

    const job = await prisma.schedulerConfig.update({
      where: { id },
      data: updateData,
    });

    res.json({ data: job });
  } catch (error) {
    next(error);
  }
}

async function listExecutions(req, res, next) {
  try {
    const { jobId } = req.query;
    if (!jobId) return res.status(400).json({ error: 'jobId is required' });

    const history = await prisma.schedulerExecutionHistory.findMany({
      where: { scheduler_id: jobId },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    res.json({ data: history });
  } catch (error) {
    next(error);
  }
}

async function runNow(req, res, next) {
  try {
    const { jobId } = req.params;

    // Real execution is handled by scheduler runner.
    // Here we create a "pending execution" row and runner will pick it up.
    const job = await prisma.schedulerConfig.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const exec = await prisma.schedulerExecutionHistory.create({
      data: {
        scheduler_id: jobId,
        start_time: new Date(),
        status: 'queued',
        records_processed: 0,
        records_deleted: 0,
        error_message: null,
      },
    });


    res.status(202).json({ data: exec });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listJobs,
  createJob,
  updateJob,
  listExecutions,
  runNow,
};

