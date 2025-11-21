import { ConnectionOptions } from 'bullmq';

// Helper to determine config based on environment
const getRedisConfig = () => {
  // 1. PRIORITY: Check for REDIS_URL (Standard on Railway)
  if (process.env.REDIS_URL) {
    console.log('DEBUG: Using REDIS_URL from environment');
    try {
      const parsedUrl = new URL(process.env.REDIS_URL);
      return {
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port),
        username: parsedUrl.username,
        password: parsedUrl.password,
      };
    } catch (e) {
      console.error('Failed to parse REDIS_URL, falling back to individual vars');
    }
  }

  // 2. FALLBACK: Use individual variables (Standard for Local .env)
  console.log('DEBUG: Using individual REDIS_HOST/PORT variables');
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    username: process.env.REDIS_USERNAME,
    password: process.env.REDIS_PASSWORD,
  };
};

const config = getRedisConfig();

export const redisConnection: ConnectionOptions = {
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  
  // Works locally AND on Railway (fixes IPv6 issues)
  family: 0, 
  
  // Required by BullMQ everywhere
  maxRetriesPerRequest: null,
  
  connectTimeout: 10000,
};

export function validateRedisConfig(): void {
    // Simple check to help debug local vs prod
    console.log(`Redis Connection Configured for host: ${config.host}`);
}