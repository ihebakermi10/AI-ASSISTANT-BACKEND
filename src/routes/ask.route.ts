import Router from '@koa/router';
import { handleAsk } from '@/controllers/ask.controller.js';

const router = new Router();

/**
 * @openapi
 * /ask:
 *   post:
 *     summary: Ask the AI Assistant a question
 *     description: |
 *       Send a natural language query to the AI Assistant. The system uses OpenAI function calling
 *       to intelligently route your question to the appropriate tool:
 *
 *       - **RAG Tool**: For questions about policies, documentation, refunds, cancellations
 *       - **Database Tool**: For questions about orders, customers, transactions
 *
 *       The AI will automatically select the best tool, execute it, and return a comprehensive answer.
 *     tags:
 *       - AI Assistant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 description: Your natural language question
 *                 example: "Show me all orders from Sarah Johnson last week"
 *           examples:
 *             ragQuery:
 *               summary: Document/Policy Question (RAG Tool)
 *               value:
 *                 query: "What is the refund policy for defective products?"
 *             databaseQuery:
 *               summary: Order/Customer Question (Database Tool)
 *               value:
 *                 query: "Show me all orders from Sarah Johnson"
 *             aggregateQuery:
 *               summary: Aggregate Question (Database Tool)
 *               value:
 *                 query: "How many completed orders do we have and what's the total revenue?"
 *     responses:
 *       200:
 *         description: Successful response with AI-generated answer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                   description: The original user query
 *                   example: "Show me all orders from Sarah Johnson"
 *                 answer:
 *                   type: string
 *                   description: AI-generated answer based on tool results
 *                   example: "Sarah Johnson placed 2 orders:\n\n1. Order ORD-2025-002..."
 *                 trace:
 *                   type: array
 *                   description: Execution trace showing which tools were called
 *                   items:
 *                     type: object
 *                     properties:
 *                       toolName:
 *                         type: string
 *                         enum: [retrieveDocumentContext, queryDatabase]
 *                         description: Name of the tool that was executed
 *                       arguments:
 *                         type: object
 *                         description: Arguments passed to the tool
 *                       result:
 *                         type: string
 *                         description: Preview of tool result (truncated to 500 chars)
 *                       executionTime:
 *                         type: number
 *                         description: Tool execution time in milliseconds
 *             examples:
 *               ragResponse:
 *                 summary: RAG Tool Response
 *                 value:
 *                   query: "What is the refund policy for defective products?"
 *                   answer: "According to our refund policy, customers are eligible for a full refund within 30 days of purchase if the product is defective or not as described..."
 *                   trace:
 *                     - toolName: "retrieveDocumentContext"
 *                       arguments:
 *                         query: "What is the refund policy for defective products?"
 *                         topK: 4
 *                       result: "[Context 1] (Score: 0.89, Source: Refund and Cancellation Policy)..."
 *                       executionTime: 856
 *               databaseResponse:
 *                 summary: Database Tool Response
 *                 value:
 *                   query: "Show me all orders from Sarah Johnson"
 *                   answer: "Sarah Johnson placed 2 orders..."
 *                   trace:
 *                     - toolName: "queryDatabase"
 *                       arguments:
 *                         criteria:
 *                           customerName: "Sarah Johnson"
 *                       result: "[{\"orderId\": \"ORD-2025-002\"...}]"
 *                       executionTime: 234
 *       400:
 *         description: Bad request - Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Validation failed"
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal server error"
 *                 message:
 *                   type: string
 */
router.post('/ask', handleAsk);

export default router;
