import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import { koaSwagger } from 'koa2-swagger-ui';
import askRouter from '@/routes/ask.route.js';
import healthRouter from '@/routes/health.route.js';
import { swaggerSpec } from '@/config/swagger.js';
import { logger } from '@/infra/logger.js';
import { env } from '@/config/env.js';

export function createApp(): Koa {
  const app = new Koa();

  // CORS middleware - Enable for all origins in staging/development
  // In production, restrict to specific domains
  app.use(
    cors({
      origin: (ctx: Koa.Context) => {
        // Allow all origins in development and staging
        if (env.NODE_ENV === 'development' || env.NODE_ENV === 'staging') {
          return ctx.get('Origin') || '*';
        }
        // In production, allow only specific domains
        const allowedOrigins = [
          env.PUBLIC_URL,
          'http://localhost:3000',
          'http://127.0.0.1:3000',
        ].filter(Boolean) as string[];

        const origin = ctx.get('Origin');
        if (allowedOrigins.includes(origin)) {
          return origin;
        }
        return allowedOrigins[0] || '*';
      },
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
      exposeHeaders: ['Content-Length', 'Date', 'X-Request-Id'],
    })
  );

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
        // Enable "Try it out" by default
        defaultModelsExpandDepth: '1',
        defaultModelExpandDepth: '1',
        docExpansion: 'list',
        filter: true as any,
        showRequestHeaders: true as any,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        // Auto-select first server (ngrok URL in staging)
        tryItOutEnabled: true as any,
      },
      hideTopbar: false,
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

  // Register routes with v1 prefix
  app.use(healthRouter.routes());
  app.use(healthRouter.allowedMethods());

  // API v1 routes
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
