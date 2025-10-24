import 'dotenv/config';
import { createEmbedding } from '../../src/infra/openai.client.js';
import { queryPineconeIndex } from '../../src/infra/pinecone.client.js';
import { logger } from '../../src/infra/logger.js';

async function testQuery(): Promise<void> {
  try {
    const testQuestions = [
      'What is the refund policy?',
      'How long does it take to process a refund?',
      'Can I cancel my order?',
    ];

    for (const question of testQuestions) {
      logger.info({ question }, 'Testing query');

      const embedding = await createEmbedding(question);
      const results = await queryPineconeIndex(embedding, 3);

      logger.info({ resultCount: results.length }, 'Query results');

      results.forEach((result, index) => {
        logger.info(
          {
            rank: index + 1,
            score: result.score,
            text: result.metadata?.text?.substring(0, 100),
          },
          'Result'
        );
      });

      console.log('\n---\n');
    }

    logger.info('Query test completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Failed to test query');
    process.exit(1);
  }
}

void testQuery();
