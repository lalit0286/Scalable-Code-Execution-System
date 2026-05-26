import { Redis } from 'ioredis';
import { PER_USER_MAX_CONCURRENT } from '@code-exec/shared';
import { logger } from '../config/logger';

const USER_CONCURRENCY_TTL = 30; // seconds — auto-expire stale keys

/**
 * Acquires a concurrency slot for a user using Redis atomic increments.
 * Returns true if the slot was acquired, false if the user is at max concurrency.
 */
export async function acquireUserSlot(
  redis: Redis,
  user_id: string,
): Promise<boolean> {
  const key = `user_concurrency:${user_id}`;

  // Lua script for atomic check-and-increment
  const script = `
    local current = redis.call('GET', KEYS[1])
    if current and tonumber(current) >= tonumber(ARGV[1]) then
      return 0
    end
    local new = redis.call('INCR', KEYS[1])
    redis.call('EXPIRE', KEYS[1], ARGV[2])
    return 1
  `;

  const result = await redis.eval(
    script,
    1,
    key,
    String(PER_USER_MAX_CONCURRENT),
    String(USER_CONCURRENCY_TTL),
  ) as number;

  if (result === 0) {
    logger.warn({ user_id }, 'User concurrency limit reached');
    return false;
  }

  return true;
}

/**
 * Releases a concurrency slot for a user.
 * Always call this after execution, even on failure.
 */
export async function releaseUserSlot(
  redis: Redis,
  user_id: string,
): Promise<void> {
  const key = `user_concurrency:${user_id}`;

  const script = `
    local current = redis.call('GET', KEYS[1])
    if current and tonumber(current) > 0 then
      return redis.call('DECR', KEYS[1])
    end
    return 0
  `;

  await redis.eval(script, 1, key);
}
