# `src/controllers/` Folder

## Role

This folder contains the controllers responsible for handling incoming HTTP requests, processing them, and orchestrating the appropriate responses. Controllers act as the entry points for the API, receiving user input and delegating tasks to the service layer.

## Best Practices & Design Principles

*   **Thin Controllers:** Controllers are kept as lean as possible, focusing primarily on request parsing, validation (if not handled by middleware), and delegating business logic to the service layer. This adheres to the Single Responsibility Principle (SRP).
*   **Request/Response Handling:** Responsible for managing the Koa `Context` object, extracting request parameters, and setting the response status and body.
*   **Error Handling:** Controllers are designed to catch and handle errors gracefully, returning appropriate HTTP status codes and error messages to the client.
*   **Dependency Injection:** Services and other dependencies are typically injected into controllers, promoting loose coupling and testability.
