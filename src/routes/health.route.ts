import Router from '@koa/router';
import { mongoClient } from '@/infra/mongo.client.js';
import { valkeyClient } from '@/infra/valkey.client.js';

const router = new Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check if the API server is running and all dependencies are healthy
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-10-17T00:00:00.000Z"
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                   example: 3600
 *                 dependencies:
 *                   type: object
 *                   properties:
 *                     mongodb:
 *                       type: string
 *                       enum: [connected, disconnected]
 *                     valkey:
 *                       type: string
 *                       enum: [connected, disconnected]
 */
router.get('/health', async (ctx) => {
  const mongoStatus = mongoClient.isReady() ? 'connected' : 'disconnected';

  let valkeyStatus = 'disconnected';
  try {
    const ping = await valkeyClient.ping();
    valkeyStatus = ping ? 'connected' : 'disconnected';
  } catch {
    valkeyStatus = 'disconnected';
  }

  ctx.status = 200;
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      mongodb: mongoStatus,
      valkey: valkeyStatus,
    },
  };
});

/**
 * @openapi
 * /:
 *   get:
 *     summary: API welcome endpoint
 *     description: Returns basic information about the API
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Welcome message with API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "AI Assistant API"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 description:
 *                   type: string
 *                 documentation:
 *                   type: string
 *                   example: "/docs"
 */
router.get('/', async (ctx) => {
  ctx.status = 200;
  ctx.body = {
    name: 'AI Assistant API',
    version: '1.0.0',
    description: 'AI-powered backend with OpenAI function calling, RAG (Pinecone), and Database (MongoDB) tools',
    documentation: '/docs',
    endpoints: {
      ask: 'POST /ask - Ask the AI Assistant a question',
      health: 'GET /health - Health check',
      docs: 'GET /docs - API documentation (Swagger UI)',
    },
  };
});

export default router;
