import { Queue } from 'bullmq';
import { redisConnection } from './connection';
import { JobType, BufferJobData, RadiusJobData, JobData } from '../jobs/types';

/**
 * Analysis job queue for handling asynchronous geoprocessing tasks
 */
export const analysisQueue = new Queue<JobData>('analysis', {
  connection: redisConnection,
  defaultJobOptions: {
    // Retry strategy
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start at 2 seconds
    },

    // Remove completed jobs after some time
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },

    // Keep failed jobs for debugging
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
    },
  },
});

/**
 * Create a buffer analysis job
 * Returns job ID for tracking
 */
export async function createBufferJob(data: BufferJobData): Promise<string> {
  // Validate input
  if (data.distance <= 0) {
    throw new Error('Distance must be positive');
  }

  if (!['meters', 'kilometers', 'miles'].includes(data.units)) {
    throw new Error('Invalid units. Must be meters, kilometers, or miles');
  }

  const job = await analysisQueue.add(JobType.BUFFER, data, {
    jobId: `buffer-${data.userId}-${Date.now()}`, // Custom job ID for easier tracking
  });

  console.log(`Created buffer job: ${job.id}`);
  return job.id!;
}

/**
 * Create a radius analysis job
 * Returns job ID for tracking
 */
export async function createRadiusJob(data: RadiusJobData): Promise<string> {
  // Validate input
  if (data.radius <= 0) {
    throw new Error('Radius must be positive');
  }

  if (!['meters', 'kilometers', 'miles'].includes(data.units)) {
    throw new Error('Invalid units. Must be meters, kilometers, or miles');
  }

  if (data.longitude < -180 || data.longitude > 180) {
    throw new Error('Longitude must be between -180 and 180');
  }

  if (data.latitude < -90 || data.latitude > 90) {
    throw new Error('Latitude must be between -90 and 90');
  }

  const job = await analysisQueue.add(JobType.RADIUS, data, {
    jobId: `radius-${data.userId}-${Date.now()}`, // Custom job ID for easier tracking
  });

  console.log(`Created radius job: ${job.id}`);
  return job.id!;
}

/**
 * Get job by ID
 */
export async function getJob(jobId: string) {
  return await analysisQueue.getJob(jobId);
}

/**
 * Get all active jobs
 */
export async function getActiveJobs() {
  return await analysisQueue.getJobs(['active', 'waiting', 'delayed']);
}

/**
 * Get job counts by status
 */
export async function getJobCounts() {
  const counts = await analysisQueue.getJobCounts(
    'active',
    'waiting',
    'completed',
    'failed',
    'delayed',
  );
  return counts;
}
