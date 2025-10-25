import 'dotenv/config';
import { mongoClient } from '../../src/infra/mongo.client.js';
import { valkeyClient } from '../../src/infra/valkey.client.js';
import { logger } from '../../src/infra/logger.js';

async function testConnections(): Promise<void> {
  logger.info('Starting connection tests...');

  try {
    // Test MongoDB
    logger.info('Testing MongoDB connection...');
    await mongoClient.connect();
    const isMongoReady = mongoClient.isReady();
    logger.info({ connected: isMongoReady }, 'MongoDB connection test result');

    // Test Valkey
    logger.info('Testing Valkey connection...');
    const valkeyPing = await valkeyClient.ping();
    logger.info({ pong: valkeyPing }, 'Valkey connection test result');

    // Test Valkey cache operations
    logger.info('Testing Valkey cache operations...');
    await valkeyClient.set('test:key', 'test-value', 10);
    const cachedValue = await valkeyClient.get<string>('test:key');
    logger.info({ cached: cachedValue }, 'Valkey cache test result');

    const exists = await valkeyClient.exists('test:key');
    logger.info({ exists }, 'Valkey exists test result');

    await valkeyClient.delete('test:key');
    logger.info('Valkey delete test completed');

    // Summary
    logger.info('All connection tests passed successfully!');

    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Connection tests failed');
    process.exit(1);
  }
}

void testConnections();
