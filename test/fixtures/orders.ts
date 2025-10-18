import type { IOrder } from '../../src/domain/order.model';

export const mockOrders: IOrder[] = [
  {
    orderId: 'ORD-001',
    customerName: 'John Smith',
    product: 'Laptop Pro 15',
    totalAmount: 1299.99,
    status: 'completed',
    orderDate: new Date('2025-01-10T10:30:00Z'),
  },
  {
    orderId: 'ORD-002',
    customerName: 'Sarah Johnson',
    product: 'Wireless Mouse',
    totalAmount: 29.99,
    status: 'completed',
    orderDate: new Date('2025-01-11T14:20:00Z'),
  },
  {
    orderId: 'ORD-003',
    customerName: 'Michael Chen',
    product: 'USB-C Hub',
    totalAmount: 49.99,
    status: 'pending',
    orderDate: new Date('2025-01-15T09:15:00Z'),
  },
  {
    orderId: 'ORD-004',
    customerName: 'Emily Davis',
    product: 'Mechanical Keyboard',
    totalAmount: 149.99,
    status: 'shipped',
    orderDate: new Date('2025-01-14T16:45:00Z'),
  },
  {
    orderId: 'ORD-005',
    customerName: 'David Wilson',
    product: '4K Monitor',
    totalAmount: 599.99,
    status: 'completed',
    orderDate: new Date('2025-01-12T11:00:00Z'),
  },
  {
    orderId: 'ORD-006',
    customerName: 'Sarah Johnson',
    product: 'Laptop Stand',
    totalAmount: 39.99,
    status: 'cancelled',
    orderDate: new Date('2025-01-09T13:30:00Z'),
  },
  {
    orderId: 'ORD-007',
    customerName: 'John Smith',
    product: 'Webcam HD',
    totalAmount: 89.99,
    status: 'pending',
    orderDate: new Date('2025-01-16T08:00:00Z'),
  },
];

export const mockOrder = (overrides: Partial<IOrder> = {}): IOrder => ({
  orderId: 'ORD-TEST',
  customerName: 'Test User',
  product: 'Test Product',
  totalAmount: 99.99,
  status: 'pending',
  orderDate: new Date(),
  ...overrides,
});
