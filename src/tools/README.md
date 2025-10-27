# `src/tools/` Folder

## Role

This folder contains the implementations of the specific tools that the AI Assistant can utilize. These tools encapsulate the logic for interacting with external systems or performing specialized tasks, such as retrieving information from a vector database (RAG Tool) or querying a traditional database (Database Tool).

## Best Practices & Design Principles

*   **Encapsulation:** Each tool encapsulates its specific logic and dependencies, providing a clear and isolated interface for the AI orchestrator.
*   **Clear Function Signatures:** Tool functions are designed with clear and well-defined input parameters and return types, making them easily consumable by the OpenAI function calling mechanism.
*   **Single Responsibility Principle (SRP):** Each tool focuses on a single, well-defined task (e.g., `rag.tool.ts` for RAG, `database.tool.ts` for database queries).
*   **Abstraction:** Tools abstract away the underlying implementation details of external services (Pinecone, MongoDB), allowing the orchestrator to interact with them through a consistent interface.
*   **Error Handling:** Tools implement robust error handling for their specific external interactions, ensuring that failures are gracefully managed and reported.
*   **OpenAI Function Calling Compatibility:** Designed specifically to expose functionalities that can be dynamically called by the OpenAI model, demonstrating a key aspect of the project's AI capabilities.
