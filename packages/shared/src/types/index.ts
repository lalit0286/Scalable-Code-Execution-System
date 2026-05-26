// Supported execution languages
export type Language = 'javascript' | 'python';

// Execution lifecycle statuses
export type ExecutionStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'timeout';

// Core execution request
export interface ExecutionRequest {
  user_id: string;
  language: Language;
  code: string;
}

// Immediate API response after enqueue
export interface ExecutionEnqueueResponse {
  execution_id: string;
  status: 'queued';
}

// Structured result from execution engine
export interface ExecutionResult {
  status: 'success' | 'failed' | 'timeout';
  output: string;
  stderr?: string;
  execution_time_ms: number;
}

// Full execution record (DB model shape)
export interface ExecutionRecord {
  id: string;
  user_id: string;
  language: Language;
  code: string;
  status: ExecutionStatus;
  output: string | null;
  stderr: string | null;
  execution_time_ms: number | null;
  error: string | null;
  created_at: Date;
  updated_at: Date;
}

// BullMQ job data payload
export interface ExecutionJobData {
  execution_id: string;
  user_id: string;
  language: Language;
  code: string;
  enqueued_at: string; // ISO timestamp
}

// Socket.io event payloads
export interface SocketExecutionEvent {
  execution_id: string;
  status: ExecutionStatus;
}

export interface SocketCompletionEvent extends SocketExecutionEvent {
  status: 'completed';
  output: string;
  stderr?: string;
  execution_time_ms: number;
}

export interface SocketFailureEvent extends SocketExecutionEvent {
  status: 'failed' | 'timeout';
  error: string;
}

// Union of all socket events emitted to clients
export type SocketExecutionPayload =
  | SocketExecutionEvent
  | SocketCompletionEvent
  | SocketFailureEvent;

// Metrics snapshot
export interface SystemMetrics {
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  workers: {
    concurrency: number;
  };
  uptime_seconds: number;
}

// Health check response
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  services: {
    redis: 'ok' | 'error';
    postgres: 'ok' | 'error';
  };
}
