# `src/config/` Folder

## Role

This folder is responsible for centralizing and managing all application configurations, including environment variables, API settings, and third-party service configurations. It ensures that configuration is handled consistently and securely across different environments (development, staging, production).

## Best Practices & Design Principles

*   **Centralized Configuration:** All configuration logic resides in one place, making it easy to manage, update, and audit.
*   **Environment-Specific Settings:** Supports different configurations for various environments, allowing for flexible deployment.
*   **Type-Safe Validation (Zod):** Utilizes `Zod` for schema validation of environment variables. This ensures that all required environment variables are present and correctly typed at application startup, preventing common configuration-related errors and enhancing robustness.
*   **Separation of Concerns:** Keeps configuration logic separate from business logic, improving modularity and testability.
*   **Security:** Encourages the use of environment variables for sensitive information, preventing hardcoding of credentials.
