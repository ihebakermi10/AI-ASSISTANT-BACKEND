import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestServer, cleanupTestData, cleanupTestCache } from '../helpers/test-server';
import { Order } from '../../src/domain/order.model';
import { mockOrders } from '../fixtures/orders';
import * as openaiClient from '../../src/infra/openai.client';
import * as pineconeClient from '../../src/infra/pinecone.client';
import { mockEmbedding, mockPineconeMatches } from '../fixtures/embeddings';

// Mock external services
vi.mock('../../src/infra/openai.client');
vi.mock('../../src/infra/pinecone.client');

describe('E2E: /ask Endpoint', () => {
  const testServer = createTestServer();

  beforeAll(async () => {
    await testServer.start();
  });

  afterAll(async () => {
    await testServer.stop();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanupTestData();
    await cleanupTestCache();
  });

  describe('POST /ask', () => {
    describe('RAG Tool Flow', () => {
      it('should handle document-based questions using RAG', async () => {
        // Mock OpenAI to call retrieve_document_context tool
        const ragToolCall = {
          id: 'call_rag_123',
          type: 'function' as const,
          function: {
            name: 'retrieve_document_context',
            arguments: JSON.stringify({
              query: 'What is the refund policy?',
              topK: 4,
            }),
          },
        };

        vi.mocked(openaiClient.callOpenAI)
          .mockResolvedValueOnce({
            role: 'assistant',
            content: null,
            tool_calls: [ragToolCall],
          })
          .mockResolvedValueOnce({
            role: 'assistant',
            content:
              'Based on our refund policy, you can return items within 30 days of purchase. The product must be in its original condition.',
            tool_calls: null,
          });

        vi.mocked(openaiClient.createEmbedding).mockResolvedValue(mockEmbedding());
        vi.mocked(pineconeClient.queryPineconeIndex).mockResolvedValue(
          mockPineconeMatches()
        );

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'What is the refund policy?' })
          .expect(200);

        expect(response.body).toHaveProperty('response');
        expect(response.body.response).toContain('30 days');
        expect(openaiClient.createEmbedding).toHaveBeenCalled();
        expect(pineconeClient.queryPineconeIndex).toHaveBeenCalled();
      });

      it('should cache embeddings for repeated queries', async () => {
        const ragToolCall = {
          id: 'call_rag_cache',
          type: 'function' as const,
          function: {
            name: 'retrieve_document_context',
            arguments: JSON.stringify({
              query: 'refund policy',
              topK: 4,
            }),
          },
        };

        vi.mocked(openaiClient.callOpenAI)
          .mockResolvedValueOnce({
            role: 'assistant',
            content: null,
            tool_calls: [ragToolCall],
          })
          .mockResolvedValueOnce({
            role: 'assistant',
            content: 'Refund information',
            tool_calls: null,
          });

        vi.mocked(openaiClient.createEmbedding).mockResolvedValue(mockEmbedding());
        vi.mocked(pineconeClient.queryPineconeIndex).mockResolvedValue(
          mockPineconeMatches()
        );

        // First request
        await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'refund policy' })
          .expect(200);

        expect(openaiClient.createEmbedding).toHaveBeenCalledTimes(1);

        // Reset mocks for second request
        vi.mocked(openaiClient.callOpenAI)
          .mockResolvedValueOnce({
            role: 'assistant',
            content: null,
            tool_calls: [ragToolCall],
          })
          .mockResolvedValueOnce({
            role: 'assistant',
            content: 'Refund information',
            tool_calls: null,
          });

        // Second request - should use cached embedding
        await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'refund policy' })
          .expect(200);

        // createEmbedding should not be called again (still 1 time total)
        expect(openaiClient.createEmbedding).toHaveBeenCalledTimes(1);
      });
    });

    describe('Database Tool Flow', () => {
      it('should handle order queries using database tool', async () => {
        // Seed database with test orders
        await Order.insertMany(mockOrders);

        const dbToolCall = {
          id: 'call_db_123',
          type: 'function' as const,
          function: {
            name: 'query_database',
            arguments: JSON.stringify({
              customerName: 'John Smith',
            }),
          },
        };

        vi.mocked(openaiClient.callOpenAI)
          .mockResolvedValueOnce({
            role: 'assistant',
            content: null,
            tool_calls: [dbToolCall],
          })
          .mockResolvedValueOnce({
            role: 'assistant',
            content: 'John Smith has 2 orders: a Laptop Pro 15 for $1299.99 and a Webcam HD for $89.99.',
            tool_calls: null,
          });

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'Show me orders from John Smith' })
          .expect(200);

        expect(response.body).toHaveProperty('response');
        expect(response.body.response).toContain('John Smith');
        expect(response.body.response).toContain('Laptop');
      });

      it('should query by order status', async () => {
        await Order.insertMany(mockOrders);

        const dbToolCall = {
          id: 'call_db_status',
          type: 'function' as const,
          function: {
            name: 'query_database',
            arguments: JSON.stringify({
              status: 'pending',
            }),
          },
        };

        vi.mocked(openaiClient.callOpenAI)
          .mockResolvedValueOnce({
            role: 'assistant',
            content: null,
            tool_calls: [dbToolCall],
          })
          .mockResolvedValueOnce({
            role: 'assistant',
            content: 'There are 2 pending orders.',
            tool_calls: null,
          });

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'Show me all pending orders' })
          .expect(200);

        expect(response.body).toHaveProperty('response');
        expect(response.body.response).toContain('pending');
      });

      it('should query by product', async () => {
        await Order.insertMany(mockOrders);

        const dbToolCall = {
          id: 'call_db_product',
          type: 'function' as const,
          function: {
            name: 'query_database',
            arguments: JSON.stringify({
              product: 'Mouse',
            }),
          },
        };

        vi.mocked(openaiClient.callOpenAI)
          .mockResolvedValueOnce({
            role: 'assistant',
            content: null,
            tool_calls: [dbToolCall],
          })
          .mockResolvedValueOnce({
            role: 'assistant',
            content: 'Found 1 order for Wireless Mouse.',
            tool_calls: null,
          });

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'Find mouse orders' })
          .expect(200);

        expect(response.body).toHaveProperty('response');
      });
    });

    describe('Direct Responses', () => {
      it('should handle general conversation without tools', async () => {
        vi.mocked(openaiClient.callOpenAI).mockResolvedValue({
          role: 'assistant',
          content: 'Hello! How can I help you today?',
          tool_calls: null,
        });

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'Hello' })
          .expect(200);

        expect(response.body).toHaveProperty('response');
        expect(response.body.response).toBe('Hello! How can I help you today?');
      });
    });

    describe('Validation', () => {
      it('should reject requests without query', async () => {
        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({})
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should reject empty query strings', async () => {
        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: '' })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should reject non-string queries', async () => {
        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 123 })
          .expect(400);

        expect(response.body).toHaveProperty('error');
      });

      it('should handle very long queries', async () => {
        vi.mocked(openaiClient.callOpenAI).mockResolvedValue({
          role: 'assistant',
          content: 'Response to long query',
          tool_calls: null,
        });

        const longQuery = 'a'.repeat(5000);

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: longQuery })
          .expect(200);

        expect(response.body).toHaveProperty('response');
      });
    });

    describe('Error Handling', () => {
      it('should handle OpenAI API errors gracefully', async () => {
        vi.mocked(openaiClient.callOpenAI).mockRejectedValue(
          new Error('OpenAI API error')
        );

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'test query' })
          .expect(500);

        expect(response.body).toHaveProperty('error');
      });

      it('should handle database connection errors', async () => {
        const dbToolCall = {
          id: 'call_db_error',
          type: 'function' as const,
          function: {
            name: 'query_database',
            arguments: JSON.stringify({ customerName: 'test' }),
          },
        };

        vi.mocked(openaiClient.callOpenAI).mockResolvedValue({
          role: 'assistant',
          content: null,
          tool_calls: [dbToolCall],
        });

        // Force database error by closing connection
        await testServer.stop();

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'test' })
          .expect(500);

        expect(response.body).toHaveProperty('error');

        // Restart server
        await testServer.start();
      });
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(testServer.app.callback())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('dependencies');
      expect(response.body.dependencies).toHaveProperty('mongodb');
      expect(response.body.dependencies).toHaveProperty('valkey');
    });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(testServer.app.callback())
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(testServer.app.callback())
        .get('/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
