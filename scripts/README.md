# `scripts/` Folder

## Role

This folder houses various utility scripts designed to automate common development, deployment, data ingestion, and testing tasks. These scripts streamline workflows, ensure consistency, and provide convenient ways to interact with the application's different components.

## Best Practices & Design Principles

*   **Automation:** Centralizes scripts for repetitive tasks, reducing manual effort and potential for human error.
*   **Clear Naming:** Scripts are named descriptively (e.g., `seed.ts`, `index-doc.ts`, `test-api.sh`) to clearly indicate their purpose.
*   **Modularity:** Scripts are organized into subdirectories based on their function (e.g., `deployment`, `ingestion`, `testing`), improving navigability and maintainability.
*   **Data Ingestion:** Contains scripts for seeding databases (MongoDB) and indexing documents into the vector database (Pinecone), essential for setting up the application's data sources.
*   **Testing Utilities:** Provides scripts to facilitate various testing scenarios, from checking connections to running specific API tests.
*   **Deployment Helpers:** Includes scripts to assist with deployment-related tasks, such as deploying with `ngrok` for public access during development or staging.
