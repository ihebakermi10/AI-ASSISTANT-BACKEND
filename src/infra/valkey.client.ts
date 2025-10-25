import Redis, { type RedisOptions } from 'ioredis';
import { exec } from 'child_process';
import { promisify } from 'util';
import { env } from '@/config/env.js';
import { logger } from './logger.js';

const execAsync = promisify(exec);

class ValkeyClient {
  private static instance: ValkeyClient | null = null;
  private client: Redis | null = null;
  private isConnected: boolean = false;
  private dockerInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    // Don't initialize in constructor - wait for explicit initialize() call
  }


  /**
   * Asynchronously starts Valkey container via Docker Compose
   */
  private async startValkeyDockerAsync(): Promise<void> {
    if (this.dockerInitialized) {
      return;
    }

    try {
      logger.info('Attempting to start Valkey via Docker...');

      // Check if docker is available
      try {
        await execAsync('docker --version');
      } catch {
        logger.info('Docker not available, skipping auto-start');
        return;
      }

      // Check if Valkey container is already running
      const { stdout: psOutput } = await execAsync(
        'docker ps --filter "name=ai-assistant-valkey" --format "{{.Names}}"'
      );

      if (psOutput.trim().includes('ai-assistant-valkey')) {
        logger.info('Valkey container already running');
        this.dockerInitialized = true;
        return;
      }

      // Start Valkey container
      logger.info('Starting Valkey container...');
      await execAsync('docker-compose up -d valkey', { cwd: process.cwd() });

      // Wait for container to be ready
      await this.waitForValkeyReady();

      this.dockerInitialized = true;
      logger.info('Valkey started successfully via Docker!');
    } catch (error) {
      logger.warn({ error }, 'Could not start Valkey via Docker, will retry connection');
    }
  }

  /**
   * Waits for Valkey container to be ready
   */
  private async waitForValkeyReady(maxAttempts: number = 15): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const { stdout } = await execAsync(
          'docker inspect --format="{{.State.Status}}" ai-assistant-valkey-dev 2>nul || docker inspect --format="{{.State.Status}}" ai-assistant-valkey 2>nul'
        );

        if (stdout.trim() === 'running') {
          // Give it an extra second to be fully ready
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return;
        }
      } catch {
        // Container not ready yet
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error('Valkey container did not become ready in time');
  }

  /**
   * Creates the Redis client with retry configuration
   */
  private createRedisClient(): void {
    const config: RedisOptions = {
      host: env.VALKEY_HOST,
      port: parseInt(env.VALKEY_PORT, 10),
      db: parseInt(env.VALKEY_DB, 10),
      retryStrategy: (times: number) => {
        // Stop retrying after 5 attempts to prevent infinite connection attempts
        if (times > 5) {
          logger.warn('Valkey connection retry limit reached. Application will continue without caching.');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 500);
        logger.warn({ attempt: times, delay }, 'Retrying Valkey connection');
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      connectTimeout: 5000, // 5 second connection timeout
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

  /**
   * Initialize Valkey connection (call this once at server startup)
   * This is idempotent - calling multiple times will return the same promise
   */
  public async initialize(): Promise<void> {
    // If already initializing or initialized, return the existing promise
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Create initialization promise
    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  /**
   * Internal initialization logic
   */
  private async _initialize(): Promise<void> {
    logger.info('Initializing Valkey client...');

    // Try to initialize Docker Valkey before creating Redis client
    await this.initializeDockerValkeySync();

    // Create the Redis client
    this.createRedisClient();

    // Wait for client to be ready
    await this.waitForConnection();

    logger.info('Valkey client initialized successfully');
  }

  /**
   * Wait for the Redis client to be ready
   */
  private async waitForConnection(timeoutMs: number = 5000): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        logger.warn('Valkey connection timeout - continuing without cache');
        resolve(); // Don't reject, just continue without cache
      }, timeoutMs);

      if (this.isConnected) {
        clearTimeout(timeout);
        resolve();
        return;
      }

      this.client?.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.client?.once('error', (error) => {
        logger.warn({ error }, 'Valkey connection error - continuing without cache');
        clearTimeout(timeout);
        resolve(); // Don't reject, just continue without cache
      });
    });
  }

  /**
   * Synchronous version of Docker Valkey initialization
   */
  private async initializeDockerValkeySync(): Promise<void> {
    // Only try in development mode
    if (env.NODE_ENV !== 'development') {
      return;
    }

    // Skip if running inside Docker (detected by Valkey host being a service name)
    if (env.VALKEY_HOST !== 'localhost' && env.VALKEY_HOST !== '127.0.0.1') {
      logger.info('Running inside Docker, skipping auto-start (services managed by docker-compose)');
      return;
    }

    try {
      await this.startValkeyDockerAsync();
    } catch (error) {
      logger.warn({ error }, 'Failed to auto-start Valkey via Docker, continuing without it');
    }
  }

  public getClient(): Redis {
    if (!this.client) {
      throw new Error('Valkey client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  public isReady(): boolean {
    return this.isConnected;
  }

  public async get<T>(key: string): Promise<T | null> {
    if (!this.client) {
      logger.warn('Valkey client not initialized');
      return null;
    }
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
    if (!this.client) {
      logger.warn('Valkey client not initialized');
      return false;
    }
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
    if (!this.client) {
      logger.warn('Valkey client not initialized');
      return false;
    }
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Failed to delete key from Valkey');
      return false;
    }
  }

  public async exists(key: string): Promise<boolean> {
    if (!this.client) {
      logger.warn('Valkey client not initialized');
      return false;
    }
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error({ error, key }, 'Failed to check key existence in Valkey');
      return false;
    }
  }

  public async flush(): Promise<boolean> {
    if (!this.client) {
      logger.warn('Valkey client not initialized');
      return false;
    }
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
    if (!this.client) {
      logger.warn('Valkey client not initialized');
      return false;
    }
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error({ error }, 'Valkey ping failed');
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.client) {
      logger.warn('Valkey client not initialized');
      return;
    }
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

// Export singleton instance (must call initialize() before using)
export const valkeyClient = ValkeyClient.getInstance();
export { ValkeyClient };

/**
 * Initialize Valkey client once at server startup
 * Call this in your server.ts before starting the HTTP server
 */
export async function initializeValkeyClient(): Promise<void> {
  await valkeyClient.initialize();
}
