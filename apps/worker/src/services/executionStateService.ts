import type { ExecutionStatus, ExecutionResult } from '@code-exec/shared';
import { SOCKET_EVENTS, executionRoom } from '@code-exec/shared';
import { getPrismaClient } from '../config/database';
import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

/**
 * Updates the DB status and publishes a socket event via Redis pub/sub.
 * The API server subscribes to this channel and relays to Socket.io clients.
 */
export async function updateExecutionState(
  execution_id: string,
  status: ExecutionStatus,
  extras: Partial<{
    output: string;
    stderr: string;
    execution_time_ms: number;
    error: string;
  }> = {},
): Promise<void> {
  const prisma = getPrismaClient();
  const redis = getRedisClient();

  // 1. Persist to DB
  await prisma.execution.update({
    where: { id: execution_id },
    data: {
      status,
      ...(extras.output !== undefined && { output: extras.output }),
      ...(extras.stderr !== undefined && { stderr: extras.stderr }),
      ...(extras.execution_time_ms !== undefined && {
        execution_time_ms: extras.execution_time_ms,
      }),
      ...(extras.error !== undefined && { error: extras.error }),
    },
  });

  // 2. Publish socket event via Redis pub/sub channel
  const room = executionRoom(execution_id);
  const payload = JSON.stringify({
    execution_id,
    status,
    ...extras,
  });

  await redis.publish(`socket:${room}`, payload);

  logger.debug(
    { execution_id, status, extras: Object.keys(extras) },
    'Execution state updated',
  );
}

/**
 * Called when execution result is ready — updates state based on result.
 */
export async function persistExecutionResult(
  execution_id: string,
  result: ExecutionResult,
): Promise<void> {
  const statusMap: Record<ExecutionResult['status'], ExecutionStatus> = {
    success: 'completed',
    failed: 'failed',
    timeout: 'timeout',
  };

  await updateExecutionState(execution_id, statusMap[result.status], {
    output: result.output,
    stderr: result.stderr,
    execution_time_ms: result.execution_time_ms,
    ...(result.status !== 'success' && {
      error: result.stderr ?? `Execution ${result.status}`,
    }),
  });
}
