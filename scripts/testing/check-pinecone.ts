import 'dotenv/config';
import { getPineconeClient } from '../../src/infra/pinecone.client.js';
import { logger } from '../../src/infra/logger.js';
import { env } from '../../src/config/env.js';

async function checkPinecone(): Promise<void> {
  try {
    logger.info('Checking Pinecone configuration...');
    logger.info({ index: env.PINECONE_INDEX }, 'Using index');

    const pinecone = getPineconeClient();
    const index = pinecone.getIndex();

    // Try to get index stats
    const stats = await index.describeIndexStats();

    logger.info({ stats }, 'Pinecone index stats');

    // Check if index is empty
    if (stats.totalRecordCount === 0) {
      logger.warn('Index is empty - no vectors found');
    } else {
      logger.info({ vectorCount: stats.totalRecordCount }, 'Vectors in index');
    }

    process.exit(0);
  } catch (error: any) {
    logger.error({ error: error.message, name: error.name }, 'Failed to check Pinecone');
    process.exit(1);
  }
}

void checkPinecone();
