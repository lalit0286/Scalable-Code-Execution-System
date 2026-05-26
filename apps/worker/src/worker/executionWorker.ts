import { Worker, Job, UnrecoverableError } from 'bullmq';
import {
  QUEUE_NAME,
  MAX_CONCURRENCY,
  MAX_INFRASTRUCTURE_RETRIES,
} from '@code-exec/shared';
import type { ExecutionJobData, Language } from '@code-exec/shared';
import { getRedisClient } from '../config/redis';
import { runInDocker } from '../docker/dockerRunner';
import { acquireUserSlot, releaseUserSlot } from '../docker/userThrottle';
import { updateExecutionState, persistExecutionResult } from '../services/executionStateService';
import { logger } from '../config/logger';
import { config } from '../config/env';

/**
 * Processes a single execution job.
 * - Enforces per-user concurrency
 * - Runs code in Docker sandbox
 * - Updates lifecycle state at each step
 * - Never retries user code errors
 */
async function processExecution(job: Job<ExecutionJobData>): Promise<void> {
  const { execution_id, user_id, language, code } = job.data;
  const redis = getRedisClient();

  logger.info({ execution_id, user_id, language, attempt: job.attemptsMade }, 'Processing job');

  // Acquire per-user concurrency slot
  const slotAcquired = await acquireUserSlot(redis, user_id);
  if (!slotAcquired) {
    // Re-queue with a short delay rather than failing
    throw new Error(`User ${user_id} concurrency limit reached — will retry`);
  }

  try {
    // Emit: running
    await updateExecutionState(execution_id, 'running');

    // Execute in Docker sandbox
    const result = await runInDocker({
      execution_id,
      language: language as Language,
      code,
    });

    // Persist result and emit completion/failure/timeout
    await persistExecutionResult(execution_id, result);

    logger.info(
      {
        execution_id,
        status: result.status,
        execution_time_ms: result.execution_time_ms,
      },
      'Job completed',
    );
  } catch (err: unknown) {
    const error = err as Error;

    logger.error({ execution_id, err: error }, 'Job processing error');

    // Distinguish: infrastructure error vs user code error
    // Docker setup failures are infrastructure errors → allow retry
    // User code errors should never retry (handled in runInDocker return value, not throw)
    const isInfraError =
      error.message.includes('docker') ||
      error.message.includes('ENOENT') ||
      error.message.includes('concurrency limit');

    if (!isInfraError) {
      // Wrap as UnrecoverableError to prevent BullMQ from retrying
      await updateExecutionState(execution_id, 'failed', {
        error: error.message,
      });
      throw new UnrecoverableError(`User code error: ${error.message}`);
    }

    // Infrastructure error — let BullMQ retry (up to MAX_INFRASTRUCTURE_RETRIES)
    if (job.attemptsMade >= MAX_INFRASTRUCTURE_RETRIES) {
      await updateExecutionState(execution_id, 'failed', {
        error: 'Infrastructure error after max retries',
      });
    }

    throw error; // Re-throw for BullMQ retry
  } finally {
    await releaseUserSlot(redis, user_id);
  }
}

let workerInstance: Worker<ExecutionJobData> | null = null;

export function startWorker(): Worker<ExecutionJobData> {
  if (workerInstance) return workerInstance;

  const connection = getRedisClient();

  workerInstance = new Worker<ExecutionJobData>(
    QUEUE_NAME,
    processExecution,
    {
      connection,
      concurrency: config.WORKER_CONCURRENCY ?? MAX_CONCURRENCY,
      // Stale job recovery: reclaim jobs stuck in active for > 30s
      stalledInterval: 30_000,
      maxStalledCount: 1,
      // Drain delay — how long to wait for jobs to finish on shutdown
      drainDelay: 5,
    },
  );

  workerInstance.on('completed', (job) => {
    logger.info({ jobId: job.id, execution_id: job.data.execution_id }, 'Worker: job completed');
  });

  workerInstance.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, execution_id: job?.data?.execution_id, err },
      'Worker: job failed',
    );
  });

  workerInstance.on('stalled', (jobId) => {
    logger.warn({ jobId }, 'Worker: job stalled — will be re-queued');
  });

  workerInstance.on('error', (err) => {
    logger.error({ err }, 'Worker: critical error');
  });

  logger.info(
    { concurrency: config.WORKER_CONCURRENCY, queue: QUEUE_NAME },
    '⚙️  Worker started',
  );

  return workerInstance;
}

export async function stopWorker(): Promise<void> {
  if (workerInstance) {
    // Graceful close: finish in-flight jobs before shutting down
    await workerInstance.close();
    workerInstance = null;
    logger.info('Worker stopped gracefully');
  }
}
