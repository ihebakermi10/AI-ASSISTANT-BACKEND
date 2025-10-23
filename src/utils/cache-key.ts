import crypto from 'crypto';

/**
 * Generate a deterministic cache key from a query string
 * Uses SHA-256 hash to ensure consistent key generation
 *
 * @param query - The user query string
 * @returns A hash-based cache key
 */
export function generateQueryCacheKey(query: string): string {
  // Normalize the query: trim, lowercase, remove extra spaces
  const normalizedQuery = query.trim().toLowerCase().replace(/\s+/g, ' ');

  // Generate SHA-256 hash for consistent, collision-resistant keys
  const hash = crypto.createHash('sha256').update(normalizedQuery).digest('hex');

  // Return first 16 characters (sufficient for uniqueness in most cases)
  return hash.substring(0, 16);
}

/**
 * Determine if a query should use cached results
 * Some queries shouldn't be cached (e.g., real-time data requests)
 *
 * @param query - The user query string
 * @returns true if query should be cached
 */
export function shouldCacheQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();

  // Don't cache real-time or time-sensitive queries
  const noCache = [
    'now',
    'today',
    'current',
    'latest',
    'recent',
    'just now',
    'this minute',
    'this hour',
  ];

  for (const keyword of noCache) {
    if (lowerQuery.includes(keyword)) {
      return false;
    }
  }

  return true;
}

/**
 * Determine cache TTL based on query type
 * Different types of queries benefit from different cache durations
 *
 * @param query - The user query string
 * @returns TTL in seconds
 */
export function getQueryCacheTTL(query: string): number {
  const lowerQuery = query.toLowerCase();

  // Policy/documentation queries: 1 hour (rarely changes)
  const policyKeywords = ['policy', 'refund', 'warranty', 'shipping', 'cancellation', 'return'];
  if (policyKeywords.some((keyword) => lowerQuery.includes(keyword))) {
    return 3600; // 1 hour
  }

  // General documentation/FAQ: 30 minutes
  const docKeywords = ['how to', 'what is', 'how do i', 'can i', 'support'];
  if (docKeywords.some((keyword) => lowerQuery.includes(keyword))) {
    return 1800; // 30 minutes
  }

  // Order/customer queries: 5 minutes (somewhat dynamic)
  const orderKeywords = ['order', 'purchase', 'customer', 'show me', 'find'];
  if (orderKeywords.some((keyword) => lowerQuery.includes(keyword))) {
    return 300; // 5 minutes
  }

  // Default: 15 minutes
  return 900;
}
