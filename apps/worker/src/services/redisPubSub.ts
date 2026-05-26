import { Redis } from 'ioredis';
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

/**
 * The worker cannot directly access the API's Socket.io server.
 * Instead, the worker publishes events to Redis pub/sub channels.
 * The API server subscribes to these channels and emits to Socket.io rooms.
 *
 * This decouples the worker from the API and supports multiple API instances.
 */

let subscriberClient: Redis | null = null;

export function getSubscriberClient(): Redis {
  if (subscriberClient) return subscriberClient;
  // Subscriber client must be a separate connection (can't share with pub/commands)
  subscriberClient = getRedisClient().duplicate();
  return subscriberClient;
}

export async function closeSubscriber(): Promise<void> {
  if (subscriberClient) {
    await subscriberClient.quit();
    subscriberClient = null;
  }
}
