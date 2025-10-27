# `src/` Folder

## Role

This folder contains the core source code of the AI Assistant Backend application. It is organized into subdirectories, each responsible for a specific aspect of the application's functionality, promoting a modular and maintainable codebase.

## Best Practices & Design Principles

*   **Modularity and Separation of Concerns:** Each subdirectory (`config`, `controllers`, `domain`, `infra`, `routes`, `services`, `tools`, `utils`) encapsulates a distinct set of responsibilities, minimizing interdependencies and enhancing maintainability.
*   **TypeScript:** The entire codebase is written in TypeScript, ensuring type safety, improving code readability, and reducing runtime errors through static analysis.
*   **Clean Code:** Adherence to clean code principles, including meaningful naming, small functions, and clear logic, is prioritized throughout the `src/` directory.
*   **Layered Architecture:** The structure reflects a layered architecture, separating concerns from the presentation layer (routes/controllers) to the business logic (services) and infrastructure details (infra/tools).
