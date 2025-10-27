# AI Assistant Backend

## Overview

This project implements a small AI-powered backend service designed to demonstrate advanced function calling capabilities with the OpenAI API. It integrates two distinct tools: a RAG (Retrieval-Augmented Generation) Tool utilizing Pinecone as a vector database, and a Database Tool for querying structured records from a MongoDB collection via Mongoose.

This project serves as a technical assessment for a Senior AI Engineer position, showcasing proficiency in:
*   Designing and implementing a clean backend in TypeScript and Node.js (using Koa).
*   Integrating OpenAI function calling to dynamically choose the appropriate tool based on user queries.
*   Combining unstructured (RAG) and structured (Database) data sources.
*   Adhering to professional engineering practices, including Git version control, robust architecture, and comprehensive documentation.

## Scenario

The AI Assistant API is built for an internal analytics platform. Its primary role is to interpret user queries in natural language and intelligently decide which backend tool to utilize for generating a response.

**Example Queries:**
*   "What does the refund policy say about cancellations?" → *Uses the RAG Tool (Pinecone).*
*   "Show me all orders placed by John Smith last month." → *Uses the Database Tool (MongoDB).*

## Features

### 1. RAG Tool (Retrieval-Augmented Generation)
*   **Function:** `async function retrieveDocumentContext(query: string): Promise<string>`
*   **Description:** Vectorizes user queries using OpenAI embeddings, performs a similarity search in Pinecone, and returns top N context snippets as a concatenated string. This enables answering questions about specific documents (e.g., product manuals, FAQs, policy documents).

### 2. Database Tool
*   **Function:** `async function queryDatabase(criteria: Record<string, any>): Promise<any[]>`
*   **Description:** Connects to a MongoDB collection via Mongoose, queries data based on user-specified criteria (e.g., customer name, date, product), and returns matching documents in JSON format. Populated with sample records for demonstration.

### 3. Function Calling Orchestrator
*   **Logic:** Receives a user query, calls the OpenAI Chat Completion API with function definitions for both tools, allowing the model to decide which function to call and with what arguments. It then executes the selected function and returns an AI-generated answer, including results and explanations.
*   **Example Flow:**
    1.  User → “Find all orders from Sarah last week.”
    2.  Model → Chooses to call `queryDatabase({ customerName: "Sarah", dateRange: "last week" })`.
    3.  Application executes the query, returns data to the model.
    4.  Model composes the final response and returns it to the client.

### 4. Koa API Setup
*   **Endpoint:** `POST /api/v1/ask`
*   **Body:** `{ "query": "User's question here" }`
*   **Response:** JSON containing the AI’s final answer.
*   **Technology:** Built with TypeScript and Koa.js, with code organized into modular components (routes, services, tools, etc.).

## Tech Stack

*   **Backend Framework:** Node.js, Koa.js
*   **Language:** TypeScript
*   **AI Integration:** OpenAI API (for LLM and embeddings), OpenAI SDK for Agent and Tool development
*   **Vector Database:** Pinecone
*   **NoSQL Database:** MongoDB, Mongoose
*   **Caching:** Valkey (Redis)
*   **Logging:** Pino (structured logging)
*   **Validation:** Zod (type-safe schema validation)
*   **Version Control:** Git
*   **Containerization:** Docker, Docker Compose
*   **Testing:** Vitest (unit, integration, E2E tests)

## Best Practices & Architectural Highlights

This project emphasizes professional engineering practices:

