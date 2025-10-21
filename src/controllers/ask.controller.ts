import { Context } from 'koa';
import { AskRequestSchema, AskResponse } from '@/domain/types.js';
import { askOrchestrator } from '@/services/orchestrator.service.js';
import { logger } from '@/infra/logger.js';
import { z } from 'zod';

export async function handleAsk(ctx: Context): Promise<void> {
  try {
    const validationResult = AskRequestSchema.safeParse(ctx.request.body);

    if (!validationResult.success) {
      ctx.status = 400;
      ctx.body = {
        error: 'Validation failed',
        details: validationResult.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      };
      return;
    }

    const { query } = validationResult.data;

    logger.info({ query, ip: ctx.ip }, 'Received /ask request');

    const result = await askOrchestrator(query);

    const response: AskResponse = {
      query,
      answer: result.answer,
      trace: result.trace,
    };

    ctx.status = 200;
    ctx.body = response;

    logger.info(
      {
        query,
        toolUsed: result.trace[0]?.toolName,
        answerLength: result.answer.length,
      },
      'Request completed successfully'
    );
  } catch (error) {
    logger.error({ error, body: ctx.request.body }, 'Request failed');

    if (error instanceof z.ZodError) {
      ctx.status = 400;
      ctx.body = {
        error: 'Validation error',
        details: error.issues,
      };
      return;
    }

    ctx.status = 500;
    ctx.body = {
      error: 'Internal server error',
      message: 'An unexpected error occurred',
    };
  }
}
