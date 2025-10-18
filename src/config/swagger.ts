import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Assistant API',
      version: '1.0.0',
      description: `
# AI Assistant Backend API

A production-quality AI-powered backend service that uses OpenAI function calling to intelligently route between two tools:

- **RAG Tool**: Retrieval-Augmented Generation using Pinecone vector search for document-based questions
- **Database Tool**: MongoDB queries for structured order data

## Features

- 🤖 OpenAI function calling for intelligent tool selection
- 📚 Vector search with Pinecone for document retrieval
- 🗄️ MongoDB integration for structured data queries
- ⚡ Valkey (Redis) distributed caching with singleton pattern
- 📊 Comprehensive logging with Pino
- 🔒 Type-safe with Zod validation

## Architecture

The API uses OpenAI's function calling capability to analyze user queries and automatically select the appropriate tool:

- Questions about policies, refunds, documentation → **RAG Tool** (Pinecone)
- Questions about orders, customers, transactions → **Database Tool** (MongoDB)

## Example Queries

### RAG Tool (Document Retrieval)
- "What is the refund policy for defective products?"
- "How long does it take to process a refund?"
- "Can I cancel my order after 24 hours?"
- "What items are non-refundable?"

### Database Tool (Order Queries)
- "Show me all orders from Sarah Johnson"
- "Find all pending orders"
- "What orders did John Smith place?"
- "List all completed orders from last week"
      `,
      contact: {
        name: 'Iheb',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'AI Assistant',
        description: 'AI-powered query endpoint with function calling',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
    ],
  },
  apis: [
    process.env.NODE_ENV === 'production'
      ? './dist/routes/*.js'
      : './src/routes/*.ts',
    process.env.NODE_ENV === 'production'
      ? './dist/controllers/*.js'
      : './src/controllers/*.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
