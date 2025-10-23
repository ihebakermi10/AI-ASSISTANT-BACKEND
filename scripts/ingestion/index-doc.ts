import 'dotenv/config';
import { createEmbedding } from '../../src/infra/openai.client.js';
import { upsertToPinecone } from '../../src/infra/pinecone.client.js';
import { logger } from '../../src/infra/logger.js';

const sampleDocument = {
  title: 'Refund and Cancellation Policy',
  content: `
REFUND POLICY

1. General Refund Terms
Customers are eligible for a full refund within 30 days of purchase if the product is defective or not as described.
All refund requests must be submitted through our customer portal or by contacting support@example.com.

2. Eligibility Criteria
- Product must be in original condition with all accessories and packaging
- Proof of purchase (order number or receipt) is required
- Products purchased during promotional sales may have different refund terms
- Custom or personalized items are non-refundable

3. Refund Processing Time
Once we receive your return, refunds are typically processed within 5-7 business days.
The refund will be issued to the original payment method.
Please allow an additional 3-5 business days for the refund to appear in your account.

4. Exceptions
The following items are not eligible for refund:
- Digital products after download
- Gift cards
- Final sale items marked as clearance

CANCELLATION POLICY

1. Order Cancellations
Orders can be cancelled free of charge within 24 hours of placement.
After 24 hours, a 10% cancellation fee may apply if the order has been processed.

2. How to Cancel
Log into your account and navigate to Order History.
Select the order you wish to cancel and click "Cancel Order".
You will receive a confirmation email once the cancellation is processed.

3. Shipping and Cancelled Orders
If your order has already shipped, you cannot cancel it.
Instead, you may refuse delivery or follow our return process once received.

CONTACT INFORMATION

For questions about refunds or cancellations, please contact:
- Email: support@example.com
- Phone: 1-800-123-4567
- Hours: Monday-Friday, 9 AM - 6 PM EST
`,
};

function chunkText(text: string, maxChunkSize: number = 500): string[] {
  const sentences = text.split(/[.!?]\s+/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxChunkSize) {
      currentChunk += sentence + '. ';
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence + '. ';
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function indexDocument(): Promise<void> {
  try {
    logger.info('Starting document indexing...');

    const chunks = chunkText(sampleDocument.content);
    logger.info({ chunkCount: chunks.length }, 'Document split into chunks');

    const vectors: Array<{
      id: string;
      values: number[];
      metadata: Record<string, any>;
    }> = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      logger.info({ index: i + 1, total: chunks.length }, 'Processing chunk');

      const embedding = await createEmbedding(chunk);

      vectors.push({
        id: `${sampleDocument.title.toLowerCase().replace(/\s+/g, '-')}-chunk-${i}`,
        values: embedding,
        metadata: {
          text: chunk,
          source: sampleDocument.title,
          chunkIndex: i,
          totalChunks: chunks.length,
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    await upsertToPinecone(vectors);

    logger.info(
      {
        documentTitle: sampleDocument.title,
        vectorCount: vectors.length,
      },
      'Document indexed successfully'
    );

    logger.info('Document indexing completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Failed to index document');
    process.exit(1);
  }
}

void indexDocument();
