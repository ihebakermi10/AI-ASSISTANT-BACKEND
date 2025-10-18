import { tool } from '@openai/agents';
import { z } from 'zod';
import { queryDatabase } from '@/services/db.service.js';
import { parseDateRange } from '@/utils/time.js';
import { logger } from '@/infra/logger.js';

/**
 * Database Tool: Queries the order database to find specific orders
 */
export const queryDatabaseTool = tool({
  name: 'queryDatabase',
  description:
    'Queries the order database to find specific orders based on criteria. Use this tool when the user asks about specific orders, customer purchases, order history, product sales, or any transactional data.',
  parameters: z.object({
    criteria: z
      .object({
        customerName: z
          .union([z.string(), z.null()])
          .describe('Filter by customer name (case-insensitive partial match)'),
        product: z
          .union([z.string(), z.null()])
          .describe('Filter by product name (case-insensitive partial match)'),
        status: z
          .union([z.enum(['pending', 'completed', 'cancelled', 'refunded', 'shipped']), z.null()])
          .describe('Filter by order status'),
        dateRange: z
          .union([z.string(), z.null()])
          .describe('Filter by date range (e.g., "last week", "last month", "today", "yesterday")'),
      })
      .describe('Query criteria for filtering orders'),
  }),
  async execute({ criteria }) {
    logger.info({ criteria }, 'Executing queryDatabase tool');
    const startTime = Date.now();

    try {
      // Filter out null values and prepare query parameters
      const queryParams: Record<string, any> = {};

      if (criteria.customerName !== null && criteria.customerName !== undefined) {
        queryParams.customerName = criteria.customerName;
      }
      if (criteria.product !== null && criteria.product !== undefined) {
        queryParams.product = criteria.product;
      }
      if (criteria.status !== null && criteria.status !== undefined) {
        queryParams.status = criteria.status;
      }
      if (criteria.dateRange !== null && criteria.dateRange !== undefined) {
        const { startDate, endDate } = parseDateRange(criteria.dateRange);
        queryParams.dateRange = { startDate, endDate };
      }

      const results = await queryDatabase(queryParams);
      const executionTime = Date.now() - startTime;

      logger.info(
        { executionTime, resultsCount: results.length },
        'Database tool executed successfully'
      );

      // Return formatted results
      return JSON.stringify(results, null, 2);
    } catch (error) {
      logger.error({ error, criteria }, 'Database tool execution failed');
      throw new Error('Failed to query database');
    }
  },
});
