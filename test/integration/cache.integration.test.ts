import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { valkeyClient } from '../../src/infra/valkey.client';
import { ValkeyCache } from '../../src/utils/cache';

let isValkeyAvailable = false;

describe('Cache Integration Tests', () => {
  beforeAll(async () => {
    try {
      await valkeyClient.initialize();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      isValkeyAvailable = valkeyClient.isReady();
      if (!isValkeyAvailable) {
        console.log('Valkey is not available, skipping cache integration tests');
      }
    } catch (error) {
      console.log('Failed to initialize Valkey, skipping cache integration tests');
      isValkeyAvailable = false;
    }
  });

  afterAll(async () => {
    // Cleanup and disconnect
    await valkeyClient.flush();
    await valkeyClient.disconnect();
  });

  beforeEach(async () => {
    // Clear cache before each test
    await valkeyClient.flush();
  });

  describe('Valkey Connection', () => {
    it('should connect successfully', async () => {
      if (!isValkeyAvailable) {
        console.log('Skipping: Valkey not available');
        return;
      }
      const pong = await valkeyClient.ping();
      expect(pong).toBe(true);
    });

    it('should handle basic set and get operations', async () => {
      if (!isValkeyAvailable) return;
      await valkeyClient.set('test-key', 'test-value');
      const value = await valkeyClient.get('test-key');

      expect(value).toBe('test-value');
    });

    it('should handle TTL correctly', async () => {
      if (!isValkeyAvailable) return;
      await valkeyClient.set('expiring-key', 'value', 2);

      let exists = await valkeyClient.exists('expiring-key');
      expect(exists).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 2100));

      exists = await valkeyClient.exists('expiring-key');
      expect(exists).toBe(false);
    });

    it('should handle deletion', async () => {
      if (!isValkeyAvailable) return;
      await valkeyClient.set('delete-me', 'value');
      const deleted = await valkeyClient.delete('delete-me');

      expect(deleted).toBe(true);

      const exists = await valkeyClient.exists('delete-me');
      expect(exists).toBe(false);
    });
  });

  describe('ValkeyCache Generic Class', () => {
    interface TestData {
      id: string;
      name: string;
      value: number;
    }

    let cache: ValkeyCache<TestData>;

    beforeEach(() => {
      cache = new ValkeyCache('test', 3600);
    });

    it('should cache and retrieve data', async () => {
      if (!isValkeyAvailable) return;
      const data: TestData = { id: '1', name: 'Test', value: 100 };

      await cache.set('key1', data);
      const retrieved = await cache.get('key1');

      expect(retrieved).toEqual(data);
    });

    it('should handle cache miss', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should support different data types', async () => {
      if (!isValkeyAvailable) return;
      const stringCache = new ValkeyCache<string>('strings', 3600);
      const numberCache = new ValkeyCache<number>('numbers', 3600);
      const arrayCache = new ValkeyCache<string[]>('arrays', 3600);

      await stringCache.set('str', 'hello');
      await numberCache.set('num', 42);
      await arrayCache.set('arr', ['a', 'b', 'c']);

      expect(await stringCache.get('str')).toBe('hello');
      expect(await numberCache.get('num')).toBe(42);
      expect(await arrayCache.get('arr')).toEqual(['a', 'b', 'c']);
    });

    it('should respect custom TTL', async () => {
      if (!isValkeyAvailable) return;
      const data: TestData = { id: '2', name: 'TTL Test', value: 200 };

      await cache.set('ttl-key', data, 1);

      let exists = await cache.exists('ttl-key');
      expect(exists).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 1100));

      exists = await cache.exists('ttl-key');
      expect(exists).toBe(false);
    });

    it('should delete cached data', async () => {
      if (!isValkeyAvailable) return;
      const data: TestData = { id: '3', name: 'Delete Test', value: 300 };

      await cache.set('del-key', data);
      const deleted = await cache.delete('del-key');

      expect(deleted).toBe(true);

      const retrieved = await cache.get('del-key');
      expect(retrieved).toBeNull();
    });

    it('should handle concurrent operations', async () => {
      if (!isValkeyAvailable) return;
      const operations = Array.from({ length: 10 }, async (_, i) => {
        const data: TestData = { id: `${i}`, name: `Test ${i}`, value: i * 10 };
        await cache.set(`concurrent-${i}`, data);
        return cache.get(`concurrent-${i}`);
      });

      const results = await Promise.all(operations);

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result).toEqual({
          id: `${i}`,
          name: `Test ${i}`,
          value: i * 10,
        });
      });
    });

    it('should isolate different cache prefixes', async () => {
      if (!isValkeyAvailable) return;
      const cache1 = new ValkeyCache<TestData>('prefix1', 3600);
      const cache2 = new ValkeyCache<TestData>('prefix2', 3600);

      const data1: TestData = { id: '1', name: 'Cache 1', value: 100 };
      const data2: TestData = { id: '2', name: 'Cache 2', value: 200 };

      await cache1.set('shared-key', data1);
      await cache2.set('shared-key', data2);

      const result1 = await cache1.get('shared-key');
      const result2 = await cache2.get('shared-key');

      expect(result1).toEqual(data1);
      expect(result2).toEqual(data2);
      expect(result1).not.toEqual(result2);
    });

    it('should handle large data objects', async () => {
      if (!isValkeyAvailable) return;
      const largeData: TestData & { metadata: Record<string, string> } = {
        id: 'large',
        name: 'Large Data',
        value: 999,
        metadata: {},
      };

      for (let i = 0; i < 100; i++) {
        largeData.metadata[`key${i}`] = `value${i}`.repeat(10);
      }

      const largeCache = new ValkeyCache<typeof largeData>('large', 3600);
      await largeCache.set('large-key', largeData);

      const retrieved = await largeCache.get('large-key');
      expect(retrieved).toEqual(largeData);
    });
  });

  describe('Singleton Pattern', () => {
    it('should maintain single connection instance', async () => {
      if (!isValkeyAvailable) return;
      const client1 = valkeyClient;
      const client2 = valkeyClient;

      expect(client1).toBe(client2);

      await client1.set('singleton-test', 'value');
      const value = await client2.get('singleton-test');

      expect(value).toBe('value');
    });
  });

  describe('Error Handling', () => {
    it('should return null on get errors', async () => {
      // ValkeyClient.get() returns null on errors instead of throwing
      const result = await valkeyClient.get('nonexistent-key');
      expect(result).toBeNull();
    });
  });
});
