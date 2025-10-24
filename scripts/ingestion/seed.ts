import 'dotenv/config';
import { connectToMongo, disconnectFromMongo } from '../../src/infra/mongo.client.js';
import { Order } from '../../src/domain/order.model.js';
import { logger } from '../../src/infra/logger.js';

const sampleOrders = [
  {
    orderId: 'ORD-2025-001',
    customerName: 'John Smith',
    email: 'john.smith@example.com',
    product: 'Laptop Pro 15',
    quantity: 1,
    price: 1299.99,
    totalAmount: 1299.99,
    status: 'completed',
    orderDate: new Date('2025-10-01'),
    shippingAddress: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
    },
    notes: 'Express shipping requested',
  },
  {
    orderId: 'ORD-2025-002',
    customerName: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    product: 'Wireless Mouse',
    quantity: 2,
    price: 29.99,
    totalAmount: 59.98,
    status: 'completed',
    orderDate: new Date('2025-10-10'),
    shippingAddress: {
      street: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      country: 'USA',
    },
  },
  {
    orderId: 'ORD-2025-003',
    customerName: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    product: 'USB-C Hub',
    quantity: 1,
    price: 49.99,
    totalAmount: 49.99,
    status: 'pending',
    orderDate: new Date('2025-10-14'),
    shippingAddress: {
      street: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      country: 'USA',
    },
  },
  {
    orderId: 'ORD-2025-004',
    customerName: 'Michael Brown',
    email: 'mbrown@example.com',
    product: 'Mechanical Keyboard',
    quantity: 1,
    price: 129.99,
    totalAmount: 129.99,
    status: 'completed',
    orderDate: new Date('2025-09-28'),
    shippingAddress: {
      street: '789 Pine Rd',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'USA',
    },
    notes: 'Gift wrap requested',
  },
  {
    orderId: 'ORD-2025-005',
    customerName: 'Emily Davis',
    email: 'emily.d@example.com',
    product: 'Monitor 27"',
    quantity: 2,
    price: 399.99,
    totalAmount: 799.98,
    status: 'refunded',
    orderDate: new Date('2025-09-15'),
    shippingAddress: {
      street: '321 Elm St',
      city: 'Houston',
      state: 'TX',
      zipCode: '77001',
      country: 'USA',
    },
    notes: 'Customer requested refund - product not as expected',
  },
  {
    orderId: 'ORD-2025-006',
    customerName: 'John Smith',
    email: 'john.smith@example.com',
    product: 'Laptop Bag',
    quantity: 1,
    price: 59.99,
    totalAmount: 59.99,
    status: 'completed',
    orderDate: new Date('2025-10-11'),
    shippingAddress: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
    },
  },
  {
    orderId: 'ORD-2025-007',
    customerName: 'David Wilson',
    email: 'dwilson@example.com',
    product: 'Webcam HD',
    quantity: 1,
    price: 89.99,
    totalAmount: 89.99,
    status: 'cancelled',
    orderDate: new Date('2025-10-05'),
    shippingAddress: {
      street: '555 Maple Dr',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98101',
      country: 'USA',
    },
    notes: 'Customer cancelled before shipping',
  },
  {
    orderId: 'ORD-2025-008',
    customerName: 'Lisa Anderson',
    email: 'lisa.a@example.com',
    product: 'Headphones Pro',
    quantity: 1,
    price: 199.99,
    totalAmount: 199.99,
    status: 'completed',
    orderDate: new Date('2025-10-12'),
    shippingAddress: {
      street: '777 Broadway',
      city: 'Boston',
      state: 'MA',
      zipCode: '02101',
      country: 'USA',
    },
  },
  {
    orderId: 'ORD-2025-009',
    customerName: 'Robert Taylor',
    email: 'rtaylor@example.com',
    product: 'SSD 1TB',
    quantity: 2,
    price: 149.99,
    totalAmount: 299.98,
    status: 'pending',
    orderDate: new Date('2025-10-15'),
    shippingAddress: {
      street: '888 Cedar Ln',
      city: 'Denver',
      state: 'CO',
      zipCode: '80201',
      country: 'USA',
    },
  },
  {
    orderId: 'ORD-2025-010',
    customerName: 'Jennifer Lee',
    email: 'jlee@example.com',
    product: 'Graphics Card RTX',
    quantity: 1,
    price: 699.99,
    totalAmount: 699.99,
    status: 'completed',
    orderDate: new Date('2025-09-20'),
    shippingAddress: {
      street: '999 Willow Way',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85001',
      country: 'USA',
    },
    notes: 'High-value item - signature required',
  },
];

async function seed(): Promise<void> {
  try {
    logger.info('Starting database seed...');

    await connectToMongo();

    await Order.deleteMany({});
    logger.info('Cleared existing orders');

    const insertedOrders = await Order.insertMany(sampleOrders);
    logger.info({ count: insertedOrders.length }, 'Sample orders inserted successfully');

    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ]);

    logger.info({ stats }, 'Order statistics');

    await disconnectFromMongo();
    logger.info('Database seed completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Failed to seed database');
    process.exit(1);
  }
}

void seed();
