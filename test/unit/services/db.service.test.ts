import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryDatabase } from '../../../src/services/db.service';
import { Order } from '../../../src/domain/order.model';

vi.mock('../../../src/domain/order.model');

describe('Database Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('queryDatabase', () => {
    it('should query by customer name', async () => {
      const mockOrders = [
        {
          orderId: 'ORD-001',
          customerName: 'John Smith',
          product: 'Laptop',
          totalAmount: 1299.99,
          status: 'completed',
        },
      ];

      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockReturnValue({
              exec: vi.fn().mockResolvedValue(mockOrders),
            }),
          }),
        }),
      });

      vi.mocked(Order.find).mockImplementation(mockFind as any);

      const result = await queryDatabase({ customerName: 'John Smith' });

      expect(result).toEqual(mockOrders);
      expect(mockFind).toHaveBeenCalledWith({
        customerName: { $regex: expect.any(RegExp) },
      });
    });

    it('should query by product', async () => {
      const mockOrders = [
        {
          orderId: 'ORD-002',
          product: 'Mouse',
          totalAmount: 29.99,
        },
      ];

      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockReturnValue({
              exec: vi.fn().mockResolvedValue(mockOrders),
            }),
          }),
        }),
      });

      vi.mocked(Order.find).mockImplementation(mockFind as any);

      const result = await queryDatabase({ product: 'Mouse' });

      expect(result).toEqual(mockOrders);
      expect(mockFind).toHaveBeenCalledWith({
        product: { $regex: expect.any(RegExp) },
      });
    });

    it('should query by status', async () => {
      const mockOrders = [
        {
          orderId: 'ORD-003',
          status: 'pending',
        },
      ];

      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockReturnValue({
              exec: vi.fn().mockResolvedValue(mockOrders),
            }),
          }),
        }),
      });

      vi.mocked(Order.find).mockImplementation(mockFind as any);

      const result = await queryDatabase({ status: 'pending' });

      expect(result).toEqual(mockOrders);
      expect(mockFind).toHaveBeenCalledWith({
        status: 'pending',
      });
    });

    it('should sanitize regex special characters', async () => {
      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockReturnValue({
              exec: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      vi.mocked(Order.find).mockImplementation(mockFind as any);

      await queryDatabase({ customerName: 'John.Smith*' });

      expect(mockFind).toHaveBeenCalledWith({
        customerName: { $regex: /John\.Smith\*/i },
      });
    });

    it('should handle multiple criteria', async () => {
      const mockFind = vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockReturnValue({
              exec: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      vi.mocked(Order.find).mockImplementation(mockFind as any);

      await queryDatabase({
        customerName: 'John',
        status: 'completed',
      });

      expect(mockFind).toHaveBeenCalledWith({
        customerName: { $regex: expect.any(RegExp) },
        status: 'completed',
      });
    });

    it('should handle errors', async () => {
      vi.mocked(Order.find).mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(queryDatabase({ customerName: 'test' })).rejects.toThrow(
        'Failed to query database'
      );
    });
  });
});
