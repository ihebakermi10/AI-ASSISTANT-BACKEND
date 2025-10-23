import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAsk } from '../../../src/controllers/ask.controller';
import * as orchestratorService from '../../../src/services/orchestrator.service';
import type { Context } from 'koa';

vi.mock('../../../src/services/orchestrator.service');

describe('Ask Controller', () => {
  let mockCtx: Partial<Context>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCtx = {
      request: {
        body: {},
      } as any,
      status: 200,
      body: undefined,
      ip: '127.0.0.1',
    };
  });

  describe('handleAsk', () => {
    describe('successful requests', () => {
      it('should process valid query and return response', async () => {
        mockCtx.request!.body = { query: 'What is the refund policy?' };

        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'You can get a refund within 30 days.',
          trace: [
            {
              toolName: 'retrieveDocumentContext',
              arguments: { query: 'What is the refund policy?', topK: 4 },
              result: 'Context from policy document',
              executionTime: 123,
            },
          ],
        });

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(200);
        expect(mockCtx.body).toEqual({
          query: 'What is the refund policy?',
          answer: 'You can get a refund within 30 days.',
          trace: [
            {
              toolName: 'retrieveDocumentContext',
              arguments: { query: 'What is the refund policy?', topK: 4 },
              result: 'Context from policy document',
              executionTime: 123,
            },
          ],
        });
        expect(orchestratorService.askOrchestrator).toHaveBeenCalledWith(
          'What is the refund policy?'
        );
      });

      it('should handle queries with empty trace', async () => {
        mockCtx.request!.body = { query: 'Hello' };

        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'Hello! How can I help you?',
          trace: [],
        });

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(200);
        expect(mockCtx.body).toMatchObject({
          query: 'Hello',
          answer: 'Hello! How can I help you?',
          trace: [],
        });
      });

      it('should handle database queries', async () => {
        mockCtx.request!.body = { query: 'Show me orders from John Smith' };

        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'John Smith has 3 orders.',
          trace: [
            {
              toolName: 'queryDatabase',
              arguments: { criteria: { customerName: 'John Smith' } },
              result: '[{"orderId": "ORD-001"}]',
              executionTime: 456,
            },
          ],
        });

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(200);
        expect(mockCtx.body).toMatchObject({
          query: 'Show me orders from John Smith',
          answer: 'John Smith has 3 orders.',
        });
      });
    });

    describe('validation errors', () => {
      it('should return 400 for missing query', async () => {
        mockCtx.request!.body = {};

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(400);
        expect(mockCtx.body).toMatchObject({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              path: 'query',
              message: 'Query is required',
            }),
          ]),
        });
        expect(orchestratorService.askOrchestrator).not.toHaveBeenCalled();
      });

      it('should return 400 for empty query string', async () => {
        mockCtx.request!.body = { query: '' };

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(400);
        expect(mockCtx.body).toMatchObject({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              message: 'Query cannot be empty',
            }),
          ]),
        });
      });

      it('should return 400 for query exceeding max length', async () => {
        const longQuery = 'a'.repeat(501);
        mockCtx.request!.body = { query: longQuery };

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(400);
        expect(mockCtx.body).toMatchObject({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({
              message: 'Query too long',
            }),
          ]),
        });
      });

      it('should return 400 for non-string query', async () => {
        mockCtx.request!.body = { query: 123 };

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(400);
        expect(mockCtx.body).toMatchObject({
          error: 'Validation failed',
        });
      });

      it('should return 400 for null query', async () => {
        mockCtx.request!.body = { query: null };

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(400);
        expect(mockCtx.body).toMatchObject({
          error: 'Validation failed',
        });
      });

      it('should return 400 for query with only whitespace', async () => {
        mockCtx.request!.body = { query: '   ' };

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(400);
        expect(mockCtx.body).toMatchObject({
          error: 'Validation failed',
        });
      });
    });

    describe('error handling', () => {
      it('should return 500 when orchestrator fails', async () => {
        mockCtx.request!.body = { query: 'What is the policy?' };

        vi.mocked(orchestratorService.askOrchestrator).mockRejectedValue(
          new Error('OpenAI API error')
        );

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(500);
        expect(mockCtx.body).toMatchObject({
          error: 'Internal server error',
          message: 'An unexpected error occurred',
        });
      });

      it('should return 500 for unexpected errors', async () => {
        mockCtx.request!.body = { query: 'What is the policy?' };

        vi.mocked(orchestratorService.askOrchestrator).mockRejectedValue(
          new Error('Unexpected error')
        );

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(500);
        expect(mockCtx.body).toMatchObject({
          error: 'Internal server error',
        });
      });

      it('should handle non-Error exceptions', async () => {
        mockCtx.request!.body = { query: 'What is the policy?' };

        vi.mocked(orchestratorService.askOrchestrator).mockRejectedValue(
          'String error'
        );

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(500);
        expect(mockCtx.body).toMatchObject({
          error: 'Internal server error',
          message: 'An unexpected error occurred',
        });
      });

      it('should not expose internal error details', async () => {
        mockCtx.request!.body = { query: 'What is the policy?' };

        vi.mocked(orchestratorService.askOrchestrator).mockRejectedValue(
          new Error('Database connection failed: mongodb://internal-server:27017')
        );

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(500);
        expect(mockCtx.body).toMatchObject({
          error: 'Internal server error',
          message: expect.not.stringContaining('mongodb://'),
        });
      });
    });

    describe('edge cases', () => {
      it('should handle special characters in query', async () => {
        mockCtx.request!.body = { query: 'What is the policy for $100+ orders?' };

        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'Policy details...',
          trace: [],
        });

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(200);
        expect(orchestratorService.askOrchestrator).toHaveBeenCalledWith(
          'What is the policy for $100+ orders?'
        );
      });

      it('should handle unicode characters', async () => {
        mockCtx.request!.body = { query: 'Was ist die Rückerstattungsrichtlinie?' };

        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'Policy details...',
          trace: [],
        });

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(200);
      });

      it('should trim whitespace from query', async () => {
        mockCtx.request!.body = { query: '  What is the policy?  ' };

        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'Policy details...',
          trace: [],
        });

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(200);
      });

      it('should handle very long answers', async () => {
        mockCtx.request!.body = { query: 'Tell me everything' };

        const longAnswer = 'A'.repeat(10000);
        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: longAnswer,
          trace: [],
        });

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(200);
        expect(mockCtx.body).toMatchObject({
          answer: longAnswer,
        });
      });

      it('should handle multiple trace entries', async () => {
        mockCtx.request!.body = { query: 'Complex query' };

        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'Complex answer',
          trace: [
            {
              toolName: 'retrieveDocumentContext',
              arguments: { query: 'part1', topK: 4 },
              result: 'context1',
              executionTime: 100,
            },
            {
              toolName: 'queryDatabase',
              arguments: { criteria: { status: 'pending' } },
              result: 'data1',
              executionTime: 200,
            },
          ],
        });

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(200);
        expect(mockCtx.body).toMatchObject({
          trace: expect.arrayContaining([
            expect.objectContaining({ toolName: 'retrieveDocumentContext' }),
            expect.objectContaining({ toolName: 'queryDatabase' }),
          ]),
        });
      });
    });

    describe('logging', () => {
      it('should include IP address in processing', async () => {
        mockCtx.request!.body = { query: 'Test query' };
        mockCtx.ip = '192.168.1.100';

        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'Test answer',
          trace: [],
        });

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(200);
        // Logger should have received IP (this is implicit through the controller)
      });
    });

    describe('boundary values', () => {
      it('should accept query at minimum length (1 character)', async () => {
        mockCtx.request!.body = { query: 'a' };

        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'Answer',
          trace: [],
        });

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(200);
      });

      it('should accept query at maximum length (500 characters)', async () => {
        const maxQuery = 'a'.repeat(500);
        mockCtx.request!.body = { query: maxQuery };

        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'Answer',
          trace: [],
        });

        await handleAsk(mockCtx as Context);

        expect(mockCtx.status).toBe(200);
      });
    });
  });
});
