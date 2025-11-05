import { ConnectionOptions } from 'bullmq';

/**
 * Redis connection configuration for BullMQ
 * Implements proper retry logic to prevent infinite retries
 */
export const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: parseInt(process.env.REDIS_DB || '0'),

  // Connection timeout
  connectTimeout: 5000,

  // Do not retry indefinitely
  maxRetriesPerRequest: 3,

  // Enable ready check to verify connection
  enableReadyCheck: true,

  // Exponential backoff retry strategy
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 200, 2000); // Start at 200ms, max 2s

    // Stop retrying after 3 attempts
    if (times > 3) {
      console.error(`Redis connection failed after ${times} attempts`);
      return null; // Return null to stop retrying
    }

    console.warn(`Redis retry attempt ${times}, retrying in ${delay}ms`);
    return delay;
  },

  // Enable keep-alive to detect disconnections
  keepAlive: 30000,
};

/**
 * Validate Redis is configured
 */
export function validateRedisConfig(): void {
  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379');

  if (!host || isNaN(port)) {
    throw new Error('Invalid Redis configuration: REDIS_HOST or REDIS_PORT is missing');
  }

  console.log(`Redis configuration: ${host}:${port}`);
}
