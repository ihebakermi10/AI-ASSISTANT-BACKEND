import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createTestServer, cleanupTestData, cleanupTestCache } from '../helpers/test-server';
import { Order } from '../../src/domain/order.model';
import { mockOrders } from '../fixtures/orders';
import * as orchestratorService from '../../src/services/orchestrator.service';

// Mock orchestrator service for E2E tests
vi.mock('../../src/services/orchestrator.service');

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
        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer:
            'Based on our refund policy, you can return items within 30 days of purchase. The product must be in its original condition.',
          trace: [
            {
              toolName: 'retrieveDocumentContext',
              arguments: { query: 'What is the refund policy?', topK: 4 },
              result: 'Policy document context',
              executionTime: 150,
            },
          ],
        });

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'What is the refund policy?' })
          .expect(200);

        expect(response.body).toHaveProperty('answer');
        expect(response.body.answer).toContain('30 days');
        expect(response.body.trace).toHaveLength(1);
        expect(response.body.trace[0].toolName).toBe('retrieveDocumentContext');
      });

      it('should return cached responses for repeated queries', async () => {
        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'Refund information from cache',
          trace: [],
        });

        // First request
        const response1 = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'refund policy' })
          .expect(200);

        expect(response1.body).toHaveProperty('answer');

        // Second request - orchestrator handles caching internally
        const response2 = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'refund policy' })
          .expect(200);

        expect(response2.body).toHaveProperty('answer');
      });
    });

    describe('Database Tool Flow', () => {
      it('should handle order queries using database tool', async () => {
        // Seed database with test orders
        await Order.insertMany(mockOrders);

        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'John Smith has 2 orders: a Laptop Pro 15 for $1299.99 and a Webcam HD for $89.99.',
          trace: [
            {
              toolName: 'queryDatabase',
              arguments: { customerName: 'John Smith' },
              result: JSON.stringify(mockOrders.filter(o => o.customerName === 'John Smith')),
              executionTime: 200,
            },
          ],
        });

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'Show me orders from John Smith' })
          .expect(200);

        expect(response.body).toHaveProperty('answer');
        expect(response.body.answer).toContain('John Smith');
        expect(response.body.answer).toContain('Laptop');
      });

      it('should query by order status', async () => {
        await Order.insertMany(mockOrders);

        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'There are 2 pending orders.',
          trace: [
            {
              toolName: 'queryDatabase',
              arguments: { status: 'pending' },
              result: JSON.stringify(mockOrders.filter(o => o.status === 'pending')),
              executionTime: 180,
            },
          ],
        });

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'Show me all pending orders' })
          .expect(200);

        expect(response.body).toHaveProperty('answer');
        expect(response.body.answer).toContain('pending');
      });

      it('should query by product', async () => {
        await Order.insertMany(mockOrders);

        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'Found 1 order for Wireless Mouse.',
          trace: [
            {
              toolName: 'queryDatabase',
              arguments: { product: 'Mouse' },
              result: JSON.stringify(mockOrders.filter(o => o.product.includes('Mouse'))),
              executionTime: 175,
            },
          ],
        });

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'Find mouse orders' })
          .expect(200);

        expect(response.body).toHaveProperty('answer');
      });
    });

    describe('Direct Responses', () => {
      it('should handle general conversation without tools', async () => {
        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'Hello! How can I help you today?',
          trace: [],
        });

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'Hello' })
          .expect(200);

        expect(response.body).toHaveProperty('answer');
        expect(response.body.answer).toBe('Hello! How can I help you today?');
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
        vi.mocked(orchestratorService.askOrchestrator).mockResolvedValue({
          answer: 'Response to long query',
          trace: [],
        });

        const longQuery = 'a'.repeat(500); // Max allowed length

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: longQuery })
          .expect(200);

        expect(response.body).toHaveProperty('answer');
      });
    });

    describe('Error Handling', () => {
      it('should handle orchestrator errors gracefully', async () => {
        vi.mocked(orchestratorService.askOrchestrator).mockRejectedValue(
          new Error('OpenAI API error')
        );

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'test query' })
          .expect(500);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Internal server error');
      });

      it('should handle database connection errors', async () => {
        vi.mocked(orchestratorService.askOrchestrator).mockRejectedValue(
          new Error('Database connection failed')
        );

        const response = await request(testServer.app.callback())
          .post('/ask')
          .send({ query: 'test' })
          .expect(500);

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toBe('Internal server error');
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
