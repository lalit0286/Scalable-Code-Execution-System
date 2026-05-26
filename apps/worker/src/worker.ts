import { startWorker, stopWorker } from './worker/executionWorker';
import { closeRedis } from './config/redis';
import { closePrisma } from './config/database';
import { closeSubscriber } from './services/redisPubSub';
import { logger } from './config/logger';

async function bootstrap() {
  logger.info('Starting worker process...');

  // Start BullMQ worker
  startWorker();

  logger.info('🔧 Worker ready — listening for execution jobs');

  // Graceful shutdown
  async function shutdown(signal: string) {
    logger.info({ signal }, 'Worker shutdown signal received');

    try {
      await stopWorker();
      await Promise.all([closeSubscriber(), closeRedis(), closePrisma()]);
      logger.info('Worker shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during worker shutdown');
      process.exit(1);
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Worker uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Worker unhandled rejection');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start worker:', err);
  process.exit(1);
});
