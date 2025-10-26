# PathCanary Partner SDK

TypeScript SDK for testing and validating your PathCanary feature flag integration.

## Installation

```bash
npm install @pathcanary/partner-sdk
```

## Usage

```typescript
import { PathCanaryPartnerClient } from '@pathcanary/partner-sdk';

const client = new PathCanaryPartnerClient({
  webhookUrl: 'https://api.yourplatform.com/webhook/pathcanary',
  apiKey: 'your_api_key',
  timeout: 5000
});

// Test flag toggle
const result = await client.testToggleFlag({
  flag_key: 'new-checkout-flow',
  enabled: false,
  incident_id: 'test-123',
  incident_message: 'Testing integration',
  source: 'pathcanary'
});

console.log('Success:', result.success);
console.log('Previous state:', result.previous_state);
console.log('New state:', result.new_state);
```

## Integration Test Suite

Run comprehensive validation of your webhook endpoint:

```typescript
const testResults = await client.runIntegrationTest('test-flag');

console.log('All tests passed:', testResults.success);
console.log('Results:');
testResults.results.forEach(test => {
  console.log(`  ${test.test}: ${test.passed ? '✅' : '❌'}`);
  console.log(`    Duration: ${test.duration}ms`);
  if (test.error) console.log(`    Error: ${test.error}`);
});
```

## API

### PathCanaryPartnerClient

#### Constructor Options

- `webhookUrl` (string, required) - Your webhook endpoint URL
- `apiKey` (string, required) - API key for authentication
- `timeout` (number, optional) - Request timeout in milliseconds (default: 5000)
- `retries` (number, optional) - Number of retry attempts (default: 3)

#### Methods

##### testToggleFlag(request: PathCanaryRollbackRequest): Promise<PathCanaryRollbackResponse>

Test a single flag toggle request.

##### runIntegrationTest(flagKey: string): Promise<IntegrationTestResults>

Run a complete integration test suite that validates:
- Authentication
- Flag toggle (enable/disable)
- Error handling
- Response time
- Invalid inputs

## TypeScript Types

```typescript
interface PathCanaryRollbackRequest {
  flag_key: string;
  enabled: boolean;
  incident_id: string;
  incident_message: string;
  source: string;
  metadata?: Record<string, any>;
}

interface PathCanaryRollbackResponse {
  success: boolean;
  flag_key: string;
  previous_state: boolean;
  new_state: boolean;
  error?: string;
  provider_metadata?: Record<string, any>;
}
```

## License

MIT
