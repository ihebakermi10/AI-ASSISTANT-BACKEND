import { z } from 'zod';
import { config } from 'dotenv';

// Load dotenv if environment variables are not set
if (!process.env.OPENAI_API_KEY || !process.env.MONGODB_URI) {
  config();
}

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),

  // Deployment configuration
  PUBLIC_URL: z.string().optional(), // For staging/production deployment (e.g., ngrok URL)
  API_BASE_URL: z.string().optional(), // Override for API documentation

  // OpenAI configuration
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  // Pinecone configuration
  PINECONE_API_KEY: z.string().min(1, 'PINECONE_API_KEY is required'),
  PINECONE_INDEX: z.string().min(1, 'PINECONE_INDEX is required'),

  // MongoDB configuration
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),

  // Valkey/Redis configuration
  VALKEY_HOST: z.string().default('localhost'),
  VALKEY_PORT: z.string().default('6379'),
  VALKEY_PASSWORD: z.string().optional(),
  VALKEY_DB: z.string().default('0'),
  VALKEY_TTL: z.string().default('3600'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  try {
    const rawEnv = {
      PORT: process.env.PORT,
      NODE_ENV: process.env.NODE_ENV,
      PUBLIC_URL: process.env.PUBLIC_URL,
      API_BASE_URL: process.env.API_BASE_URL,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_MODEL: process.env.OPENAI_MODEL,
      PINECONE_API_KEY: process.env.PINECONE_API_KEY,
      PINECONE_INDEX: process.env.PINECONE_INDEX,
      MONGODB_URI: process.env.MONGODB_URI,
      VALKEY_HOST: process.env.VALKEY_HOST,
      VALKEY_PORT: process.env.VALKEY_PORT,
      VALKEY_PASSWORD: process.env.VALKEY_PASSWORD,
      VALKEY_DB: process.env.VALKEY_DB,
      VALKEY_TTL: process.env.VALKEY_TTL,
    };

    return envSchema.parse(rawEnv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
      throw new Error(`Environment validation failed:\n${issues.join('\n')}`);
    }
    throw error;
  }
}

export const env = loadEnv();

/**
 * Helper function to get the base URL for API documentation
 * Respects environment-specific configuration
 */
export function getApiBaseUrl(): string {
  // Explicit override takes precedence
  if (env.API_BASE_URL) {
    return env.API_BASE_URL;
  }

  // Use PUBLIC_URL if provided (for staging/production)
  if (env.PUBLIC_URL) {
    return env.PUBLIC_URL;
  }

  // Fallback to localhost for development
  return `http://localhost:${env.PORT}`;
}

/**
 * Check if running in deployed environment (staging/production)
 */
export function isDeployedEnvironment(): boolean {
  return env.NODE_ENV === 'staging' || env.NODE_ENV === 'production';
}
