import { z } from 'zod';
import { SUPPORTED_LANGUAGES, MAX_CODE_LENGTH, MAX_USER_ID_LENGTH } from '../constants';

// Execution request validation schema
export const ExecutionRequestSchema = z.object({
  user_id: z
    .string()
    .min(1, 'user_id is required')
    .max(MAX_USER_ID_LENGTH, `user_id must be at most ${MAX_USER_ID_LENGTH} characters`)
    .regex(/^[\w\-\.@]+$/, 'user_id contains invalid characters'),

  language: z.enum(SUPPORTED_LANGUAGES as [string, ...string[]], {
    errorMap: () => ({
      message: `language must be one of: ${SUPPORTED_LANGUAGES.join(', ')}`,
    }),
  }),

  code: z
    .string()
    .min(1, 'code cannot be empty')
    .max(MAX_CODE_LENGTH, `code must be at most ${MAX_CODE_LENGTH} characters`),
});

export type ExecutionRequestInput = z.infer<typeof ExecutionRequestSchema>;

// Socket subscription validation
export const SubscribeSchema = z.object({
  execution_id: z
    .string()
    .uuid('execution_id must be a valid UUID'),
});

export type SubscribeInput = z.infer<typeof SubscribeSchema>;

// Validate and parse, returning typed result or throwing ZodError
export function validateExecutionRequest(data: unknown): ExecutionRequestInput {
  return ExecutionRequestSchema.parse(data);
}

export function validateSubscription(data: unknown): SubscribeInput {
  return SubscribeSchema.parse(data);
}
