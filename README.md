# AI Assistant Backend

A production-quality AI-powered backend service built with TypeScript, Node.js, and Koa that demonstrates OpenAI function calling to intelligently route between two tools:

- **RAG Tool**: Retrieval-Augmented Generation using Pinecone vector search
- **Database Tool**: MongoDB queries via Mongoose for structured order data

## Features

- OpenAI function calling for intelligent tool selection
- Vector search with Pinecone for document retrieval
- MongoDB integration for structured data queries
- Clean SOLID architecture with clear separation of concerns
- Comprehensive logging with Pino
- Valkey (Redis) distributed caching with singleton pattern
- Input validation with Zod
- TypeScript with strict mode
- ESLint + Prettier for code quality
- Docker Compose for local development

## Architecture

```
ai-assistant-backend/
├── src/
│   ├── app.ts                      # Koa app setup
│   ├── server.ts                   # Server initialization
│   ├── index.ts                    # Entry point
│   ├── routes/
│   │   └── ask.route.ts            # API routes
│   ├── controllers/
│   │   └── ask.controller.ts       # Request handlers
│   ├── services/
│   │   ├── orchestrator.service.ts # Function calling logic
│   │   ├── rag.service.ts          # Pinecone RAG implementation
│   │   └── db.service.ts           # MongoDB queries
│   ├── infra/
│   │   ├── openai.client.ts        # OpenAI SDK wrapper
│   │   ├── pinecone.client.ts      # Pinecone SDK wrapper
│   │   ├── mongo.client.ts         # MongoDB connection
│   │   ├── valkey.client.ts        # Valkey (Redis) singleton client
│   │   └── logger.ts               # Pino logger
│   ├── domain/
│   │   ├── order.model.ts          # Mongoose schema
│   │   └── types.ts                # TypeScript types
│   ├── utils/
│   │   ├── time.ts                 # Date parsing utilities
│   │   └── cache.ts                # Valkey cache implementation
│   └── config/
│       └── env.ts                  # Environment validation
├── scripts/
│   ├── seed.ts                     # Seed MongoDB with sample data
│   └── index-doc.ts                # Index documents to Pinecone
├── docker/
│   └── docker-compose.yml          # MongoDB & Valkey containers
├── test/
│   └── ask.e2e.test.ts             # E2E tests
└── README.md
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm (or npm/yarn)
- Docker and Docker Compose (for MongoDB and Valkey)
- OpenAI API key
- Pinecone account and API key
- MongoDB (via Docker or local installation)
- Valkey/Redis (via Docker or local installation)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-assistant-backend
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini

# Pinecone Configuration
PINECONE_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PINECONE_INDEX=ai-assistant-docs

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/ai-assistant

# Valkey (Redis) Configuration
VALKEY_HOST=localhost
VALKEY_PORT=6379
VALKEY_PASSWORD=
VALKEY_DB=0
VALKEY_TTL=3600
```

### 4. Set Up Pinecone

