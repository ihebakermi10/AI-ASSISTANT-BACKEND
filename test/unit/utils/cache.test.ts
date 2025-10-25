import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValkeyCache } from '../../../src/utils/cache';
import { valkeyClient } from '../../../src/infra/valkey.client';

vi.mock('../../../src/infra/valkey.client', () => ({
  valkeyClient: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
  },
}));

describe('Cache Utilities', () => {
  describe('ValkeyCache', () => {
    let cache: ValkeyCache<{ name: string; value: number }>;

    beforeEach(() => {
      vi.clearAllMocks();
      cache = new ValkeyCache('test', 3600);
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    describe('get', () => {
      it('should retrieve and parse cached data', async () => {
        const mockData = { name: 'test', value: 123 };
        vi.mocked(valkeyClient.get).mockResolvedValue(mockData);

        const result = await cache.get('key1');

        expect(result).toEqual(mockData);
        expect(valkeyClient.get).toHaveBeenCalledWith('test:key1');
      });

      it('should return null when cache misses', async () => {
        vi.mocked(valkeyClient.get).mockResolvedValue(null);

        const result = await cache.get('nonexistent');

        expect(result).toBeNull();
        expect(valkeyClient.get).toHaveBeenCalledWith('test:nonexistent');
      });

      it('should handle errors gracefully', async () => {
        vi.mocked(valkeyClient.get).mockRejectedValue(new Error('Connection error'));

        const result = await cache.get('bad-key');

        expect(result).toBeNull();
      });

      it('should prefix keys correctly', async () => {
        vi.mocked(valkeyClient.get).mockResolvedValue(null);

        await cache.get('mykey');

        expect(valkeyClient.get).toHaveBeenCalledWith('test:mykey');
      });
    });

    describe('set', () => {
      it('should serialize and cache data with TTL', async () => {
        const mockData = { name: 'test', value: 456 };
        vi.mocked(valkeyClient.set).mockResolvedValue(true);

        const result = await cache.set('key2', mockData);

        expect(result).toBe(true);
        expect(valkeyClient.set).toHaveBeenCalledWith(
          'test:key2',
          mockData,
          3600
        );
      });

      it('should use custom TTL when provided', async () => {
        const mockData = { name: 'test', value: 789 };
        vi.mocked(valkeyClient.set).mockResolvedValue(true);

        await cache.set('key3', mockData, 7200);

        expect(valkeyClient.set).toHaveBeenCalledWith(
          'test:key3',
          mockData,
          7200
        );
      });

      it('should return false on cache write failure', async () => {
        const mockData = { name: 'test', value: 999 };
        vi.mocked(valkeyClient.set).mockResolvedValue(false);

        const result = await cache.set('key4', mockData);

        expect(result).toBe(false);
      });

      it('should handle errors gracefully', async () => {
        const mockData = { name: 'test', value: 999 };
        vi.mocked(valkeyClient.set).mockRejectedValue(new Error('Write error'));

        const result = await cache.set('error-key', mockData);

        expect(result).toBe(false);
      });
    });

    describe('delete', () => {
      it('should delete cached data', async () => {
        vi.mocked(valkeyClient.delete).mockResolvedValue(true);

        const result = await cache.delete('key5');

        expect(result).toBe(true);
        expect(valkeyClient.delete).toHaveBeenCalledWith('test:key5');
      });

      it('should return false when key does not exist', async () => {
        vi.mocked(valkeyClient.delete).mockResolvedValue(false);

        const result = await cache.delete('nonexistent');

        expect(result).toBe(false);
      });

      it('should handle deletion errors gracefully', async () => {
        vi.mocked(valkeyClient.delete).mockRejectedValue(new Error('Delete error'));

        const result = await cache.delete('error-key');

        expect(result).toBe(false);
      });
    });

    describe('exists', () => {
      it('should return true when key exists', async () => {
        vi.mocked(valkeyClient.exists).mockResolvedValue(true);

        const result = await cache.exists('existing-key');

        expect(result).toBe(true);
        expect(valkeyClient.exists).toHaveBeenCalledWith('test:existing-key');
      });

      it('should return false when key does not exist', async () => {
        vi.mocked(valkeyClient.exists).mockResolvedValue(false);

        const result = await cache.exists('nonexistent');

        expect(result).toBe(false);
      });
    });

    describe('cache prefix isolation', () => {
      it('should isolate different cache instances', async () => {
        const cache1 = new ValkeyCache<string>('prefix1', 3600);
        const cache2 = new ValkeyCache<string>('prefix2', 3600);

        vi.mocked(valkeyClient.get).mockResolvedValue(null);

        await cache1.get('same-key');
        await cache2.get('same-key');

        expect(valkeyClient.get).toHaveBeenCalledWith('prefix1:same-key');
        expect(valkeyClient.get).toHaveBeenCalledWith('prefix2:same-key');
      });
    });

    describe('type safety', () => {
      it('should maintain type safety for complex types', async () => {
        interface ComplexType {
          id: string;
          metadata: {
            created: string;
            tags: string[];
          };
          score: number;
        }

        const complexCache = new ValkeyCache<ComplexType>('complex', 3600);
        const mockData: ComplexType = {
          id: 'test-id',
          metadata: {
            created: '2025-01-01',
            tags: ['tag1', 'tag2'],
          },
          score: 0.95,
        };

        vi.mocked(valkeyClient.get).mockResolvedValue(mockData);

        const result = await complexCache.get('complex-key');

        expect(result).toEqual(mockData);
        expect(result?.metadata.tags).toEqual(['tag1', 'tag2']);
      });
    });
  });
});
