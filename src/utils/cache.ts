import { valkeyClient } from '@/infra/valkey.client.js';
import { logger } from '@/infra/logger.js';

export interface CacheInterface<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttlSeconds?: number): Promise<boolean>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
}

export class ValkeyCache<T> implements CacheInterface<T> {
  private prefix: string;
  private defaultTtl: number;

  constructor(prefix: string = 'cache', defaultTtlSeconds: number = 3600) {
    this.prefix = prefix;
    this.defaultTtl = defaultTtlSeconds;
  }

  private buildKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async get(key: string): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key);
      const value = await valkeyClient.get<T>(fullKey);
      return value;
    } catch (error) {
      logger.error({ error, key }, 'ValkeyCache get failed');
      return null;
    }
  }

  async set(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const ttl = ttlSeconds ?? this.defaultTtl;
      return await valkeyClient.set(fullKey, value, ttl);
    } catch (error) {
      logger.error({ error, key }, 'ValkeyCache set failed');
      return false;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      return await valkeyClient.exists(fullKey);
    } catch (error) {
      logger.error({ error, key }, 'ValkeyCache has failed');
      return false;
    }
  }

  // Alias for has() - some tests use exists() instead of has()
  async exists(key: string): Promise<boolean> {
    return this.has(key);
  }

  async delete(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      return await valkeyClient.delete(fullKey);
    } catch (error) {
      logger.error({ error, key }, 'ValkeyCache delete failed');
      return false;
    }
  }

  async clear(): Promise<boolean> {
    try {
      return await valkeyClient.flush();
    } catch (error) {
      logger.error({ error }, 'ValkeyCache clear failed');
      return false;
    }
  }
}

// Cache instances with different TTLs based on data type and usage patterns

// Embedding cache: 1 hour (embeddings are expensive to compute, rarely change)
export const embeddingCache = new ValkeyCache<number[]>('embedding', 3600);

// Agent response cache: 30 minutes (balance between freshness and performance)
// Use shorter TTL for dynamic data, longer for static policies
export const agentResponseCache = new ValkeyCache<string>('agent-response', 1800);

// Query result cache: 5 minutes (for frequently accessed queries)
export const queryResultCache = new ValkeyCache<any>('query-result', 300);