*   **Modular Architecture:** Code is organized into distinct modules (`routes`, `services`, `tools`, `infra`, `config`, `utils`, `domain`) promoting separation of concerns and maintainability.
*   **TypeScript:** Ensures type safety throughout the application, reducing runtime errors and improving code quality.
*   **Clean Code Principles:** Adherence to principles like Single Responsibility (SRP) and Dependency Inversion (DIP) within services and infrastructure layers.
*   **OpenAI Function Calling:** Leverages OpenAI's advanced capabilities for dynamic tool selection, demonstrating intelligent AI orchestration.
*   **RAG Implementation:** Effective use of Pinecone for efficient retrieval of context from unstructured data, enhancing AI responses.
*   **Database Integration:** Seamless querying of structured data from MongoDB using Mongoose, showcasing robust data access patterns.
*   **Connection Pooling:** Implicitly handled by Mongoose for MongoDB and `ioredis` for Valkey, ensuring efficient resource management.
*   **Structured Logging (Pino):** Provides detailed, machine-readable logs for better monitoring, debugging, and analysis.
*   **Environment Configuration (Zod):** Type-safe validation of environment variables at startup, preventing common configuration-related issues.
*   **Caching (Valkey):** Implemented for performance optimization, reducing redundant computations or external API calls.
*   **Containerization (Docker):** Ensures consistent development, staging, and production environments, simplifying deployment.
*   **Comprehensive Testing (Vitest):** Includes unit, integration, and end-to-end tests to ensure reliability and correctness of the application.
*   **API Versioning:** Endpoints are prefixed with `/api/v1/` for clear version management.

## Setup Instructions

### Prerequisites

*   Node.js (v18 or higher)
*   Docker & Docker Compose
*   OpenAI API Key
*   Pinecone API Key & Environment
*   Git

### Environment Variables

Create a `.env` file in the project root based on `.env.example`. Populate it with your specific API keys and configurations.

```ini
# ============================================ 
# SERVER CONFIGURATION
# ============================================ 
HOS_API_PORT=3001
NODE_ENV=development # or staging, production

# ============================================ 
# DEPLOYMENT CONFIGURATION
# ============================================ 
# Your ngrok public URL (used for Swagger docs)
PUBLIC_URL=
# Optional: Override if different from PUBLIC_URL
API_BASE_URL=

# ============================================ 
# OPENAI CONFIGURATION
# ============================================ 
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4o-2024-05-13 # or gpt-3.5-turbo, etc.

# ============================================ 
# PINECONE CONFIGURATION
# ============================================ 
PINECONE_API_KEY=your-pinecone-api-key-here
PINECONE_INDEX=ai-assistant-docs # Your Pinecone index name

# ============================================ 
# MONGODB CONFIGURATION (Docker)
# ============================================ 
MONGODB_URI=mongodb://mongodb:27017/ai-assistant

# ============================================ 
# VALKEY CONFIGURATION (Docker)
# ============================================ 
VALKEY_HOST=valkey
VALKEY_PORT=6379
VALKEY_PASSWORD=
VALKEY_DB=0
VALKEY_TTL=3600
```

### Docker Setup

The project uses Docker Compose for easy setup of the application and its dependencies (MongoDB, Valkey).

1.  **Build and Start Containers (Development):**
    ```bash
    docker-compose -f docker-compose.dev.yml build --no-cache
    docker-compose -f docker-compose.dev.yml up -d
    ```
    This will build the `app` service and start `app`, `mongodb`, and `valkey` in detached mode.

2.  **Verify Container Status:**
    ```bash
    docker-compose -f docker-compose.dev.yml ps
    ```

### Data Ingestion (Seeding)

To make the RAG and Database tools functional, you need to seed data:

1.  **Seed MongoDB (Sample Orders):**
    ```bash
    pnpm run seed:db
    ```
    This script (`scripts/ingestion/seed.ts`) populates MongoDB with sample order data.

2.  **Seed Pinecone (Document for RAG):**
    ```bash
    pnpm run seed:pinecone
    ```
    This script (`scripts/ingestion/index-doc.ts`) processes a sample document (e.g., a refund policy) and indexes its embeddings into Pinecone.

## How to Run Locally

1.  **Install Dependencies:**
    ```bash
    pnpm install
    ```

