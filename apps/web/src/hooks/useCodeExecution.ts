'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { SOCKET_EVENTS } from '@code-exec/shared';
import type { ExecutionStatus, Language } from '@code-exec/shared';
import { submitExecution, getExecution, ApiError } from '@/lib/api';
import { getSocket, subscribeToExecution, unsubscribeFromExecution } from '@/lib/socket';

export interface ExecutionState {
  execution_id: string | null;
  status: ExecutionStatus | null;
  output: string | null;
  stderr: string | null;
  execution_time_ms: number | null;
  error: string | null;
}

const INITIAL_STATE: ExecutionState = {
  execution_id: null,
  status: null,
  output: null,
  stderr: null,
  execution_time_ms: null,
  error: null,
};

const TERMINAL_STATUSES: ExecutionStatus[] = ['completed', 'failed', 'timeout'];

export function useCodeExecution(userId: string) {
  const [state, setState] = useState<ExecutionState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Track current execution for cleanup
  const currentExecutionId = useRef<string | null>(null);
  // Polling fallback interval
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  // Whether we've received a socket event for the current execution
  const receivedSocketEvent = useRef(false);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  }, []);

  // Apply an incoming event payload to state
  const applyEvent = useCallback(
    (payload: Record<string, unknown>) => {
      const status = payload.status as ExecutionStatus;
      receivedSocketEvent.current = true;

      setState((prev) => ({
        ...prev,
        status,
        output: (payload.output as string) ?? prev.output,
        stderr: (payload.stderr as string) ?? prev.stderr,
        execution_time_ms:
          (payload.execution_time_ms as number) ?? prev.execution_time_ms,
        error: (payload.error as string) ?? prev.error,
      }));

      // Stop polling once we have a terminal status
      if (TERMINAL_STATUSES.includes(status)) {
        stopPolling();
      }
    },
    [stopPolling],
  );

  // Polling fallback: if no socket event after 2s, poll DB
  const startPollingFallback = useCallback(
    (execution_id: string) => {
      stopPolling();
      // Give socket 2 seconds before starting polling
      const startDelay = setTimeout(() => {
        if (receivedSocketEvent.current) return; // socket is working fine

        pollingInterval.current = setInterval(async () => {
          try {
            const record = await getExecution(execution_id);
            applyEvent({
              execution_id: record.id,
              status: record.status,
              output: record.output ?? '',
              stderr: record.stderr ?? '',
              execution_time_ms: record.execution_time_ms ?? null,
              error: record.error ?? null,
            });

            if (TERMINAL_STATUSES.includes(record.status)) {
              stopPolling();
            }
          } catch {
            // Swallow polling errors
          }
        }, 2000);
      }, 2000);

      return () => clearTimeout(startDelay);
    },
    [applyEvent, stopPolling],
  );

  // Set up Socket.io listener for the current execution
  const setupSocketListener = useCallback(
    (execution_id: string) => {
      const socket = getSocket();
      receivedSocketEvent.current = false;

      const handler = (payload: Record<string, unknown>) => {
        if (payload.execution_id !== execution_id) return;
        applyEvent(payload);
      };

      socket.on(SOCKET_EVENTS.EXECUTION_UPDATE, handler);
      subscribeToExecution(execution_id);

      return () => {
        socket.off(SOCKET_EVENTS.EXECUTION_UPDATE, handler);
        unsubscribeFromExecution(execution_id);
      };
    },
    [applyEvent],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      if (currentExecutionId.current) {
        unsubscribeFromExecution(currentExecutionId.current);
      }
    };
  }, [stopPolling]);

  const run = useCallback(
    async (language: Language, code: string) => {
      // Clean up previous execution
      stopPolling();
      if (currentExecutionId.current) {
        unsubscribeFromExecution(currentExecutionId.current);
      }

      setState(INITIAL_STATE);
      setSubmitError(null);
      setIsSubmitting(true);

      try {
        const { execution_id } = await submitExecution(userId, language, code);
        currentExecutionId.current = execution_id;

        setState({
          execution_id,
          status: 'queued',
          output: null,
          stderr: null,
          execution_time_ms: null,
          error: null,
        });

        // Set up socket listener
        const cleanupSocket = setupSocketListener(execution_id);

        // Start polling fallback
        const cleanupPolling = startPollingFallback(execution_id);

        // Store cleanup fns
        return () => {
          cleanupSocket();
          cleanupPolling?.();
        };
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : 'Failed to submit code. Please try again.';
        setSubmitError(message);
        setState(INITIAL_STATE);
      } finally {
        setIsSubmitting(false);
      }
    },
    [userId, setupSocketListener, startPollingFallback, stopPolling],
  );

  const reset = useCallback(() => {
    stopPolling();
    if (currentExecutionId.current) {
      unsubscribeFromExecution(currentExecutionId.current);
      currentExecutionId.current = null;
    }
    setState(INITIAL_STATE);
    setSubmitError(null);
  }, [stopPolling]);

  return { state, isSubmitting, submitError, run, reset };
}
