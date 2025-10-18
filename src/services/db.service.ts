import { Order } from '@/domain/order.model.js';
import { DatabaseQueryCriteria } from '@/domain/types.js';
import { parseDateRange } from '@/utils/time.js';
import { logger } from '@/infra/logger.js';

function sanitizeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function queryDatabase(criteria: DatabaseQueryCriteria): Promise<any[]> {
  const startTime = Date.now();

  try {
    const filter: Record<string, any> = {};

    if (criteria.customerName) {
      const sanitized = sanitizeRegex(criteria.customerName);
      filter.customerName = { $regex: new RegExp(sanitized, 'i') };
    }

    if (criteria.product) {
      const sanitized = sanitizeRegex(criteria.product);
      filter.product = { $regex: new RegExp(sanitized, 'i') };
    }

    if (criteria.status) {
      filter.status = criteria.status.toLowerCase();
    }

    if (criteria.dateRange) {
      try {
        const { startDate, endDate } = parseDateRange(criteria.dateRange);
        filter.orderDate = {
          $gte: startDate,
          $lte: endDate,
        };
      } catch (error) {
        logger.warn({ dateRange: criteria.dateRange, error }, 'Failed to parse date range');
      }
    }

    const orders = await Order.find(filter)
      .sort({ orderDate: -1 })
      .limit(50)
      .lean()
      .exec();

    const executionTime = Date.now() - startTime;

    logger.info(
      {
        criteria,
        filter,
        resultCount: orders.length,
        executionTime,
      },
      'Database Tool executed'
    );

    return orders;
  } catch (error) {
    logger.error({ error, criteria }, 'Failed to query database');
    throw new Error('Failed to query database');
  }
}
