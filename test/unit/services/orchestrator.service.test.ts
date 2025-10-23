import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askOrchestrator } from '../../../src/services/orchestrator.service';
import * as openaiClient from '../../../src/infra/openai.client';
import * as ragService from '../../../src/services/rag.service';
import * as dbService from '../../../src/services/db.service';

vi.mock('../../../src/infra/openai.client');
vi.mock('../../../src/services/rag.service');
vi.mock('../../../src/services/db.service');

describe('Orchestrator Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processUserQuery', () => {
    it('should call RAG tool when OpenAI suggests retrieve_document_context', async () => {
      const mockToolCall = {
        id: 'call_123',
        type: 'function' as const,
        function: {
          name: 'retrieve_document_context',
          arguments: JSON.stringify({
            query: 'What is the refund policy?',
            topK: 4,
          }),
        },
      };

      vi.mocked(openaiClient.callOpenAI).mockResolvedValue({
        role: 'assistant',
        content: null,
        tool_calls: [mockToolCall],
      });

      vi.mocked(ragService.retrieveDocumentContext).mockResolvedValue(
        'Refund policy: You can return items within 30 days.'
      );

      vi.mocked(openaiClient.callOpenAI).mockResolvedValueOnce({
        role: 'assistant',
        content: null,
        tool_calls: [mockToolCall],
      });

      vi.mocked(openaiClient.callOpenAI).mockResolvedValueOnce({
        role: 'assistant',
        content: 'Based on our refund policy, you can return items within 30 days.',
        tool_calls: null,
      });

      const result = await askOrchestrator('What is the refund policy?');

      expect(ragService.retrieveDocumentContext).toHaveBeenCalledWith(
        'What is the refund policy?',
        4
      );
      expect(result).toContain('return items within 30 days');
    });

    it('should call Database tool when OpenAI suggests query_database', async () => {
      const mockToolCall = {
        id: 'call_456',
        type: 'function' as const,
        function: {
          name: 'query_database',
          arguments: JSON.stringify({
            customerName: 'John Smith',
          }),
        },
      };

      vi.mocked(openaiClient.callOpenAI).mockResolvedValue({
        role: 'assistant',
        content: null,
        tool_calls: [mockToolCall],
      });

      const mockOrders = [
        {
          orderId: 'ORD-001',
          customerName: 'John Smith',
          product: 'Laptop',
          totalAmount: 1299.99,
          status: 'completed',
        },
      ];

      vi.mocked(dbService.queryDatabase).mockResolvedValue(mockOrders);

      vi.mocked(openaiClient.callOpenAI).mockResolvedValueOnce({
        role: 'assistant',
        content: null,
        tool_calls: [mockToolCall],
      });

      vi.mocked(openaiClient.callOpenAI).mockResolvedValueOnce({
        role: 'assistant',
        content: 'John Smith has 1 order for a Laptop totaling $1299.99.',
        tool_calls: null,
      });

      const result = await askOrchestrator('Show me orders from John Smith');

      expect(dbService.queryDatabase).toHaveBeenCalledWith({
        customerName: 'John Smith',
      });
      expect(result).toContain('Laptop');
    });

    it('should handle direct responses without tool calls', async () => {
      vi.mocked(openaiClient.callOpenAI).mockResolvedValue({
        role: 'assistant',
        content: 'Hello! How can I help you today?',
        tool_calls: null,
      });

      const result = await askOrchestrator('Hello');

      expect(result).toBe('Hello! How can I help you today?');
      expect(ragService.retrieveDocumentContext).not.toHaveBeenCalled();
      expect(dbService.queryDatabase).not.toHaveBeenCalled();
    });

    it('should handle multiple tool calls in sequence', async () => {
      const ragToolCall = {
        id: 'call_1',
        type: 'function' as const,
        function: {
          name: 'retrieve_document_context',
          arguments: JSON.stringify({
            query: 'refund policy',
            topK: 4,
          }),
        },
      };

      const dbToolCall = {
        id: 'call_2',
        type: 'function' as const,
        function: {
          name: 'query_database',
          arguments: JSON.stringify({
            status: 'pending',
          }),
        },
      };

      vi.mocked(ragService.retrieveDocumentContext).mockResolvedValue(
        'Refund policy context'
      );
      vi.mocked(dbService.queryDatabase).mockResolvedValue([
        { orderId: 'ORD-002', status: 'pending' },
      ]);

      vi.mocked(openaiClient.callOpenAI)
        .mockResolvedValueOnce({
          role: 'assistant',
          content: null,
          tool_calls: [ragToolCall],
        })
        .mockResolvedValueOnce({
          role: 'assistant',
          content: null,
          tool_calls: [dbToolCall],
        })
        .mockResolvedValueOnce({
          role: 'assistant',
          content: 'Final response combining both tools',
          tool_calls: null,
        });

      const result = await askOrchestrator('Complex query needing both tools');

      expect(ragService.retrieveDocumentContext).toHaveBeenCalled();
      expect(dbService.queryDatabase).toHaveBeenCalled();
      expect(result).toContain('Final response');
    });

    it('should handle tool errors gracefully', async () => {
      const mockToolCall = {
        id: 'call_error',
        type: 'function' as const,
        function: {
          name: 'query_database',
          arguments: JSON.stringify({ customerName: 'test' }),
        },
      };

      vi.mocked(openaiClient.callOpenAI).mockResolvedValue({
        role: 'assistant',
        content: null,
        tool_calls: [mockToolCall],
      });

      vi.mocked(dbService.queryDatabase).mockRejectedValue(
        new Error('Database error')
      );

      await expect(askOrchestrator('test query')).rejects.toThrow();
    });

    it('should handle invalid tool arguments', async () => {
      const mockToolCall = {
        id: 'call_invalid',
        type: 'function' as const,
        function: {
          name: 'query_database',
          arguments: 'invalid json',
        },
      };

      vi.mocked(openaiClient.callOpenAI).mockResolvedValue({
        role: 'assistant',
        content: null,
        tool_calls: [mockToolCall],
      });

      await expect(askOrchestrator('test')).rejects.toThrow();
    });

    it('should limit conversation history to prevent token overflow', async () => {
      vi.mocked(openaiClient.callOpenAI).mockResolvedValue({
        role: 'assistant',
        content: 'Response',
        tool_calls: null,
      });

      await askOrchestrator('test query');

      const callArgs = vi.mocked(openaiClient.callOpenAI).mock.calls[0];
      const messages = callArgs[0];

      // Ensure messages array is reasonable size
      expect(messages.length).toBeLessThan(50);
    });
  });
});
