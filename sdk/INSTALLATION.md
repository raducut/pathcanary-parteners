# Installing PathCanary Partner SDK from GitHub

Since the SDK is not yet published on NPM, you can install it directly from GitHub.

## Installation

### Method 1: NPM Install from GitHub (Recommended)

```bash
npm install raducut/pathcanary-parteners#main
```

This will install the SDK directly from the GitHub repository.

### Method 2: Package.json Dependency

Add to your `package.json`:

```json
{
  "dependencies": {
    "pathcanary-partner-sdk": "github:raducut/pathcanary-parteners#main"
  }
}
```

Then run:

```bash
npm install
```

### Method 3: Yarn

```bash
yarn add raducut/pathcanary-parteners#main
```

## Usage After Installation

### TypeScript

```typescript
// Import the SDK
import { PathCanaryPartnerClient } from 'pathcanary-partner-sdk/sdk/client';

// Create client instance
const client = new PathCanaryPartnerClient({
  webhookUrl: 'https://api.yourplatform.com/webhook/pathcanary',
  apiKey: 'your_test_api_key',
  timeout: 5000
});

// Test flag toggle
async function testIntegration() {
  const result = await client.testToggleFlag({
    flag_key: 'test-feature-flag',
    enabled: false,
    incident_id: 'test-123',
    incident_message: 'Testing integration',
    source: 'pathcanary'
  });

  console.log('Success:', result.success);
  console.log('Previous state:', result.previous_state);
  console.log('New state:', result.new_state);
}

testIntegration();
```

### JavaScript (with ts-node)

If using plain JavaScript, you'll need `ts-node` to run TypeScript files:

```bash
npm install --save-dev ts-node typescript @types/node
```

Then create a JavaScript file:

```javascript
// test-integration.js
const { PathCanaryPartnerClient } = require('pathcanary-partner-sdk/sdk/client');

const client = new PathCanaryPartnerClient({
  webhookUrl: 'https://api.yourplatform.com/webhook/pathcanary',
  apiKey: 'your_test_api_key',
  timeout: 5000
});

async function testIntegration() {
  const result = await client.testToggleFlag({
    flag_key: 'test-feature-flag',
    enabled: false,
    incident_id: 'test-123',
    incident_message: 'Testing integration',
    source: 'pathcanary'
  });

  console.log('Success:', result.success);
  console.log('Previous state:', result.previous_state);
  console.log('New state:', result.new_state);
}

testIntegration().catch(console.error);
```

Run with:

```bash
npx ts-node test-integration.js
```

## Running Integration Tests

The SDK includes a complete integration test suite:

```typescript
import { PathCanaryPartnerClient } from 'pathcanary-partner-sdk/sdk/client';

const client = new PathCanaryPartnerClient({
  webhookUrl: 'https://api.yourplatform.com/webhook/pathcanary',
  apiKey: 'your_test_api_key'
});

// Run comprehensive integration tests
async function runTests() {
  const results = await client.runIntegrationTest('test-flag');

  console.log('All tests passed:', results.success);
  console.log('\nDetailed Results:');

  results.results.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`${status} ${test.test} (${test.duration}ms)`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });
}

runTests().catch(console.error);
```

## Complete Example Project

Here's a complete example setup:

### 1. Create Project

```bash
mkdir pathcanary-integration-test
cd pathcanary-integration-test
npm init -y
```

### 2. Install Dependencies

```bash
# Install SDK from GitHub
npm install raducut/pathcanary-parteners#main

# Install TypeScript dependencies
npm install --save-dev typescript ts-node @types/node

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "strict": true,
    "resolveJsonModule": true
  }
}
EOF
```

### 3. Create Test File

```bash
cat > test.ts << 'EOF'
import { PathCanaryPartnerClient } from 'pathcanary-partner-sdk/sdk/client';

const client = new PathCanaryPartnerClient({
  webhookUrl: process.env.WEBHOOK_URL || 'http://localhost:3002/webhook/pathcanary',
  apiKey: process.env.API_KEY || 'test_sk_abc123def456',
  timeout: 5000
});

async function main() {
  console.log('🧪 Testing PathCanary Integration\n');

  // Test 1: Single flag toggle
  console.log('Test 1: Flag Toggle');
  const toggleResult = await client.testToggleFlag({
    flag_key: 'test-flag',
    enabled: false,
    incident_id: 'test-001',
    incident_message: 'Testing flag toggle',
    source: 'pathcanary'
  });

  console.log(`  Success: ${toggleResult.success}`);
  console.log(`  Flag: ${toggleResult.flag_key}`);
  console.log(`  State: ${toggleResult.previous_state} → ${toggleResult.new_state}\n`);

  // Test 2: Full integration suite
  console.log('Test 2: Full Integration Suite');
  const integrationResults = await client.runIntegrationTest('test-flag');

  console.log(`  Overall: ${integrationResults.success ? '✅ PASS' : '❌ FAIL'}\n`);

  integrationResults.results.forEach(test => {
    const status = test.passed ? '✅' : '❌';
    console.log(`  ${status} ${test.test} (${test.duration}ms)`);
    if (test.error) {
      console.log(`     Error: ${test.error}`);
    }
  });
}

main().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
EOF
```

### 4. Run Tests

```bash
# Set environment variables (optional)
export WEBHOOK_URL="https://api.yourplatform.com/webhook/pathcanary"
export API_KEY="your_test_api_key"

# Run tests
npx ts-node test.ts
```

## Expected Output

```
🧪 Testing PathCanary Integration

Test 1: Flag Toggle
  Success: true
  Flag: test-flag
  State: true → false

Test 2: Full Integration Suite
  Overall: ✅ PASS

  ✅ Authentication Test (45ms)
  ✅ Flag Toggle Test (52ms)
  ✅ Invalid API Key Test (38ms)
  ✅ Invalid Flag Key Test (41ms)
  ✅ Response Time Test (48ms)
```

## Troubleshooting

### Error: Cannot find module 'pathcanary-partner-sdk/sdk/client'

Make sure the package is installed:

```bash
npm list pathcanary-partner-sdk
```

If not installed, run:

```bash
npm install raducut/pathcanary-parteners#main
```

### TypeScript Errors

Ensure you have TypeScript and ts-node installed:

```bash
npm install --save-dev typescript ts-node @types/node
```

### Module Resolution Issues

If you have import errors, try:

```typescript
// Instead of:
import { PathCanaryPartnerClient } from 'pathcanary-partner-sdk/sdk/client';

// Use absolute path:
import { PathCanaryPartnerClient } from '../node_modules/pathcanary-partner-sdk/sdk/client';
```

## Updating the SDK

To get the latest version:

```bash
npm update pathcanary-partner-sdk
```

Or reinstall:

```bash
npm uninstall pathcanary-partner-sdk
npm install raducut/pathcanary-parteners#main
```

## Support

If you encounter issues:

1. Check the [Integration Guide](../docs/INTEGRATION_GUIDE.md)
2. Review [example implementation](../examples/nodejs-express/)
3. Contact: dev@pathcanary.com

## Future NPM Release

Once the SDK is published to NPM, installation will be simpler:

```bash
npm install @pathcanary/partner-sdk
```

We'll update this documentation when NPM publishing is available.
