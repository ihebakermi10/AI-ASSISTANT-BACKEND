# `src/services/` Folder

## Role

This folder contains the core business logic of the application. Services encapsulate specific functionalities, orchestrate interactions between different components (e.g., tools, databases), and apply business rules. They are designed to be independent of the presentation layer (controllers/routes) and infrastructure details.

## Best Practices & Design Principles

*   **Single Responsibility Principle (SRP):** Each service is designed to have a single, well-defined responsibility, making it easier to understand, test, and maintain.
*   **Clean Code:** Services adhere to clean code principles, focusing on readability, maintainability, and testability. Complex logic is broken down into smaller, manageable functions.
*   **Orchestrator Pattern:** The `orchestrator.service.ts` exemplifies an orchestrator pattern, coordinating the execution of different AI tools (RAG, Database) based on the AI model's function calls. This centralizes the decision-making and flow control for AI interactions.
*   **Dependency Injection:** Services typically receive their dependencies (e.g., database clients, tool implementations) through constructor injection, promoting loose coupling and facilitating unit testing.
*   **Abstraction:** Services interact with infrastructure components (like database clients or external APIs) through well-defined interfaces or abstractions, shielding them from implementation details.
*   **Transaction Management:** If complex operations involving multiple data sources were present, services would be the appropriate place to manage transactions to ensure data consistency.
