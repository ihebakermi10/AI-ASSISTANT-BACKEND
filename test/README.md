# Test Suite Documentation

Comprehensive testing suite for the AI Assistant Backend API.

## Test Structure

```
test/
├── unit/               # Unit tests for individual components
│   ├── services/       # Service layer tests
│   └── utils/          # Utility function tests
├── integration/        # Integration tests for database and cache
├── e2e/               # End-to-end API tests
├── helpers/           # Test utilities and helpers
├── fixtures/          # Mock data for tests
└── setup.ts           # Global test setup
```

## Test Types

### Unit Tests
Located in `test/unit/`, these tests focus on individual functions and modules in isolation using mocks.

**Coverage:**
- `services/rag.service.test.ts` - RAG service with Pinecone integration
- `services/db.service.test.ts` - Database query service
- `services/orchestrator.service.test.ts` - OpenAI function calling orchestration
- `utils/time.test.ts` - Date range parsing utilities
- `utils/cache.test.ts` - Valkey cache utilities

### Integration Tests
Located in `test/integration/`, these tests verify interactions between components with real database connections.

**Coverage:**
- `database.integration.test.ts` - MongoDB operations and connection pooling
- `cache.integration.test.ts` - Valkey cache operations and singleton pattern

### E2E Tests
Located in `test/e2e/`, these tests simulate real user scenarios through the API endpoints.

**Coverage:**
- `ask-endpoint.e2e.test.ts` - Full API flow testing both RAG and Database tools

## Running Tests

### Run All Tests
```bash
pnpm test
```

### Run Tests Once (CI Mode)
```bash
pnpm test:run
```

### Run Specific Test File
```bash
pnpm test test/unit/services/rag.service.test.ts
```

### Run Tests by Pattern
```bash
pnpm test -- --grep "RAG"
```

### Watch Mode (Auto-rerun on changes)
```bash
pnpm test -- --watch
```

## Code Coverage

### Generate Coverage Report
```bash
pnpm test -- --coverage
```

Coverage reports are generated in multiple formats:
- Text output in terminal
- HTML report in `coverage/index.html`
- LCOV format in `coverage/lcov.info`
- JSON format in `coverage/coverage-final.json`

### Coverage Thresholds
Minimum coverage requirements (configured in `vitest.config.ts`):
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

## Environment Setup

### Prerequisites
1. MongoDB running on `localhost:27017`
2. Valkey (Redis) running on `localhost:6379`
3. Environment variables configured in `.env`

### Test Environment Variables
The test suite uses the same `.env` file as development, but sets `NODE_ENV=test` automatically.

Required environment variables:
```env
OPENAI_API_KEY=your-key
PINECONE_API_KEY=your-key
PINECONE_INDEX=your-index
MONGODB_URI=mongodb://localhost:27017/ai-assistant-test
VALKEY_HOST=localhost
VALKEY_PORT=6379
```

## Test Helpers

### Test Server (`test/helpers/test-server.ts`)
Utility for creating isolated test server instances:

```typescript
import { createTestServer } from '../helpers/test-server';

const testServer = createTestServer();
await testServer.start();
// ... run tests
await testServer.stop();
```

### Cleanup Utilities
```typescript
import { cleanupTestData, cleanupTestCache } from '../helpers/test-server';

// Clean MongoDB
await cleanupTestData();

// Clean Valkey cache
await cleanupTestCache();
```

## Test Fixtures

### Mock Orders (`test/fixtures/orders.ts`)
Provides sample order data for database tests:

```typescript
import { mockOrders, mockOrder } from '../fixtures/orders';

// Use predefined mock orders
await Order.insertMany(mockOrders);

// Create custom mock order
const customOrder = mockOrder({ status: 'pending' });
```

### Mock Embeddings (`test/fixtures/embeddings.ts`)
Provides mock embedding vectors and Pinecone matches:

```typescript
import { mockEmbedding, mockPineconeMatches } from '../fixtures/embeddings';

// Mock OpenAI embedding
vi.mocked(createEmbedding).mockResolvedValue(mockEmbedding());

// Mock Pinecone results
vi.mocked(queryPineconeIndex).mockResolvedValue(mockPineconeMatches());
```

## Mocking External Services

### OpenAI API
```typescript
import * as openaiClient from '../../../src/infra/openai.client';

vi.mock('../../../src/infra/openai.client');

vi.mocked(openaiClient.callOpenAI).mockResolvedValue({
  role: 'assistant',
  content: 'Response',
  tool_calls: null,
});
```

### Pinecone
```typescript
import * as pineconeClient from '../../../src/infra/pinecone.client';

vi.mock('../../../src/infra/pinecone.client');

vi.mocked(pineconeClient.queryPineconeIndex).mockResolvedValue([
  { id: 'doc-1', score: 0.9, metadata: { text: 'Context' } }
]);
```

## Best Practices

### 1. Test Isolation
Each test should be independent and not rely on other tests:
```typescript
beforeEach(async () => {
  vi.clearAllMocks();
  await cleanupTestData();
  await cleanupTestCache();
});
```

### 2. Descriptive Test Names
Use clear, descriptive test names:
```typescript
it('should retrieve document context successfully', async () => {
  // ...
});
```

### 3. Arrange-Act-Assert Pattern
```typescript
it('should cache embeddings', async () => {
  // Arrange
  const mockData = { /* ... */ };
  vi.mocked(apiCall).mockResolvedValue(mockData);

  // Act
  const result = await functionUnderTest();

  // Assert
  expect(result).toEqual(expected);
});
```

### 4. Test Edge Cases
Always test:
- Happy path
- Error cases
- Edge cases (empty inputs, null values, etc.)
- Boundary conditions

### 5. Async/Await
Always use async/await for asynchronous operations:
```typescript
it('should handle async operations', async () => {
  await expect(asyncFunction()).resolves.toBe(expected);
});
```

## Debugging Tests

### Enable Debug Logging
Set the `DEBUG` environment variable:
```bash
DEBUG=1 pnpm test
```

### Run Single Test
Use `.only` to run a single test:
```typescript
it.only('should test this specific case', async () => {
  // ...
});
```

### Skip Tests
Use `.skip` to temporarily skip tests:
```typescript
it.skip('should test this later', async () => {
  // ...
});
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Tests
  run: pnpm test:run --coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Troubleshooting

### Tests Hanging
- Check if MongoDB/Valkey connections are properly closed
- Ensure no background processes are running
- Check for infinite loops or missing awaits

### Connection Errors
- Verify MongoDB is running: `mongosh`
- Verify Valkey is running: `valkey-cli ping`
- Check connection strings in `.env`

### Mock Not Working
- Ensure mocks are defined before imports
- Use `vi.clearAllMocks()` in `beforeEach`
- Check mock implementation matches actual function signature

### Coverage Not Generated
- Install coverage provider: `pnpm add -D @vitest/coverage-v8`
- Run with coverage flag: `pnpm test -- --coverage`

## Contributing

When adding new tests:
1. Follow the existing structure
2. Add appropriate fixtures if needed
3. Update this README if adding new test types
4. Ensure tests pass before committing
5. Maintain coverage thresholds

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
