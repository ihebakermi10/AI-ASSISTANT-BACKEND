// Load dotenv in development and test environments
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
  await import('dotenv/config');
}

import { startServer } from './server.js';

void startServer();
