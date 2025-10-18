import { Pinecone } from '@pinecone-database/pinecone';
import { env } from '@/config/env.js';
import { logger } from './logger.js';

class PineconeClientWrapper {
  private static instance: PineconeClientWrapper | null = null;
  private client: Pinecone | null = null;

  private constructor() {}

  public static getInstance(): PineconeClientWrapper {
    if (!PineconeClientWrapper.instance) {
      PineconeClientWrapper.instance = new PineconeClientWrapper();
    }
    return PineconeClientWrapper.instance;
  }

  public getClient(): Pinecone {
    if (!this.client) {
      this.client = new Pinecone({
        apiKey: env.PINECONE_API_KEY,
      });
      logger.info('Pinecone client initialized');
    }
    return this.client;
  }

  public getIndex() {
    return this.getClient().index(env.PINECONE_INDEX);
  }
}

export function getPineconeClient(): PineconeClientWrapper {
  return PineconeClientWrapper.getInstance();
}

// Legacy function for backwards compatibility
export function getPineconeRawClient(): Pinecone {
  return PineconeClientWrapper.getInstance().getClient();
}

export interface PineconeMatch {
  id: string;
  score: number;
  metadata?: Record<string, any>;
}

export async function queryPineconeIndex(
  embedding: number[],
  topK: number = 4
): Promise<PineconeMatch[]> {
  const pinecone = getPineconeClient();

  try {
    const index = pinecone.getIndex();

    const queryResponse = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true,
    });

    const matches: PineconeMatch[] =
      queryResponse.matches?.map((match) => ({
        id: match.id,
        score: match.score ?? 0,
        metadata: match.metadata,
      })) ?? [];

    logger.info(
      {
        matchCount: matches.length,
        topScore: matches[0]?.score,
      },
      'Pinecone query completed'
    );

    return matches;
  } catch (error: any) {
    console.error('PINECONE ERROR DETAILS:', {
      message: error?.message,
      name: error?.name,
      cause: error?.cause,
      status: error?.status,
      data: error?.data,
      stack: error?.stack,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
    logger.error(
      {
        error: {
          message: error?.message,
          name: error?.name,
          cause: error?.cause,
          status: error?.status,
          data: error?.data,
        },
        topK,
      },
      'Failed to query Pinecone index'
    );
    throw error;
  }
}

export async function upsertToPinecone(
  vectors: Array<{
    id: string;
    values: number[];
    metadata?: Record<string, any>;
  }>
): Promise<void> {
  const pinecone = getPineconeClient();

  try {
    const index = pinecone.getIndex();

    await index.upsert(vectors);

    logger.info({ vectorCount: vectors.length }, 'Vectors upserted to Pinecone');
  } catch (error) {
    logger.error({ error, vectorCount: vectors.length }, 'Failed to upsert to Pinecone');
    throw new Error('Failed to upsert vectors to Pinecone');
  }
}
