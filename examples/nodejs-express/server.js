/**
 * PathCanary Custom Feature Flag Provider - Reference Implementation
 *
 * This is a complete, production-ready example of integrating a custom
 * feature flag provider with PathCanary's Assisted Rollback system.
 *
 * @version 1.0.0
 * @license MIT
 */

const express = require('express')
const bodyParser = require('body-parser')
const crypto = require('crypto')

const app = express()
const PORT = process.env.PORT || 3002

// Middleware
app.use(bodyParser.json())

// In-memory database (replace with your actual database)
const database = {
  // API keys: { key: customer_id }
  apiKeys: {
    'test_sk_abc123def456': 'customer_001',
    'prod_sk_xyz789ghi012': 'customer_002'
  },

  // Feature flags: { customer_id: { flag_key: { ...flag_data } } }
  featureFlags: {
    customer_001: {
      'new-checkout-flow': {
        id: 'flag_001',
        key: 'new-checkout-flow',
        enabled: true,
        environment: 'production',
        description: 'New checkout experience',
        created_at: '2025-01-15T10:00:00Z',
        updated_at: '2025-01-15T10:00:00Z'
      },
      'beta-search': {
        id: 'flag_002',
        key: 'beta-search',
        enabled: true,
        environment: 'production',
        description: 'Beta search algorithm',
        created_at: '2025-02-01T12:00:00Z',
        updated_at: '2025-02-01T12:00:00Z'
      }
    },
    customer_002: {
      'mobile-app-redesign': {
        id: 'flag_003',
        key: 'mobile-app-redesign',
        enabled: false,
        environment: 'production',
        description: 'Mobile app UI redesign',
        created_at: '2025-03-10T08:00:00Z',
        updated_at: '2025-03-10T08:00:00Z'
      }
    }
  },

  // Audit log: [{ timestamp, customer_id, action, ... }]
  auditLog: []
}

/**
 * Middleware: Validate API Key
 */
function validateApiKey(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing or invalid Authorization header. Expected format: Bearer YOUR_API_KEY'
    })
  }

  const apiKey = authHeader.substring(7) // Remove 'Bearer ' prefix
  const customerId = database.apiKeys[apiKey]

  if (!customerId) {
    logAuditEvent({
      action: 'AUTH_FAILED',
      api_key: apiKey.substring(0, 10) + '...',
      ip: req.ip,
      user_agent: req.headers['user-agent']
    })

    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    })
  }

  // Attach customer to request
  req.customer = {
    id: customerId,
    apiKey: apiKey
  }

  next()
}

/**
 * Middleware: Request Logging
 */
function logRequest(req, res, next) {
  const requestId = req.headers['x-pathcanary-request-id'] || generateRequestId()

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  console.log(`  Request ID: ${requestId}`)
  console.log(`  Customer: ${req.customer?.id || 'unknown'}`)
  console.log(`  User-Agent: ${req.headers['user-agent']}`)

  req.requestId = requestId
  next()
}

/**
 * PathCanary Webhook Endpoint
 *
 * POST /webhook/pathcanary
 *
 * This is the main integration point with PathCanary.
 */
