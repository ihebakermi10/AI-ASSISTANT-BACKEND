import mongoose from 'mongoose';
import { env } from '@/config/env.js';
import { logger } from './logger.js';

class MongoDBClient {
  private static instance: MongoDBClient | null = null;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): MongoDBClient {
    if (!MongoDBClient.instance) {
      MongoDBClient.instance = new MongoDBClient();
    }
    return MongoDBClient.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('MongoDB already connected');
      return;
    }

    try {
      const options: mongoose.ConnectOptions = {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4,
      };

      await mongoose.connect(env.MONGODB_URI, options);
      this.isConnected = true;

      logger.info(
        {
          uri: env.MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@'),
          poolSize: options.maxPoolSize,
        },
        'MongoDB connected with connection pool'
      );

      mongoose.connection.on('error', (error) => {
        logger.error({ error }, 'MongoDB connection error');
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });
    } catch (error) {
      logger.error({ error }, 'Failed to connect to MongoDB');
      throw new Error('Failed to connect to MongoDB');
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB disconnected');
    } catch (error) {
      logger.error({ error }, 'Failed to disconnect from MongoDB');
      throw new Error('Failed to disconnect from MongoDB');
    }
  }

  public isReady(): boolean {
    return this.isConnected;
  }

  public getConnection(): typeof mongoose {
    return mongoose;
  }
}

export const mongoClient = MongoDBClient.getInstance();

export async function connectToMongo(): Promise<void> {
  return mongoClient.connect();
}

export async function disconnectFromMongo(): Promise<void> {
  return mongoClient.disconnect();
}

export function isMongoConnected(): boolean {
  return mongoClient.isReady();
}

export function getMongoClient(): MongoDBClient {
  return mongoClient;
}
