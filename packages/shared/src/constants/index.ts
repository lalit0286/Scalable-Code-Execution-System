import type { Language } from '../types';

// Supported languages list
export const SUPPORTED_LANGUAGES: Language[] = ['javascript', 'python'];

// Queue configuration
export const QUEUE_NAME = 'code-execution';
export const DEAD_LETTER_QUEUE_NAME = 'code-execution-failed';

// Job configuration
export const JOB_TIMEOUT_MS = 5_000;
export const MAX_CONCURRENCY = 10;
export const MAX_QUEUE_SIZE = 10_000;

// Per-user throttle: max N jobs in flight simultaneously
export const PER_USER_MAX_CONCURRENT = 3;

// Docker execution limits
export const DOCKER_MEMORY_LIMIT = '128m';
export const DOCKER_CPU_LIMIT = '0.5';
export const DOCKER_TIMEOUT_SECONDS = 5;

// Docker images per language
export const DOCKER_IMAGES: Record<Language, string> = {
  javascript: 'node:20-alpine',
  python: 'python:3.11-alpine',
};

// Execution commands per language
export const EXECUTION_COMMANDS: Record<Language, string> = {
  javascript: 'node',
  python: 'python3',
};

// File extensions per language
export const FILE_EXTENSIONS: Record<Language, string> = {
  javascript: '.js',
  python: '.py',
};

// Socket.io event names
export const SOCKET_EVENTS = {
  // Server → Client
  EXECUTION_UPDATE: 'execution:update',
  EXECUTION_COMPLETED: 'execution:completed',
  EXECUTION_FAILED: 'execution:failed',
  // Client → Server
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
} as const;

// Socket room naming
export const executionRoom = (id: string) => `execution:${id}`;

// API limits
export const MAX_CODE_LENGTH = 50_000; // 50KB
export const MAX_USER_ID_LENGTH = 128;

// Retry policy
export const MAX_INFRASTRUCTURE_RETRIES = 2;
export const USER_CODE_ERROR_RETRIES = 0; // never retry user code errors

// Pino log levels
export const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
