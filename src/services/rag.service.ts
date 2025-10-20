import { createEmbedding } from '@/infra/openai.client.js';
import { queryPineconeIndex, PineconeMatch } from '@/infra/pinecone.client.js';
import { embeddingCache } from '@/utils/cache.js';
import { logger } from '@/infra/logger.js';

export async function retrieveDocumentContext(query: string, topK: number = 4): Promise<string> {
  const startTime = Date.now();

  try {
    let embedding: number[];

    const cachedEmbedding = await embeddingCache.get(query);
    if (cachedEmbedding) {
      embedding = cachedEmbedding;
      logger.info({ query: query.substring(0, 50) }, 'Using cached embedding from Valkey');
    } else {
      embedding = await createEmbedding(query);
      await embeddingCache.set(query, embedding);
      logger.info({ query: query.substring(0, 50) }, 'Created new embedding and cached in Valkey');
    }

    const matches: PineconeMatch[] = await queryPineconeIndex(embedding, topK);

    if (matches.length === 0) {
      logger.warn({ query }, 'No matches found in Pinecone');
      return 'No relevant document context found for the query.';
    }

    const contextSnippets = matches
      .filter((match) => match.score > 0.5)
      .map((match, index) => {
        const text = match.metadata?.text || match.metadata?.content || 'No content available';
        const source = match.metadata?.source || 'Unknown source';
        return `[Context ${index + 1}] (Score: ${match.score.toFixed(2)}, Source: ${source})\n${text}`;
      });

    if (contextSnippets.length === 0) {
      return 'No highly relevant document context found (all scores below threshold).';
    }

    const result = contextSnippets.join('\n\n---\n\n');

    const executionTime = Date.now() - startTime;
    logger.info(
      {
        query: query.substring(0, 50),
        matchCount: matches.length,
        relevantCount: contextSnippets.length,
        executionTime,
        topScore: matches[0]?.score,
      },
      'RAG Tool executed'
    );

    return result;
  } catch (error) {
    logger.error({ error, query }, 'Failed to retrieve document context');
    throw new Error('Failed to retrieve document context');
  }
}
