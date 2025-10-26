/**
 * PathCanary Custom Provider - Test Suite
 *
 * Run this to validate your implementation before going live
 */

const http = require('http')

const BASE_URL = process.env.TEST_URL || 'http://localhost:3002'
const API_KEY = process.env.TEST_API_KEY || 'test_sk_abc123def456'

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
}

let testResults = []

/**
 * Make HTTP request
 */
async function request(method, path, body = null, headers = {}) {
  const url = new URL(path, BASE_URL)

  const options = {
    method,
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  }

  if (body) {
    options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body))
  }

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          })
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          })
        }
      })
    })

    req.on('error', reject)

    if (body) {
      req.write(JSON.stringify(body))
    }

    req.end()
  })
}

/**
 * Run a single test
 */
async function runTest(name, testFn) {
  const start = Date.now()

  try {
    await testFn()
    const duration = Date.now() - start

    console.log(`${colors.green}✓${colors.reset} ${name} ${colors.gray}(${duration}ms)${colors.reset}`)

    testResults.push({
      name,
      passed: true,
      duration
    })
  } catch (error) {
    const duration = Date.now() - start

    console.log(`${colors.red}✗${colors.reset} ${name} ${colors.gray}(${duration}ms)${colors.reset}`)
    console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`)

    testResults.push({
      name,
      passed: false,
      duration,
      error: error.message
    })
  }
}

/**
 * Assert helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

/**
 * Test Suite
 */
async function runTests() {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`)
  console.log(`${colors.blue}PathCanary Custom Provider - Test Suite${colors.reset}`)
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`)
  console.log(`Testing: ${BASE_URL}`)
  console.log(`API Key: ${API_KEY.substring(0, 15)}...\n`)

  // Test 1: Health Check
  await runTest('Health check returns 200', async () => {
    const res = await request('GET', '/health')
    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(res.body.status === 'healthy', 'Health check failed')
  })

  // Test 2: Authentication - Missing API Key
  await runTest('Rejects request without API key', async () => {
    const res = await request('POST', '/webhook/pathcanary', {
      flag_key: 'test',
      enabled: false,
      incident_id: 'test-123',
      incident_message: 'Test',
      source: 'pathcanary'
    })
    assert(res.status === 401, `Expected 401, got ${res.status}`)
    assert(res.body.error.includes('Authorization'), 'Should mention authorization')
  })

  // Test 3: Authentication - Invalid API Key
  await runTest('Rejects request with invalid API key', async () => {
    const res = await request('POST', '/webhook/pathcanary', {
      flag_key: 'test',
      enabled: false,
      incident_id: 'test-123',
      incident_message: 'Test',
      source: 'pathcanary'
    }, {
      'Authorization': 'Bearer invalid_key_123'
    })
    assert(res.status === 401, `Expected 401, got ${res.status}`)
    assert(res.body.error.includes('Invalid'), 'Should say invalid API key')
  })

  // Test 4: Valid Request - Toggle Flag OFF
  await runTest('Successfully toggles flag OFF', async () => {
    const res = await request('POST', '/webhook/pathcanary', {
      flag_key: 'new-checkout-flow',
      enabled: false,
      incident_id: 'test-123',
      incident_message: 'Test rollback',
      source: 'pathcanary'
    }, {
      'Authorization': `Bearer ${API_KEY}`
    })

    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(res.body.success === true, 'Should succeed')
    assert(res.body.flag_key === 'new-checkout-flow', 'Should return correct flag_key')
    assert(res.body.new_state === false, 'Should set flag to false')
    assert(res.body.provider_metadata, 'Should include provider_metadata')
  })

  // Test 5: Valid Request - Toggle Flag ON
  await runTest('Successfully toggles flag ON', async () => {
    const res = await request('POST', '/webhook/pathcanary', {
      flag_key: 'new-checkout-flow',
      enabled: true,
      incident_id: 'test-456',
      incident_message: 'Test re-enable',
      source: 'pathcanary'
    }, {
      'Authorization': `Bearer ${API_KEY}`
    })

    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(res.body.success === true, 'Should succeed')
    assert(res.body.new_state === true, 'Should set flag to true')
  })

  // Test 6: Invalid Flag Key
  await runTest('Returns error for non-existent flag', async () => {
    const res = await request('POST', '/webhook/pathcanary', {
      flag_key: 'invalid-flag-xyz',
      enabled: false,
      incident_id: 'test-789',
      incident_message: 'Test error handling',
      source: 'pathcanary'
    }, {
      'Authorization': `Bearer ${API_KEY}`
    })

    assert(res.status === 200, `Expected 200, got ${res.status}`)
    assert(res.body.success === false, 'Should fail')
    assert(res.body.error, 'Should include error message')
    assert(res.body.error.includes('not found'), 'Error should mention flag not found')
  })

  // Test 7: Missing Required Fields
  await runTest('Returns error for missing flag_key', async () => {
    const res = await request('POST', '/webhook/pathcanary', {
      enabled: false,
      incident_id: 'test-101',
      incident_message: 'Test validation',
      source: 'pathcanary'
    }, {
      'Authorization': `Bearer ${API_KEY}`
    })

    assert(res.status === 400, `Expected 400, got ${res.status}`)
    assert(res.body.error.includes('flag_key'), 'Should mention missing flag_key')
  })

  // Test 8: Invalid Source
  await runTest('Returns error for invalid source', async () => {
    const res = await request('POST', '/webhook/pathcanary', {
      flag_key: 'new-checkout-flow',
      enabled: false,
      incident_id: 'test-102',
      incident_message: 'Test source validation',
      source: 'invalid-source'
    }, {
      'Authorization': `Bearer ${API_KEY}`
    })

    assert(res.status === 400, `Expected 400, got ${res.status}`)
    assert(res.body.error.includes('source'), 'Should mention invalid source')
  })

  // Test 9: Response Time
  await runTest('Responds within 5 seconds', async () => {
    const start = Date.now()
    const res = await request('POST', '/webhook/pathcanary', {
      flag_key: 'new-checkout-flow',
      enabled: false,
      incident_id: 'test-103',
      incident_message: 'Test performance',
      source: 'pathcanary'
    }, {
      'Authorization': `Bearer ${API_KEY}`
    })
    const duration = Date.now() - start

    assert(res.status === 200, 'Should succeed')
    assert(duration < 5000, `Response time ${duration}ms exceeds 5000ms threshold`)
  })

  // Test 10: Idempotency
  await runTest('Handles duplicate requests gracefully', async () => {
    const requestBody = {
      flag_key: 'new-checkout-flow',
      enabled: false,
      incident_id: 'test-104',
      incident_message: 'Test idempotency',
      source: 'pathcanary'
    }
    const headers = { 'Authorization': `Bearer ${API_KEY}` }

    const res1 = await request('POST', '/webhook/pathcanary', requestBody, headers)
    const res2 = await request('POST', '/webhook/pathcanary', requestBody, headers)

    assert(res1.status === 200 && res2.status === 200, 'Both requests should succeed')
    assert(res1.body.new_state === res2.body.new_state, 'Should return same state')
  })

  // Test 11: Metadata Handling
  await runTest('Accepts request with metadata', async () => {
    const res = await request('POST', '/webhook/pathcanary', {
      flag_key: 'new-checkout-flow',
      enabled: false,
      incident_id: 'test-105',
      incident_message: 'Test metadata',
      source: 'pathcanary',
      metadata: {
        organization_id: 'org_xyz',
        funnel_id: 'funnel_001',
        severity: 'critical',
        timestamp: '2025-10-26T14:32:00.000Z'
      }
    }, {
      'Authorization': `Bearer ${API_KEY}`
    })

    assert(res.status === 200, 'Should succeed')
    assert(res.body.success === true, 'Should handle metadata')
  })

  // Print Summary
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`)
  console.log(`${colors.blue}Test Summary${colors.reset}`)
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`)

  const passed = testResults.filter(r => r.passed).length
  const failed = testResults.filter(r => !r.passed).length
  const total = testResults.length

  console.log(`Total: ${total}`)
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`)
  if (failed > 0) {
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`)
  }

  const avgDuration = testResults.reduce((sum, r) => sum + r.duration, 0) / total
  console.log(`Average duration: ${Math.round(avgDuration)}ms\n`)

  if (failed === 0) {
    console.log(`${colors.green}✅ All tests passed!${colors.reset}`)
    console.log(`\nYour implementation is ready for production.\n`)
    process.exit(0)
  } else {
    console.log(`${colors.red}❌ Some tests failed${colors.reset}`)
    console.log(`\nPlease fix the failing tests before deploying to production.\n`)
    process.exit(1)
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error)
  process.exit(1)
})
