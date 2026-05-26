import type {
  ExecutionEnqueueResponse,
  ExecutionRecord,
  Language,
} from '@code-exec/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let body: Record<string, unknown> = {};
    try {
      body = await res.json();
    } catch {
      // ignore parse errors
    }
    throw new ApiError(
      (body.error as string) ?? `HTTP ${res.status}`,
      res.status,
      body.details,
    );
  }
  return res.json() as Promise<T>;
}

export async function submitExecution(
  user_id: string,
  language: Language,
  code: string,
): Promise<ExecutionEnqueueResponse> {
  const res = await fetch(`${API_URL}/api/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id, language, code }),
  });

  return handleResponse<ExecutionEnqueueResponse>(res);
}

export async function getExecution(execution_id: string): Promise<ExecutionRecord> {
  const res = await fetch(`${API_URL}/api/executions/${execution_id}`);
  return handleResponse<ExecutionRecord>(res);
}

export async function getUserExecutions(user_id: string): Promise<ExecutionRecord[]> {
  const res = await fetch(`${API_URL}/api/executions?user_id=${encodeURIComponent(user_id)}`);
  const data = await handleResponse<{ executions: ExecutionRecord[] }>(res);
  return data.executions;
}
