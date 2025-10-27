import { createApp } from './app.js';
import { connectToMongo } from '@/infra/mongo.client.js';
import { initializeValkeyClient } from '@/infra/valkey.client.js';
import { logger } from '@/infra/logger.js';
import { env } from '@/config/env.js';
import { validateStartup } from '@/utils/startup-validation.js';

export async function startServer(): Promise<void> {
  try {
    logger.info('Starting server initialization...');

    // Step 1: Initialize Valkey client (one time, at startup)
    await initializeValkeyClient();

    // Step 2: Connect to MongoDB
    await connectToMongo();

    // Step 3: Validate all services
    await validateStartup();

    // Step 4: Create and start the HTTP server
    const app = createApp();
    const port = parseInt(env.HOST_API_PORT, 10);

    app.listen(port, () => {
      logger.info(
        {
          port,
          env: env.NODE_ENV,
          openaiModel: env.OPENAI_MODEL,
        },
        'Server started successfully and ready to accept requests!'
      );
      logger.info(`API available at: http://localhost:${port}/ask`);
      logger.info(`API docs available at: http://localhost:${port}/docs`);
    });
  } catch (error) {
    logger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to start server'
    );
    process.exit(1);
  }
}