2.  **Start the Application (with Docker Compose):**
    Ensure Docker containers are running as per "Docker Setup" above. The application will be accessible on `http://localhost:3001`.

3.  **Access API Documentation (Swagger UI):**
    Open your browser to `http://localhost:3001/docs`.

## API Endpoints

### `POST /api/v1/ask`

*   **Description:** Send a natural language query to the AI Assistant. The system uses OpenAI function calling to intelligently route your question to the appropriate tool (RAG or Database).
*   **Request Body:**
    ```json
    {
      "query": "User's natural language question here"
    }
    ```
*   **Example Queries:**
    *   **RAG Tool:** `{"query": "What is the refund policy for defective products?"}`
    *   **Database Tool:** `{"query": "Show me all orders from Sarah Johnson last week."}`
    *   **Aggregate Query:** `{"query": "How many completed orders do we have and what's the total revenue?"}`

*   **Example cURL Request:**
    ```bash
    curl -X POST http://localhost:3001/api/v1/ask \
      -H "Content-Type: application/json" \
      -d '{"query": "What is the refund policy for defective products?"}'
    ```

## Recommendations for Enhancement

To further elevate this project and demonstrate advanced AI engineering capabilities, consider the following enhancements:

1.  **Advanced RAG with Ranking Models:**
    *   **Enhancement:** Integrate a re-ranking model (e.g., Cohere Rerank, BGE-reranker) after the initial Pinecone similarity search.
    *   **Benefit:** Improves the relevance of retrieved context snippets, leading to more accurate and nuanced AI responses, especially for complex queries.

2.  **Hierarchical RAG with Vertex AI:**
    *   **Enhancement:** Explore hierarchical RAG architectures, potentially leveraging Google Cloud Platform (GCP) services like Vertex AI for managing different levels of context (e.g., document-level, section-level, paragraph-level embeddings).
    *   **Benefit:** Provides more granular control over context retrieval, allowing the AI to focus on the most relevant information and handle larger, more complex knowledge bases efficiently.

3.  **Managed Connection Pooling (MCP Layer) for External Tools:**
    *   **Enhancement:** Implement a dedicated Managed Connection Pooling (MCP) layer, possibly using a FastAPI server for external tools. This layer would manage connections to various external services (e.g., third-party APIs, legacy systems) that your AI agent might interact with.
    *   **Benefit:** Improves reliability, scalability, and performance by efficiently managing and reusing connections, preventing resource exhaustion, and providing a centralized point for monitoring and error handling for external tool calls.

4.  **Langsmith for Observability and Debugging:**
    *   **Enhancement:** Integrate Langsmith (or similar LLM observability platforms) for comprehensive monitoring, debugging, and evaluation of the AI agent's performance.
    *   **Benefit:** Provides visibility into prompt engineering, tool execution traces, model responses, and user feedback, enabling rapid iteration, performance optimization, and identification of failure modes in complex AI workflows.

5.  **Dynamic Tool Registration and Discovery:**
    *   **Enhancement:** Implement a mechanism for dynamic registration and discovery of tools, rather than hardcoding them. This could involve a tool registry service.
    *   **Benefit:** Increases the flexibility and scalability of the AI assistant, allowing new tools to be added or updated without modifying the core orchestrator logic.

## Deliverables

The GitHub repository contains:
1.  Source code (in TypeScript).
2.  `README.md` with setup instructions, how to run locally, and example input/output queries.
3.  Example logs showing both tools being triggered by the model (can be generated by running the `test:rag` script).

## Bonus Features Implemented

*   **Structured Logging:** Implemented using `pino` for enhanced observability.
*   **Caching:** Implemented using `Valkey` (Redis) for performance optimization.
*   **cURL Examples:** Provided for easy testing of the `/ask` endpoint.
*   **Environment Variable Validation:** Using `Zod` for robust configuration management.
*   **Multi-stage Dockerfiles:** Optimized Docker images for development, staging, and production.
