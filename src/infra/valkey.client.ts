import Redis, { type RedisOptions } from 'ioredis';
import { env } from '@/config/env.js';
import { logger } from './logger.js';

class ValkeyClient {
  private static instance: ValkeyClient | null = null;
  private client: Redis;
  private isConnected: boolean = false;

  private constructor() {
    const config: RedisOptions = {
      host: env.VALKEY_HOST,
      port: parseInt(env.VALKEY_PORT, 10),
      db: parseInt(env.VALKEY_DB, 10),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn({ attempt: times, delay }, 'Retrying Valkey connection');
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    };

    if (env.VALKEY_PASSWORD) {
      config.password = env.VALKEY_PASSWORD;
    }

    this.client = new Redis(config);

    this.client.on('connect', () => {
      logger.info('Valkey connection established');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      logger.info(
        {
          host: env.VALKEY_HOST,
          port: env.VALKEY_PORT,
          db: env.VALKEY_DB,
        },
        'Valkey client ready'
      );
    });

    this.client.on('error', (error) => {
      logger.error({ error }, 'Valkey client error');
      this.isConnected = false;
    });

    this.client.on('close', () => {
      logger.warn('Valkey connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Valkey reconnecting');
    });
  }

  public static getInstance(): ValkeyClient {
    if (!ValkeyClient.instance) {
      ValkeyClient.instance = new ValkeyClient();
    }
    return ValkeyClient.instance;
  }

  public getClient(): Redis {
    return this.client;
  }

  public isReady(): boolean {
    return this.isConnected;
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error({ error, key }, 'Failed to get value from Valkey');
      return null;
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const ttl = ttlSeconds ?? parseInt(env.VALKEY_TTL, 10);

      await this.client.setex(key, ttl, serialized);
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Failed to set value in Valkey');
      return false;
    }
  }

  public async delete(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Failed to delete key from Valkey');
      return false;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error({ error, key }, 'Failed to check key existence in Valkey');
      return false;
    }
  }

  public async flush(): Promise<boolean> {
    try {
      await this.client.flushdb();
      logger.info('Valkey database flushed');
      return true;
    } catch (error) {
      logger.error({ error }, 'Failed to flush Valkey database');
      return false;
    }
  }

  public async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error({ error }, 'Valkey ping failed');
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Valkey client disconnected gracefully');
    } catch (error) {
      logger.error({ error }, 'Failed to disconnect Valkey client');
      this.client.disconnect();
    }
  }
}

export const valkeyClient = ValkeyClient.getInstance();
export { ValkeyClient };
