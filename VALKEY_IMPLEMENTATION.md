# Valkey (Redis) Implementation Guide

## Overview

This document explains the Valkey (Redis) caching implementation using the Singleton pattern for clean, production-quality code.

## Architecture

### 1. Singleton Pattern Implementation

**Valkey Client** (`src/infra/valkey.client.ts`):
- Single instance across the application
- Thread-safe initialization
- Connection pooling and automatic reconnection
- Event-driven error handling
- Graceful shutdown support

**MongoDB Client** (`src/infra/mongo.client.ts`):
- Singleton pattern for consistent connection management
- Connection pooling (maxPoolSize: 10, minPoolSize: 2)
- Automatic reconnection on disconnect
- Health check methods

### 2. Cache Layer (`src/utils/cache.ts`)

**ValkeyCache Class**:
- Generic type support: `ValkeyCache<T>`
- Automatic key prefixing for namespace isolation
- Configurable TTL per operation
- Clean interface for CRUD operations
- Error handling with fallback behavior

**Interface**:
```typescript
interface CacheInterface<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttlSeconds?: number): Promise<boolean>;
  has(key: string): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<boolean>;
}
```

## Configuration

### Environment Variables

```env
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=          # Optional
VALKEY_DB=0
VALKEY_TTL=3600          # Default TTL in seconds
```

### Docker Compose

Valkey runs with:
- LRU eviction policy (maxmemory-policy: allkeys-lru)
- 256MB memory limit
- AOF persistence enabled
- Health checks every 10 seconds

## Usage Examples

### 1. Embedding Cache (Current Implementation)

```typescript
import { embeddingCache } from '@/utils/cache.js';

// Get cached embedding
const cached = await embeddingCache.get(query);

// Set new embedding with default TTL (3600s)
await embeddingCache.set(query, embedding);

// Set with custom TTL (7200s)
await embeddingCache.set(query, embedding, 7200);
```

### 2. Creating Custom Cache Instances

```typescript
import { ValkeyCache } from '@/utils/cache.js';

// Create cache for API responses
const apiCache = new ValkeyCache<ApiResponse>('api', 600);

// Create cache for user sessions
const sessionCache = new ValkeyCache<Session>('session', 1800);
```

### 3. Direct Valkey Client Usage

```typescript
import { valkeyClient } from '@/infra/valkey.client.js';

// Ping check
const isAlive = await valkeyClient.ping();

// Custom operations
const rawClient = valkeyClient.getClient();
await rawClient.lpush('queue:tasks', JSON.stringify(task));
```

## Benefits

### 1. Performance
- **Reduced API Calls**: Embeddings cached in Valkey reduce OpenAI API calls
- **Low Latency**: In-memory storage with sub-millisecond access
- **Distributed**: Can scale across multiple instances

### 2. Code Quality
- **Singleton Pattern**: Single instance, no duplicate connections
- **Type Safety**: Full TypeScript support with generics
- **Error Handling**: Graceful degradation on cache failures
- **Separation of Concerns**: Clear boundaries between cache, client, and business logic

### 3. Maintainability
- **Clean Interface**: Easy to understand and use
- **Extensible**: Simple to add new cache instances
- **Testable**: Can mock cache for unit tests
- **Observable**: Structured logging for debugging

## Monitoring

### Health Checks

```bash
# Via Docker
docker exec -it ai-assistant-valkey valkey-cli ping

# Via Application
curl http://localhost:3000/health  # If implemented
```

### Cache Statistics

```typescript
// Get cache info
const client = valkeyClient.getClient();
const info = await client.info('stats');
const keyCount = await client.dbsize();
```

### Logs

Watch for these log events:
- `Valkey client ready` - Connection established
- `Valkey connection error` - Connection issues
- `Valkey reconnecting` - Automatic recovery
- `ValkeyCache get failed` - Cache read errors
- `ValkeyCache set failed` - Cache write errors

## Best Practices

### 1. Key Naming
- Use descriptive prefixes: `embedding:`, `api:`, `session:`
- Include version in keys if schema changes: `v1:embedding:`
- Keep keys short but meaningful

### 2. TTL Management
- Set appropriate TTL based on data volatility
- Embeddings: 3600s (1 hour) - stable data
- API responses: 300-600s (5-10 minutes) - moderate volatility
- User sessions: 1800s (30 minutes) - high security

### 3. Error Handling
- Cache failures should not break application flow
- Always have fallback behavior (fetch from source)
- Log errors for monitoring

### 4. Memory Management
- Monitor memory usage with `INFO memory`
- Adjust maxmemory and eviction policy as needed
- Use TTL to prevent memory bloat

## Migration from LRU Cache

The previous in-memory LRU cache has been replaced with Valkey:

**Before:**
```typescript
const embeddingCache = new LRUCache<string, number[]>(50, 3600000);
```

**After:**
```typescript
const embeddingCache = new ValkeyCache<number[]>('embedding', 3600);
```

**Key Changes:**
- Async methods: `get()` and `set()` are now async
- Distributed: Works across multiple instances
- Persistent: Data survives application restarts (with AOF)
- Scalable: Can handle much larger datasets

## Testing

### Unit Tests

```typescript
import { ValkeyCache } from '@/utils/cache.js';

describe('ValkeyCache', () => {
  const cache = new ValkeyCache<string>('test', 60);

  it('should store and retrieve values', async () => {
    await cache.set('key1', 'value1');
    const value = await cache.get('key1');
    expect(value).toBe('value1');
  });

  it('should respect TTL', async () => {
    await cache.set('key2', 'value2', 1);
    await new Promise(resolve => setTimeout(resolve, 1100));
    const value = await cache.get('key2');
    expect(value).toBeNull();
  });
});
```

## Troubleshooting

### Connection Refused
```bash
# Check if Valkey is running
docker ps | grep valkey

# Start Valkey
cd docker && docker-compose up -d valkey
```

### High Memory Usage
```bash
# Check memory
docker exec -it ai-assistant-valkey valkey-cli INFO memory

# Clear database
docker exec -it ai-assistant-valkey valkey-cli FLUSHDB
```

### Slow Performance
- Check network latency
- Monitor connection pool utilization
- Consider increasing maxPoolSize
- Review key expiration strategy

## Future Enhancements

1. **Cluster Mode**: Scale horizontally with Valkey cluster
2. **Metrics**: Integrate Prometheus metrics
3. **Cache Warming**: Pre-populate cache on startup
4. **Compression**: Compress large values before storage
5. **Multi-Level Cache**: L1 (in-memory) + L2 (Valkey) caching
