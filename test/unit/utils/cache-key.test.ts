import { describe, it, expect } from 'vitest';
import {
  generateQueryCacheKey,
  shouldCacheQuery,
  getQueryCacheTTL,
} from '../../../src/utils/cache-key';

describe('Cache Key Utilities', () => {
  describe('generateQueryCacheKey', () => {
    it('should generate consistent hash for same query', () => {
      const query = 'What is the refund policy?';
      const key1 = generateQueryCacheKey(query);
      const key2 = generateQueryCacheKey(query);

      expect(key1).toBe(key2);
      expect(key1).toHaveLength(16);
    });

    it('should normalize whitespace', () => {
      const query1 = 'What  is   the refund    policy?';
      const query2 = 'What is the refund policy?';
      const key1 = generateQueryCacheKey(query1);
      const key2 = generateQueryCacheKey(query2);

      expect(key1).toBe(key2);
    });

    it('should normalize case', () => {
      const query1 = 'WHAT IS THE REFUND POLICY?';
      const query2 = 'what is the refund policy?';
      const key1 = generateQueryCacheKey(query1);
      const key2 = generateQueryCacheKey(query2);

      expect(key1).toBe(key2);
    });

    it('should trim leading and trailing whitespace', () => {
      const query1 = '  What is the refund policy?  ';
      const query2 = 'What is the refund policy?';
      const key1 = generateQueryCacheKey(query1);
      const key2 = generateQueryCacheKey(query2);

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different queries', () => {
      const key1 = generateQueryCacheKey('What is the refund policy?');
      const key2 = generateQueryCacheKey('Show me all orders');

      expect(key1).not.toBe(key2);
    });

    it('should handle empty strings', () => {
      const key = generateQueryCacheKey('');
      expect(key).toBeDefined();
      expect(key).toHaveLength(16);
    });

    it('should handle special characters', () => {
      const query = 'What is the policy for $100+ orders?';
      const key = generateQueryCacheKey(query);
      expect(key).toBeDefined();
      expect(key).toHaveLength(16);
    });

    it('should handle unicode characters', () => {
      const query = 'What is the policy für Rückerstattung?';
      const key = generateQueryCacheKey(query);
      expect(key).toBeDefined();
      expect(key).toHaveLength(16);
    });
  });

  describe('shouldCacheQuery', () => {
    describe('time-sensitive queries (should NOT cache)', () => {
      it('should not cache queries with "now"', () => {
        expect(shouldCacheQuery('Show me orders from now')).toBe(false);
        expect(shouldCacheQuery('What is happening right now?')).toBe(false);
      });

      it('should not cache queries with "today"', () => {
        expect(shouldCacheQuery('Show me orders from today')).toBe(false);
        expect(shouldCacheQuery('What are today\'s sales?')).toBe(false);
      });

      it('should not cache queries with "current"', () => {
        expect(shouldCacheQuery('What is the current status?')).toBe(false);
        expect(shouldCacheQuery('Show current inventory')).toBe(false);
      });

      it('should not cache queries with "latest"', () => {
        expect(shouldCacheQuery('Show me the latest orders')).toBe(false);
        expect(shouldCacheQuery('What is the latest update?')).toBe(false);
      });

      it('should not cache queries with "recent"', () => {
        expect(shouldCacheQuery('Show recent transactions')).toBe(false);
        expect(shouldCacheQuery('What are the recent changes?')).toBe(false);
      });

      it('should not cache queries with "just now"', () => {
        expect(shouldCacheQuery('What happened just now?')).toBe(false);
      });

      it('should not cache queries with "this minute"', () => {
        expect(shouldCacheQuery('Show orders from this minute')).toBe(false);
      });

      it('should not cache queries with "this hour"', () => {
        expect(shouldCacheQuery('Show sales this hour')).toBe(false);
      });
    });

    describe('cacheable queries', () => {
      it('should cache policy questions', () => {
        expect(shouldCacheQuery('What is the refund policy?')).toBe(true);
      });

      it('should cache historical data queries', () => {
        expect(shouldCacheQuery('Show me orders from last week')).toBe(true);
        expect(shouldCacheQuery('What were sales last month?')).toBe(true);
      });

      it('should cache documentation queries', () => {
        expect(shouldCacheQuery('How do I process a return?')).toBe(true);
      });

      it('should cache specific customer queries', () => {
        expect(shouldCacheQuery('Show me orders from John Smith')).toBe(true);
      });
    });

    it('should be case insensitive', () => {
      expect(shouldCacheQuery('Show me orders from NOW')).toBe(false);
      expect(shouldCacheQuery('Show me orders from TODAY')).toBe(false);
      expect(shouldCacheQuery('What is the REFUND policy?')).toBe(true);
    });
  });

  describe('getQueryCacheTTL', () => {
    describe('policy queries (1 hour = 3600 seconds)', () => {
      it('should return 3600 for queries with "policy"', () => {
        expect(getQueryCacheTTL('What is the refund policy?')).toBe(3600);
      });

      it('should return 3600 for queries with "refund"', () => {
        expect(getQueryCacheTTL('How do I get a refund?')).toBe(3600);
      });

      it('should return 3600 for queries with "warranty"', () => {
        expect(getQueryCacheTTL('What is the warranty period?')).toBe(3600);
      });

      it('should return 3600 for queries with "shipping"', () => {
        expect(getQueryCacheTTL('What are the shipping options?')).toBe(3600);
      });

      it('should return 3600 for queries with "cancellation"', () => {
        expect(getQueryCacheTTL('What is the cancellation policy?')).toBe(3600);
      });

      it('should return 3600 for queries with "return"', () => {
        expect(getQueryCacheTTL('What is the return process?')).toBe(3600);
      });
    });

    describe('documentation queries (30 minutes = 1800 seconds)', () => {
      it('should return 1800 for queries with "how to"', () => {
        expect(getQueryCacheTTL('How to process an order?')).toBe(1800);
      });

      it('should return 1800 for queries with "what is"', () => {
        expect(getQueryCacheTTL('What is the account setup process?')).toBe(1800);
      });

      it('should return 1800 for queries with "how do i"', () => {
        expect(getQueryCacheTTL('How do I update my profile?')).toBe(1800);
      });

      it('should return 1800 for queries with "can i"', () => {
        expect(getQueryCacheTTL('Can I change my email?')).toBe(1800);
      });

      it('should return 1800 for queries with "support"', () => {
        expect(getQueryCacheTTL('How do I contact support?')).toBe(1800);
      });
    });

    describe('order queries (5 minutes = 300 seconds)', () => {
      it('should return 300 for queries with "order"', () => {
        expect(getQueryCacheTTL('Show me all orders')).toBe(300);
      });

      it('should return 300 for queries with "purchase"', () => {
        expect(getQueryCacheTTL('What did I purchase last week?')).toBe(300);
      });

      it('should return 300 for queries with "customer"', () => {
        expect(getQueryCacheTTL('Find customer John Smith')).toBe(300);
      });

      it('should return 300 for queries with "show me"', () => {
        expect(getQueryCacheTTL('Show me the sales data')).toBe(300);
      });

      it('should return 300 for queries with "find"', () => {
        expect(getQueryCacheTTL('Find all pending transactions')).toBe(300);
      });
    });

    describe('default TTL (15 minutes = 900 seconds)', () => {
      it('should return 900 for queries without specific keywords', () => {
        expect(getQueryCacheTTL('Tell me about the company')).toBe(900);
      });

      it('should return 900 for generic questions', () => {
        expect(getQueryCacheTTL('Hello, how are you?')).toBe(900);
      });

      it('should return 900 for empty queries', () => {
        expect(getQueryCacheTTL('')).toBe(900);
      });
    });

    describe('priority matching (first match wins)', () => {
      it('should prioritize policy keywords over documentation', () => {
        // Has both "policy" and "what is", but policy takes priority
        expect(getQueryCacheTTL('What is the refund policy?')).toBe(3600);
      });

      it('should prioritize documentation over order keywords', () => {
        // Has both "how to" and "order", but documentation takes priority
        expect(getQueryCacheTTL('How to place an order?')).toBe(1800);
      });

      it('should prioritize order keywords over default', () => {
        // Has "order" but no policy/doc keywords
        expect(getQueryCacheTTL('Cancel my order')).toBe(300);
      });
    });

    it('should be case insensitive', () => {
      expect(getQueryCacheTTL('WHAT IS THE REFUND POLICY?')).toBe(3600);
      expect(getQueryCacheTTL('HOW TO PLACE AN ORDER?')).toBe(1800);
      expect(getQueryCacheTTL('SHOW ME ALL ORDERS')).toBe(300);
    });

    describe('edge cases', () => {
      it('should handle queries with multiple spaces', () => {
        expect(getQueryCacheTTL('What   is   the   refund   policy?')).toBe(3600);
      });

      it('should handle queries with special characters', () => {
        expect(getQueryCacheTTL('What is the policy for $100+ orders?')).toBe(3600);
      });

      it('should handle very long queries', () => {
        const longQuery = 'What is the refund policy for ' + 'x'.repeat(500) + ' products?';
        expect(getQueryCacheTTL(longQuery)).toBe(3600);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete caching workflow for policy query', () => {
      const query = '  What is the REFUND policy?  ';

      // Should be cacheable
      expect(shouldCacheQuery(query)).toBe(true);

      // Should have long TTL
      expect(getQueryCacheTTL(query)).toBe(3600);

      // Should generate consistent key
      const key1 = generateQueryCacheKey(query);
      const key2 = generateQueryCacheKey('what is the refund policy?');
      expect(key1).toBe(key2);
    });

    it('should handle complete caching workflow for time-sensitive query', () => {
      const query = 'Show me orders from today';

      // Should NOT be cacheable
      expect(shouldCacheQuery(query)).toBe(false);

      // TTL should still be calculated (for consistency)
      expect(getQueryCacheTTL(query)).toBe(300);

      // Key should still be generated (for consistency)
      const key = generateQueryCacheKey(query);
      expect(key).toBeDefined();
      expect(key).toHaveLength(16);
    });

    it('should handle complete caching workflow for order query', () => {
      const query = 'Show me all orders from John Smith';

      // Should be cacheable
      expect(shouldCacheQuery(query)).toBe(true);

      // Should have short TTL (orders are dynamic)
      expect(getQueryCacheTTL(query)).toBe(300);

      // Should generate unique key
      const key = generateQueryCacheKey(query);
      expect(key).toBeDefined();
    });
  });
});
