import pino from 'pino';
import { env } from '@/config/env.js';

const isProduction = env.NODE_ENV === 'production';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : 'info',
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: true,
        },
      },
  base: {
    env: env.NODE_ENV,
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;