app.post('/webhook/pathcanary', validateApiKey, logRequest, async (req, res) => {
  const startTime = Date.now()

  try {
    // Extract request data
    const {
      flag_key,
      enabled,
      incident_id,
      incident_message,
      source,
      metadata = {}
    } = req.body

    // Validate required fields
    if (!flag_key) {
      return res.status(400).json({
        success: false,
        flag_key: '',
        previous_state: false,
        new_state: false,
        error: 'Missing required field: flag_key'
      })
    }

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        flag_key,
        previous_state: false,
        new_state: false,
        error: 'Missing or invalid required field: enabled (must be boolean)'
      })
    }

    if (!incident_id || !incident_message) {
      return res.status(400).json({
        success: false,
        flag_key,
        previous_state: false,
        new_state: false,
        error: 'Missing required fields: incident_id, incident_message'
      })
    }

    if (source !== 'pathcanary') {
      return res.status(400).json({
        success: false,
        flag_key,
        previous_state: false,
        new_state: false,
        error: 'Invalid source. Expected "pathcanary"'
      })
    }

    // Get customer's feature flags
    const customerFlags = database.featureFlags[req.customer.id] || {}
    const flag = customerFlags[flag_key]

    // Check if flag exists
    if (!flag) {
      logAuditEvent({
        action: 'FLAG_NOT_FOUND',
        customer_id: req.customer.id,
        flag_key,
        incident_id,
        request_id: req.requestId
      })

      return res.status(200).json({
        success: false,
        flag_key,
        previous_state: false,
        new_state: false,
        error: `Feature flag '${flag_key}' not found for customer ${req.customer.id}`,
        provider_metadata: {
          customer_id: req.customer.id,
          environment: metadata.environment || 'production'
        }
      })
    }

    // Get previous state
    const previousState = flag.enabled

    // Toggle the flag
    flag.enabled = enabled
    flag.updated_at = new Date().toISOString()
    flag.updated_by = 'pathcanary'
    flag.update_reason = `Incident ${incident_id}: ${incident_message}`

    // Save to database (in real implementation, use transaction)
    customerFlags[flag_key] = flag

    // Log audit event
    logAuditEvent({
      action: 'FLAG_TOGGLED',
      customer_id: req.customer.id,
      flag_key,
      flag_id: flag.id,
      previous_state: previousState,
      new_state: enabled,
      incident_id,
      incident_message,
      request_id: req.requestId,
      metadata
    })

    const duration = Date.now() - startTime

    // Return success response
    res.status(200).json({
      success: true,
      flag_key,
      previous_state: previousState,
      new_state: enabled,
      provider_metadata: {
        flag_id: flag.id,
        customer_id: req.customer.id,
        environment: flag.environment,
        updated_at: flag.updated_at,
        duration_ms: duration
      }
    })

    console.log(`✅ Successfully toggled flag '${flag_key}': ${previousState} → ${enabled} (${duration}ms)`)

  } catch (error) {
    console.error('❌ Error processing PathCanary webhook:', error)

    const duration = Date.now() - startTime

    logAuditEvent({
      action: 'WEBHOOK_ERROR',
      customer_id: req.customer?.id,
      error: error.message,
      stack: error.stack,
      request_id: req.requestId,
      duration_ms: duration
    })

    res.status(500).json({
      success: false,
      flag_key: req.body.flag_key || '',
      previous_state: false,
      new_state: false,
      error: 'Internal server error. Please contact support.',
      provider_metadata: {
        request_id: req.requestId,
        duration_ms: duration
      }
    })
  }
})

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'PathCanary Custom Feature Flag Provider',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  })
})

/**
 * Get Feature Flag (for testing)
 */
app.get('/flags/:flagKey', validateApiKey, (req, res) => {
  const { flagKey } = req.params
  const customerFlags = database.featureFlags[req.customer.id] || {}
  const flag = customerFlags[flagKey]

  if (!flag) {
    return res.status(404).json({
      error: `Flag '${flagKey}' not found`
    })
  }

  res.json(flag)
})

/**
 * List All Feature Flags (for testing)
 */
app.get('/flags', validateApiKey, (req, res) => {
  const customerFlags = database.featureFlags[req.customer.id] || {}

  res.json({
    flags: Object.values(customerFlags),
    count: Object.keys(customerFlags).length
  })
})

/**
 * Get Audit Log (for testing)
 */
app.get('/audit-log', validateApiKey, (req, res) => {
  const limit = parseInt(req.query.limit) || 50
  const customerLogs = database.auditLog
    .filter(log => log.customer_id === req.customer.id)
    .slice(-limit)
    .reverse()

  res.json({
    logs: customerLogs,
    count: customerLogs.length
  })
})

/**
 * Helper: Log Audit Event
 */
function logAuditEvent(event) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...event
  }

  database.auditLog.push(logEntry)

  // Keep only last 1000 entries (in real implementation, use proper database)
  if (database.auditLog.length > 1000) {
    database.auditLog = database.auditLog.slice(-1000)
  }

  console.log('[AUDIT]', JSON.stringify(logEntry))
}

/**
 * Helper: Generate Request ID
 */
function generateRequestId() {
  return `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`
}

/**
 * Error Handler
 */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    request_id: req.requestId
  })
})

/**
 * Start Server
 */
app.listen(PORT, () => {
  console.log('='.repeat(60))
  console.log('🚀 PathCanary Custom Feature Flag Provider')
  console.log('='.repeat(60))
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook/pathcanary`)
  console.log(`💚 Health check:     http://localhost:${PORT}/health`)
  console.log(`📊 Get flags:        http://localhost:${PORT}/flags`)
  console.log(`📜 Audit log:        http://localhost:${PORT}/audit-log`)
  console.log('='.repeat(60))
  console.log('\n✅ Server is ready to receive PathCanary webhooks\n')
  console.log('Test credentials:')
  console.log('  API Key: test_sk_abc123def456')
  console.log('  Customer: customer_001')
  console.log('  Flags: new-checkout-flow, beta-search')
  console.log('\nExample request:')
  console.log(`  curl -X POST http://localhost:${PORT}/webhook/pathcanary \\`)
  console.log('    -H "Authorization: Bearer test_sk_abc123def456" \\')
  console.log('    -H "Content-Type: application/json" \\')
  console.log('    -d \'{"flag_key":"new-checkout-flow","enabled":false,"incident_id":"test-123","incident_message":"Test rollback","source":"pathcanary"}\'')
  console.log('='.repeat(60))
})

module.exports = app
