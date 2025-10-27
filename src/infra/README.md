# `src/infra/` Folder

## Role

This folder is dedicated to infrastructure concerns, handling external integrations and low-level technical details. It abstracts away the complexities of interacting with databases, external APIs (like OpenAI and Pinecone), caching mechanisms (Valkey), and logging systems, providing clean interfaces for the application's business logic.

## Best Practices & Design Principles

*   **Dependency Inversion Principle (DIP):** High-level modules (services) do not depend on low-level modules (infrastructure implementations). Both depend on abstractions. This promotes loose coupling and makes the application more flexible and testable.
*   **Singleton Pattern:** Clients for external services (e.g., `mongo.client.ts`, `openai.client.ts`, `pinecone.client.ts`, `valkey.client.ts`) are often implemented as singletons to ensure a single, shared instance across the application, managing resources efficiently and preventing multiple connections.
*   **Centralized Logging (Pino):** Integration with `pino` provides structured, high-performance logging, crucial for monitoring, debugging, and auditing the application in production environments.
*   **Abstraction:** Provides clear and consistent interfaces for interacting with external systems, shielding the rest of the application from implementation details.
*   **Error Handling:** Implements robust error handling for external interactions, ensuring resilience and graceful degradation.
