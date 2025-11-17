import { Worker, Job } from 'bullmq';
import { getPool } from '../db/connection';
import { redisConnection } from './connection';
import { JobType, JobData } from '../jobs/types';
import {
  handleBufferJob,
  handleClipJob,
  handleIntersectJob,
  handleUnionJob,
  handleRadiusJob,
} from '../jobs/handlers/buffer.handler';

/**
 * Analysis worker process
 * Processes geoprocessing jobs from the queue
 */
export const analysisWorker = new Worker<JobData>(
  'analysis',
  async (job: Job<JobData>) => {
    console.log(`[Worker] Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case JobType.BUFFER:
        return await handleBufferJob(job.data as any, job as any);

      case JobType.CLIP:
        return await handleClipJob(job.data as any, job as any);

      case JobType.INTERSECT:
        return await handleIntersectJob(job.data as any, job as any);

      case JobType.UNION:
        return await handleUnionJob(job.data as any, job as any);

      case JobType.RADIUS:
        return await handleRadiusJob(job.data as any, job as any);

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 jobs concurrently
  }
);

// ============= Event Handlers =============

/**
 * Handle successful job completion
 * Update database with result
 */
analysisWorker.on('completed', async (job: Job, result: number) => {
  const pool = getPool();

  try {
    console.log(`[Worker] Job ${job.id} completed successfully. Result layer ID: ${result}`);

    // Update job record in database
    await pool.query(
      `UPDATE jobs
       SET status = 'completed',
           result_layer_id = $1,
           completed_at = NOW()
       WHERE id = $2`,
      [result, job.id]
    );

    console.log(`[Worker] Job ${job.id} status updated in database`);
  } catch (error) {
    console.error(`[Worker] Failed to update job status for ${job.id}:`, error);
    // Don't throw - the job is technically completed even if we couldn't update the DB
  }
});

/**
 * Handle job failure
 * Update database with error message
 */
analysisWorker.on('failed', async (job: Job | undefined, err: Error) => {
  const pool = getPool();

  if (!job) {
    console.error('[Worker] Job failed with no job object:', err);
    return;
  }

  try {
    console.error(`[Worker] Job ${job.id} failed:`, err.message);

    // Check if job will retry
    if (job.attemptsMade < (job.opts.attempts || 0)) {
      console.warn(`[Worker] Job ${job.id} will retry (attempt ${job.attemptsMade}/${job.opts.attempts})`);
    } else {
      // Only update database if this is the final failure
      await pool.query(
        `UPDATE jobs
         SET status = 'failed',
             error_message = $1,
             completed_at = NOW()
         WHERE id = $2`,
        [err.message, job.id]
      );

      console.log(`[Worker] Job ${job.id} failure recorded in database`);
    }
  } catch (dbError) {
    console.error(`[Worker] Failed to record job failure for ${job.id}:`, dbError);
  }
});

/**
 * Handle worker error
 */
analysisWorker.on('error', (err: Error) => {
  console.error('[Worker] Worker error:', err);
});

/**
 * Handle worker connection issues
 */
analysisWorker.on('closing', () => {
  console.log('[Worker] Worker is closing...');
});

analysisWorker.on('closed', () => {
  console.log('[Worker] Worker closed');
});

/**
 * Start worker and log status
 */
export async function startWorker(): Promise<void> {
  console.log('[Worker] Starting analysis worker...');

  // Check that worker is ready
  const isRunning = analysisWorker.isRunning();
  console.log(`[Worker] Worker running status: ${isRunning}`);
}

/**
 * Graceful worker shutdown
 */
export async function stopWorker(): Promise<void> {
  console.log('[Worker] Stopping analysis worker...');
  await analysisWorker.close();
  console.log('[Worker] Worker stopped');
}

/**
 * Get worker status
 */
export async function getWorkerStatus() {
  const isRunning = analysisWorker.isRunning();
  const isPaused = analysisWorker.isPaused();

  return {
    isRunning,
    isPaused,
  };
}

export default analysisWorker;
