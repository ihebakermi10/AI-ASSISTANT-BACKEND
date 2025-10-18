import { createApp } from './app.js';
import { connectToMongo } from '@/infra/mongo.client.js';
import { logger } from '@/infra/logger.js';
import { env } from '@/config/env.js';
import { validateStartup } from '@/utils/startup-validation.js';

export async function startServer(): Promise<void> {
  try {
    // Step 1: Connect to MongoDB
    logger.info('Starting server initialization...');
    await connectToMongo();

    // Step 2: Validate all services
    await validateStartup();

    // Step 3: Create and start the HTTP server
    const app = createApp();
    const port = parseInt(env.PORT, 10);

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
