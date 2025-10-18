import { tool } from '@openai/agents';
import { z } from 'zod';
import { retrieveDocumentContext } from '@/services/rag.service.js';
import { logger } from '@/infra/logger.js';

/**
 * RAG Tool: Retrieves relevant context from documents using semantic search
 */
export const retrieveDocumentContextTool = tool({
  name: 'retrieveDocumentContext',
  description:
    'Retrieves relevant context from documents using semantic search. Use this tool when the user asks questions about policies, documentation, guidelines, refund procedures, product manuals, or any information that would be found in company documents.',
  parameters: z.object({
    query: z.string().describe('The search query to find relevant document context'),
    topK: z
      .number()
      .optional()
      .default(4)
      .describe('Number of top results to retrieve (default: 4)'),
  }),
  async execute({ query, topK }) {
    logger.info({ query, topK }, 'Executing retrieveDocumentContext tool');
    const startTime = Date.now();

    try {
      const context = await retrieveDocumentContext(query, topK);
      const executionTime = Date.now() - startTime;

      logger.info({ executionTime, contextLength: context.length }, 'RAG tool executed successfully');

      return context;
    } catch (error) {
      logger.error({ error, query }, 'RAG tool execution failed');
      throw new Error('Failed to retrieve document context');
    }
  },
});
