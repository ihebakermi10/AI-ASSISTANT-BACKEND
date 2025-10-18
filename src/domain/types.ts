import { z } from 'zod';

export const AskRequestSchema = z.object({
  query: z
    .string({
      required_error: 'Query is required',
      invalid_type_error: 'Query must be a string',
    })
    .min(1, 'Query cannot be empty')
    .max(500, 'Query too long')
    .trim()
    .min(1, 'Query cannot be empty'),
});

export type AskRequest = z.infer<typeof AskRequestSchema>;

export interface ToolTrace {
  toolName: 'retrieveDocumentContext' | 'queryDatabase';
  arguments: Record<string, any>;
  result: string;
  executionTime: number;
}

export interface AskResponse {
  query: string;
  answer: string;
  trace: ToolTrace[];
}

export interface OrchestratorResult {
  answer: string;
  trace: ToolTrace[];
}

export interface DatabaseQueryCriteria {
  customerName?: string;
  product?: string;
  dateRange?: string;
  status?: string;
  [key: string]: any;
}
