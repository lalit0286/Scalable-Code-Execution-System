import { Redis } from 'ioredis';
import { config } from './env';
import { logger } from './logger';

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisInstance) return redisInstance;

  redisInstance = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy(times: number) {
      const delay = Math.min(times * 100, 3000);
      logger.warn({ attempt: times, delay }, 'Worker Redis reconnecting...');
      return delay;
    },
  });

  redisInstance.on('connect', () => logger.info('Worker Redis connected'));
  redisInstance.on('error', (err: Error) => logger.error({ err }, 'Worker Redis error'));

  return redisInstance;
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
