import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { mongoClient } from '../../src/infra/mongo.client';
import { Order } from '../../src/domain/order.model';
import { queryDatabase } from '../../src/services/db.service';
import { mockOrders } from '../fixtures/orders';

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test database
    await mongoClient.connect();
  });

  afterAll(async () => {
    // Cleanup and disconnect
    const db = mongoClient.getDb();
    if (db) {
      await db.dropDatabase();
    }
    await mongoClient.disconnect();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await Order.deleteMany({});
  });

  describe('MongoDB Operations', () => {
    it('should insert and retrieve orders', async () => {
      const testOrder = mockOrders[0];
      await Order.create(testOrder);

      const found = await Order.findOne({ orderId: testOrder.orderId });

      expect(found).not.toBeNull();
      expect(found?.customerName).toBe(testOrder.customerName);
      expect(found?.product).toBe(testOrder.product);
      expect(found?.totalAmount).toBe(testOrder.totalAmount);
    });

    it('should query orders by customer name', async () => {
      // Insert multiple orders
      await Order.insertMany(mockOrders);

      const results = await queryDatabase({ customerName: 'John Smith' });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((order) => order.customerName === 'John Smith')).toBe(true);
    });

    it('should query orders by product', async () => {
      await Order.insertMany(mockOrders);

      const results = await queryDatabase({ product: 'Laptop' });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((order) => order.product.includes('Laptop'))).toBe(true);
    });

    it('should query orders by status', async () => {
      await Order.insertMany(mockOrders);

      const results = await queryDatabase({ status: 'pending' });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((order) => order.status === 'pending')).toBe(true);
    });

    it('should query with multiple criteria', async () => {
      await Order.insertMany(mockOrders);

      const results = await queryDatabase({
        customerName: 'Sarah',
        status: 'completed',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every(
          (order) =>
            order.customerName.includes('Sarah') && order.status === 'completed'
        )
      ).toBe(true);
    });

    it('should handle date range queries', async () => {
      await Order.insertMany(mockOrders);

      const startDate = new Date('2025-01-10T00:00:00Z');
      const endDate = new Date('2025-01-12T23:59:59Z');

      const results = await queryDatabase({
        dateRange: { startDate, endDate },
      });

      expect(results.length).toBeGreaterThan(0);
      results.forEach((order) => {
        expect(new Date(order.orderDate)).toBeGreaterThanOrEqual(startDate);
        expect(new Date(order.orderDate)).toBeLessThanOrEqual(endDate);
      });
    });

    it('should limit results correctly', async () => {
      await Order.insertMany(mockOrders);

      const results = await Order.find().limit(3).lean().exec();

      expect(results.length).toBe(3);
    });

    it('should sort results by date descending', async () => {
      await Order.insertMany(mockOrders);

      const results = await Order.find()
        .sort({ orderDate: -1 })
        .lean()
        .exec();

      for (let i = 0; i < results.length - 1; i++) {
        expect(new Date(results[i].orderDate).getTime()).toBeGreaterThanOrEqual(
          new Date(results[i + 1].orderDate).getTime()
        );
      }
    });

    it('should handle empty results gracefully', async () => {
      const results = await queryDatabase({ customerName: 'NonexistentCustomer' });

      expect(results).toEqual([]);
    });

    it('should properly escape regex special characters', async () => {
      await Order.create({
        orderId: 'ORD-SPECIAL',
        customerName: 'John.Smith*',
        product: 'Test Product',
        totalAmount: 99.99,
        status: 'completed',
        orderDate: new Date(),
      });

      const results = await queryDatabase({ customerName: 'John.Smith*' });

      expect(results.length).toBe(1);
      expect(results[0].customerName).toBe('John.Smith*');
    });
  });

  describe('Connection Pooling', () => {
    it('should handle concurrent queries efficiently', async () => {
      await Order.insertMany(mockOrders);

      const queries = Array.from({ length: 10 }, (_, i) =>
        queryDatabase({ status: i % 2 === 0 ? 'completed' : 'pending' })
      );

      const results = await Promise.all(queries);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(Array.isArray(result)).toBe(true);
      });
    });

    it('should reuse connections from pool', async () => {
      const client = mongoClient;

      // Verify singleton pattern
      expect(client.isReady()).toBe(true);

      // Execute multiple operations
      await Order.insertMany(mockOrders.slice(0, 3));
      await Order.findOne({ orderId: 'ORD-001' });
      await Order.find().limit(5).exec();

      // Connection should still be active
      expect(client.isReady()).toBe(true);
    });
  });
});
