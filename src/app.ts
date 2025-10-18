import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { koaSwagger } from 'koa2-swagger-ui';
import askRouter from '@/routes/ask.route.js';
import healthRouter from '@/routes/health.route.js';
import { swaggerSpec } from '@/config/swagger.js';
import { logger } from '@/infra/logger.js';

export function createApp(): Koa {
  const app = new Koa();

  app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    logger.info(
      {
        method: ctx.method,
        url: ctx.url,
        status: ctx.status,
        duration: ms,
      },
      'HTTP Request'
    );
  });

  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err) {
      const error = err as Error;
      logger.error({ error, url: ctx.url, method: ctx.method }, 'Unhandled error');
      ctx.status = 500;
      ctx.body = {
        error: 'Internal server error',
        message: error.message,
      };
    }
  });

  app.use(
    bodyParser({
      enableTypes: ['json'],
      jsonLimit: '1mb',
      onerror: (err, ctx) => {
        logger.error({ error: err }, 'Body parser error');
        ctx.throw(400, 'Invalid JSON in request body');
      },
    })
  );

  // Swagger documentation endpoint
  app.use(
    koaSwagger({
      routePrefix: '/docs',
      swaggerOptions: {
        spec: swaggerSpec as Record<string, unknown>,
      },
    })
  );

  // API spec endpoint (raw JSON)
  app.use(async (ctx, next) => {
    if (ctx.path === '/api-spec') {
      ctx.status = 200;
      ctx.body = swaggerSpec;
      return;
    }
    await next();
  });

  // Register routes
  app.use(healthRouter.routes());
  app.use(healthRouter.allowedMethods());

  app.use(askRouter.routes());
  app.use(askRouter.allowedMethods());

  app.use(async (ctx) => {
    ctx.status = 404;
    ctx.body = {
      error: 'Not found',
      message: `Route ${ctx.method} ${ctx.url} not found`,
    };
  });

  return app;
}