1. Create a free account at [Pinecone](https://www.pinecone.io/)
2. Create a new index:
   - Name: `ai-assistant-docs`
   - Dimensions: `1536` (for text-embedding-3-small)
   - Metric: `cosine`
3. Copy your API key to `.env`

### 5. Start MongoDB and Valkey

Using Docker Compose:

```bash
cd docker
docker-compose up -d
cd ..
```

This will start both MongoDB and Valkey containers.

Verify containers are running:

```bash
docker ps
```

You should see `ai-assistant-mongo` and `ai-assistant-valkey` running.

Or use your local MongoDB and Valkey/Redis installations.

### 6. Seed MongoDB with Sample Data

```bash
pnpm seed
```

This creates 10 sample orders in the database.

### 7. Index Sample Document to Pinecone

```bash
pnpm index-doc
```

This indexes a sample refund policy document to Pinecone.

### 8. Run the Development Server

```bash
pnpm dev
```

The server will start at `http://localhost:3000`

## API Usage

### Endpoint: POST /ask

Send natural language queries to the AI assistant.

**Request:**

```bash
POST http://localhost:3000/ask
Content-Type: application/json

{
  "query": "Your question here"
}
```

**Response:**

```json
{
  "query": "Your question here",
  "answer": "AI-generated answer",
  "trace": [
    {
      "toolName": "retrieveDocumentContext" | "queryDatabase",
      "arguments": { ... },
      "result": "Preview of tool result",
      "executionTime": 1234
    }
  ]
}
```

## Example Queries

### Example 1: RAG Tool (Document Retrieval)

**Query about refund policy:**

```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the refund policy for defective products?"}'
```

**Sample Response:**

```json
{
  "query": "What is the refund policy for defective products?",
  "answer": "According to our refund policy, customers are eligible for a full refund within 30 days of purchase if the product is defective or not as described. All refund requests must be submitted through our customer portal or by contacting support@example.com. The product must be in original condition with all accessories and packaging, and proof of purchase is required.",
  "trace": [
    {
      "toolName": "retrieveDocumentContext",
      "arguments": {
        "query": "What is the refund policy for defective products?",
        "topK": 4
      },
      "result": "[Context 1] (Score: 0.89, Source: Refund and Cancellation Policy)\n1. General Refund Terms\nCustomers are eligible for a full refund within 30 days of purchase if the product is defective or not as described...",
      "executionTime": 856
    }
  ]
}
```

**Sample Logs:**

```
[INFO] Received /ask request
    query: "What is the refund policy for defective products?"
[INFO] Starting orchestration
[INFO] Created new embedding
    query: "What is the refund policy for defective products?"
[INFO] Pinecone query completed
    matchCount: 4
    topScore: 0.89
[INFO] RAG Tool executed
    matchCount: 4
    relevantCount: 3
    executionTime: 856
[INFO] Tool selected by model
    functionName: "retrieveDocumentContext"
[INFO] Orchestration completed
    toolUsed: "retrieveDocumentContext"
    totalTime: 1523
```

### Example 2: Database Tool (Order Queries)

**Query about customer orders:**

```bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me all orders from Sarah Johnson last week"}'
```

**Sample Response:**

```json
{
  "query": "Show me all orders from Sarah Johnson last week",
  "answer": "Sarah Johnson placed 2 orders last week:\n\n1. Order ORD-2025-002 on October 10, 2025:\n   - Product: Wireless Mouse (Quantity: 2)\n   - Total: $59.98\n   - Status: Completed\n\n2. Order ORD-2025-003 on October 14, 2025:\n   - Product: USB-C Hub (Quantity: 1)\n   - Total: $49.99\n   - Status: Pending",
  "trace": [
    {
      "toolName": "queryDatabase",
      "arguments": {
        "criteria": {
          "customerName": "Sarah Johnson",
          "dateRange": "last week"
        }
      },
      "result": "[\n  {\n    \"orderId\": \"ORD-2025-002\",\n    \"customerName\": \"Sarah Johnson\",\n    \"product\": \"Wireless Mouse\",\n    \"quantity\": 2,\n    \"totalAmount\": 59.98,\n    \"status\": \"completed\",\n    \"orderDate\": \"2025-10-10T00:00:00.000Z\"\n  },\n  {\n    \"orderId\": \"ORD-2025-003\",\n    \"customerName\": \"Sarah Johnson\",\n    \"product\": \"USB-C Hub\",\n    \"quantity\": 1,\n    \"totalAmount\": 49.99,\n    \"status\": \"pending\",\n    \"orderDate\": \"2025-10-14T00:00:00.000Z\"\n  }\n]",
      "executionTime": 234
    }
  ]
}
```

**Sample Logs:**

```
[INFO] Received /ask request
    query: "Show me all orders from Sarah Johnson last week"
[INFO] Starting orchestration
[INFO] Tool selected by model
    functionName: "queryDatabase"
    functionArgs: { criteria: { customerName: "Sarah Johnson", dateRange: "last week" } }
[INFO] Database Tool executed
    criteria: { customerName: "Sarah Johnson", dateRange: "last week" }
    resultCount: 2
    executionTime: 234
[INFO] Orchestration completed
    toolUsed: "queryDatabase"
    totalTime: 1127
```

### More Example Queries

**RAG Tool Examples:**
- "What are the exceptions to the refund policy?"
- "How long does it take to process a refund?"
- "Can I cancel my order after 24 hours?"
- "What items are non-refundable?"

**Database Tool Examples:**
- "Find all pending orders"
- "Show me orders for Laptop Pro 15"
- "List all refunded orders from last month"
- "What orders did John Smith place?"

## Scripts

- `pnpm dev` - Run development server with hot reload
- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm start` - Run production server
- `pnpm lint` - Lint code with ESLint
- `pnpm format` - Format code with Prettier
- `pnpm test` - Run tests with Vitest
- `pnpm seed` - Seed MongoDB with sample data
- `pnpm index-doc` - Index sample document to Pinecone

## Project Highlights

### 1. SOLID Architecture
- **Single Responsibility**: Each module has one clear purpose
- **Dependency Inversion**: Services depend on infrastructure abstractions
- **Clear Boundaries**: Routes → Controllers → Services → Infrastructure

### 2. OpenAI Function Calling
The orchestrator defines two functions that OpenAI can intelligently choose:
- `retrieveDocumentContext`: For policy/documentation questions
- `queryDatabase`: For order/customer data queries

### 3. RAG Implementation
- Embedding generation with `text-embedding-3-small`
- Vector search in Pinecone with similarity scoring
- Distributed caching with Valkey (Redis) using singleton pattern
- Configurable `topK` parameter
- Automatic cache key prefixing and TTL management

### 4. Database Queries
- Flexible criteria: customer name, product, status, date range
- Date range parsing ("last week", "last month", etc.)
- Regex sanitization for security
- Result limiting and sorting

### 5. Logging
Structured logging with Pino captures:
- Request/response details
- Tool selection and execution
- Performance metrics
- Error traces

### 6. Type Safety
- Zod for runtime validation
- TypeScript strict mode
- Explicit return types
- No `any` types in business logic

## Testing

Run the test suite:

```bash
pnpm test
```

The project includes placeholder tests in `test/ask.e2e.test.ts`. Extend these with:
- Supertest for API testing
- Mock data for deterministic tests
- Integration tests with test database

## Production Deployment

1. Build the project:
```bash
pnpm build
```

2. Set environment variables for production

3. Start the server:
```bash
pnpm start
```

4. Use a process manager like PM2:
```bash
pm2 start dist/index.js --name ai-assistant
```

## Troubleshooting

### MongoDB Connection Issues
- Ensure Docker container is running: `docker ps`
- Check MongoDB URI in `.env`
- Verify port 27017 is not in use

### Valkey/Redis Connection Issues
- Ensure Docker container is running: `docker ps`
- Check Valkey configuration in `.env`
- Verify port 6379 is not in use
- Test connection: `docker exec -it ai-assistant-valkey valkey-cli ping`

### Pinecone Errors
- Verify API key is correct
- Check index name matches configuration
- Ensure index dimensions are 1536

### OpenAI API Errors
- Verify API key is valid
- Check you have sufficient credits
- Ensure model name is correct

## License

MIT License - see LICENSE file for details

## Author

Iheb

## Assessment Notes

This project was built as a technical assessment for a Senior AI Engineer position. It demonstrates:

- Clean architecture and code organization
- OpenAI function calling integration
- RAG implementation with vector search
- Database querying with flexible criteria
- Production-quality error handling
- Comprehensive logging and monitoring
- Type safety and validation
- Professional documentation

The implementation follows industry best practices and is ready for extension with additional tools, endpoints, and functionality.