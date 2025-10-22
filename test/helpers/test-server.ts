import type Koa from 'koa';
import { createApp } from '../../src/app';
import { mongoClient } from '../../src/infra/mongo.client';
import { valkeyClient } from '../../src/infra/valkey.client';

export interface TestServer {
  app: Koa;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * Create a test server instance for integration and E2E tests
 */
export const createTestServer = (): TestServer => {
  const app = createApp();
  let server: ReturnType<Koa['listen']> | null = null;

  const start = async () => {
    // Connect to test databases
    await mongoClient.connect();
    // ValkeyClient auto-connects on instantiation (lazyConnect: false)
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Start server on random port for testing
    const port = Math.floor(Math.random() * 10000) + 50000;
    server = app.listen(port);
  };

  const stop = async () => {
    // Close server
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Disconnect from databases
    await mongoClient.disconnect();
    await valkeyClient.disconnect();
  };

  return { app, start, stop };
};

/**
 * Clean up test data from MongoDB
 */
export const cleanupTestData = async () => {
  // Use mongoose connection to drop database
  const mongoose = mongoClient.getConnection();
  if (mongoose.connection.db) {
    await mongoose.connection.db.dropDatabase();
  }
};

/**
 * Clean up test data from Valkey cache
 */
export const cleanupTestCache = async () => {
  await valkeyClient.flush();
};
