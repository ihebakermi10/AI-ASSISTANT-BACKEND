import { logger } from '@/infra/logger.js';
import { getMongoClient } from '@/infra/mongo.client.js';
import { getPineconeClient } from '@/infra/pinecone.client.js';
import { createEmbedding } from '@/infra/openai.client.js';
import { Order } from '@/domain/order.model.js';
import { ValkeyClient } from '@/infra/valkey.client.js';

/**
 * Validates all critical services on startup
 * Ensures the application is ready to serve requests
 */
export async function validateStartup(): Promise<void> {
  logger.info('Starting application validation...');

  try {
    // 1. Validate MongoDB Connection
    await validateMongoDB();

    // 2. Validate Valkey/Redis Connection
    await validateValkey();

    // 3. Validate Pinecone Connection
    await validatePinecone();

    // 4. Validate OpenAI API
    await validateOpenAI();

    logger.info('All services validated successfully! Application is ready.');
  } catch (error) {
    logger.error({ error }, 'Startup validation failed');
    throw new Error('Application startup validation failed. Please check your configuration.');
  }
}

/**
 * Validate MongoDB connection and query capability
 */
async function validateMongoDB(): Promise<void> {
  try {
    logger.info('Validating MongoDB connection...');

    const mongoClient = getMongoClient();

    if (!mongoClient.isReady()) {
      throw new Error('MongoDB client is not ready');
    }

    // Test a simple query to ensure DB is accessible
    const count = await Order.countDocuments();
    logger.info(
      {
        ordersCount: count,
        status: 'connected',
      },
      'MongoDB validated'
    );
  } catch (error) {
    logger.error({ error }, 'MongoDB validation failed');
    throw new Error(`MongoDB validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate Valkey/Redis connection
 */
async function validateValkey(): Promise<void> {
  try {
    logger.info('Validating Valkey connection...');

    const valkeyClient = ValkeyClient.getInstance();
    const client = valkeyClient.getClient();

    // Test ping
    const pong = await client.ping();

    if (pong !== 'PONG') {
      throw new Error('Valkey ping failed');
    }

    // Test set/get operations
    const testKey = '__startup_validation_test__';
    const testValue = 'ok';

    await client.set(testKey, testValue, 'EX', 10); // Expire in 10 seconds
    const retrieved = await client.get(testKey);
    await client.del(testKey);

    if (retrieved !== testValue) {
      throw new Error('Valkey set/get test failed');
    }

    logger.info('Valkey validated');
  } catch (error) {
    logger.error({ error }, 'Valkey validation failed');
    throw new Error(`Valkey validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate Pinecone connection and index accessibility
 */
async function validatePinecone(): Promise<void> {
  try {
    logger.info('Validating Pinecone connection...');

    const pineconeClient = getPineconeClient();
    const index = pineconeClient.getIndex();

    // Test index stats to ensure it's accessible
    const stats = await index.describeIndexStats();

    logger.info(
      {
        dimensions: stats.dimension,
        totalVectors: stats.totalRecordCount,
        status: 'connected',
      },
      'Pinecone validated'
    );

    if (stats.totalRecordCount === 0) {
      logger.warn('WARNING: Pinecone index is empty. Run `pnpm index-doc` to populate it.');
    }
  } catch (error) {
    logger.error({ error }, 'Pinecone validation failed');
    throw new Error(`Pinecone validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate OpenAI API connection
 */
async function validateOpenAI(): Promise<void> {
  try {
    logger.info('Validating OpenAI API connection...');

    // Create a test embedding with a short text
    const testText = 'test';
    const embedding = await createEmbedding(testText);

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('OpenAI returned invalid embedding');
    }

    logger.info(
      {
        embeddingDimensions: embedding.length,
        status: 'connected',
      },
      'OpenAI API validated'
    );
  } catch (error) {
    logger.error({ error }, 'OpenAI API validation failed');
    throw new Error(`OpenAI API validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
