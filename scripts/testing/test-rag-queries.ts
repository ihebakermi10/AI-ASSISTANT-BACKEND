import 'dotenv/config';
import { createEmbedding } from '../../src/infra/openai.client.js';
import { queryPineconeIndex } from '../../src/infra/pinecone.client.js';
import { logger } from '../../src/infra/logger.js';

const testQueries = [
  // Refund policy queries
  'What does the refund policy say about cancellations?',
  'How long do I have to request a refund?',
  'Are digital products refundable?',

  // Warranty queries
  'What is covered under the warranty?',
  'How do I file a warranty claim?',
  'Is accidental damage covered by warranty?',

  // Shipping queries
  'What are the shipping options available?',
  'How much does overnight shipping cost?',
  'Do you ship internationally?',

  // Account management queries
  'How do I reset my password?',
  'What are the benefits of creating an account?',
  'Can I save multiple addresses?',

  // Support queries
  'What should I do if my device won\'t turn on?',
  'How can I contact customer support?',
  'What are your support hours?',
];

async function testRagQueries(): Promise<void> {
  try {
    logger.info({ queryCount: testQueries.length }, 'Starting RAG query tests');

    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];

      console.log(`\n${'='.repeat(80)}`);
      console.log(`Query ${i + 1}/${testQueries.length}: ${query}`);
      console.log('='.repeat(80));

      const embedding = await createEmbedding(query);
      const results = await queryPineconeIndex(embedding, 2);

      if (results.length === 0) {
        console.log('No results found');
      } else {
        results.forEach((result, index) => {
          console.log(`\n[Result ${index + 1}] Score: ${result.score.toFixed(4)}`);
          console.log(`Source: ${result.metadata?.source || 'Unknown'}`);
          console.log(`Text: ${result.metadata?.text?.substring(0, 200)}...`);
        });
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(`\n${'='.repeat(80)}`);
    logger.info('RAG query tests completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Failed to test RAG queries');
    process.exit(1);
  }
}

void testRagQueries();
