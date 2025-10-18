import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retrieveDocumentContext } from '../../../src/services/rag.service';
import * as openaiClient from '../../../src/infra/openai.client';
import * as pineconeClient from '../../../src/infra/pinecone.client';
import { embeddingCache } from '../../../src/utils/cache';

vi.mock('../../../src/infra/openai.client');
vi.mock('../../../src/infra/pinecone.client');
vi.mock('../../../src/utils/cache');

describe('RAG Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('retrieveDocumentContext', () => {
    it('should retrieve document context successfully', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockMatches = [
        {
          id: 'doc-1',
          score: 0.9,
          metadata: {
            text: 'Sample context about refund policy',
            source: 'Refund Policy',
          },
        },
        {
          id: 'doc-2',
          score: 0.85,
          metadata: {
            text: 'Additional information about refunds',
            source: 'Refund Policy',
          },
        },
      ];

      vi.mocked(embeddingCache.get).mockResolvedValue(null);
      vi.mocked(openaiClient.createEmbedding).mockResolvedValue(mockEmbedding);
      vi.mocked(pineconeClient.queryPineconeIndex).mockResolvedValue(mockMatches);
      vi.mocked(embeddingCache.set).mockResolvedValue(true);

      const result = await retrieveDocumentContext('What is the refund policy?', 4);

      expect(result).toContain('Sample context about refund policy');
      expect(result).toContain('Additional information about refunds');
      expect(openaiClient.createEmbedding).toHaveBeenCalledWith('What is the refund policy?');
      expect(pineconeClient.queryPineconeIndex).toHaveBeenCalledWith(mockEmbedding, 4);
    });

    it('should use cached embedding when available', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockMatches = [
        {
          id: 'doc-1',
          score: 0.9,
          metadata: {
            text: 'Cached context',
            source: 'Test Source',
          },
        },
      ];

      vi.mocked(embeddingCache.get).mockResolvedValue(mockEmbedding);
      vi.mocked(pineconeClient.queryPineconeIndex).mockResolvedValue(mockMatches);

      await retrieveDocumentContext('test query', 4);

      expect(embeddingCache.get).toHaveBeenCalledWith('test query');
      expect(openaiClient.createEmbedding).not.toHaveBeenCalled();
      expect(pineconeClient.queryPineconeIndex).toHaveBeenCalledWith(mockEmbedding, 4);
    });

    it('should filter out low-score matches', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];
      const mockMatches = [
        {
          id: 'doc-1',
          score: 0.9,
          metadata: {
            text: 'High score match',
            source: 'Source 1',
          },
        },
        {
          id: 'doc-2',
          score: 0.5, // Below 0.7 threshold
          metadata: {
            text: 'Low score match',
            source: 'Source 2',
          },
        },
      ];

      vi.mocked(embeddingCache.get).mockResolvedValue(null);
      vi.mocked(openaiClient.createEmbedding).mockResolvedValue(mockEmbedding);
      vi.mocked(pineconeClient.queryPineconeIndex).mockResolvedValue(mockMatches);
      vi.mocked(embeddingCache.set).mockResolvedValue(true);

      const result = await retrieveDocumentContext('test', 4);

      expect(result).toContain('High score match');
      expect(result).not.toContain('Low score match');
    });

    it('should return message when no matches found', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3];

      vi.mocked(embeddingCache.get).mockResolvedValue(null);
      vi.mocked(openaiClient.createEmbedding).mockResolvedValue(mockEmbedding);
      vi.mocked(pineconeClient.queryPineconeIndex).mockResolvedValue([]);
      vi.mocked(embeddingCache.set).mockResolvedValue(true);

      const result = await retrieveDocumentContext('test', 4);

      expect(result).toBe('No relevant document context found for the query.');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(embeddingCache.get).mockRejectedValue(new Error('Cache error'));

      await expect(retrieveDocumentContext('test', 4)).rejects.toThrow(
        'Failed to retrieve document context'
      );
    });
  });
});
