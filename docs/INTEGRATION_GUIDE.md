# Integration Guide

## Overview

PathCanary integrates with feature flag platforms to provide automated rollback capabilities. When a critical incident is detected, PathCanary sends a webhook request to disable the associated feature flag.

## Architecture

```
┌─────────────────┐
│  PathCanary     │
│  Monitoring     │
└────────┬────────┘
         │ Detects critical incident
         ↓
┌─────────────────┐
│  Webhook API    │ ← POST /webhook/pathcanary
│  (Your System)  │
└────────┬────────┘
         │ Toggle flag
         ↓
┌─────────────────┐
│  Feature Flag   │
│  Platform       │
└─────────────────┘
```

## Webhook Endpoint

### Request

Your integration must implement a webhook endpoint:

**Endpoint**: `POST /webhook/pathcanary`
**Authentication**: `Bearer {api_key}`
**Content-Type**: `application/json`

### Request Body

```json
{
  "flag_key": "new-checkout-flow",
  "enabled": false,
  "incident_id": "inc_123abc",
  "incident_message": "Critical: Checkout conversion dropped 45%",
  "source": "pathcanary",
  "metadata": {
    "funnel_id": "funnel_xyz",
    "severity": "critical",
    "triggered_at": "2025-10-26T14:30:00Z"
  }
}
```

### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `flag_key` | string | Yes | Feature flag identifier |
| `enabled` | boolean | Yes | Target state (false for rollback) |
| `incident_id` | string | Yes | PathCanary incident ID |
| `incident_message` | string | Yes | Human-readable description |
| `source` | string | Yes | Always "pathcanary" |
| `metadata` | object | No | Additional context |

### Response

Return a JSON response with the following structure:

```json
{
  "success": true,
  "flag_key": "new-checkout-flow",
  "previous_state": true,
  "new_state": false,
  "provider_metadata": {
    "flag_id": "flag_abc123",
    "environment": "production",
    "updated_at": "2025-10-26T14:30:05Z",
    "duration_ms": 150
  }
}
```

### Response Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | boolean | Yes | Whether flag toggle succeeded |
| `flag_key` | string | Yes | Echo of request flag_key |
| `previous_state` | boolean | Yes | Flag state before toggle |
| `new_state` | boolean | Yes | Flag state after toggle |
| `provider_metadata` | object | No | Additional provider-specific data |

### Error Response

```json
{
  "success": false,
  "flag_key": "invalid-flag",
  "previous_state": false,
  "new_state": false,
  "error": "Feature flag 'invalid-flag' not found"
}
```

## Authentication

PathCanary uses Bearer token authentication. Each customer has a unique API key.

### Example

```http
POST /webhook/pathcanary HTTP/1.1
Host: api.yourplatform.com
Authorization: Bearer sk_live_abc123def456
Content-Type: application/json

{
  "flag_key": "new-checkout-flow",
  "enabled": false,
  ...
}
```

### Security Requirements

- ✅ Validate Bearer token on every request
- ✅ Use HTTPS only (TLS 1.2+)
- ✅ Rate limit: 100 requests/minute per customer
- ✅ Log all authentication attempts
- ✅ Return 401 for invalid tokens

## Implementation Steps

### 1. Create Webhook Endpoint

Implement a POST endpoint at `/webhook/pathcanary`:

```javascript
// Node.js/Express example
app.post('/webhook/pathcanary', authenticateApiKey, async (req, res) => {
  const { flag_key, enabled, incident_id, incident_message } = req.body;

  // Validate request
  if (!flag_key || typeof enabled !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields'
    });
  }

  // Toggle flag
  const flag = await toggleFlag(req.customer.id, flag_key, enabled);

  // Return response
  res.json({
    success: true,
    flag_key,
    previous_state: flag.previousState,
    new_state: flag.enabled
  });
});
```

### 2. Implement Authentication

Validate Bearer tokens:

```javascript
const authenticateApiKey = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Missing Authorization header'
    });
  }

  const apiKey = authHeader.substring(7);
  const customer = await validateApiKey(apiKey);

  if (!customer) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  req.customer = customer;
  next();
};
```

### 3. Toggle Feature Flag

Implement flag toggle logic:

```javascript
const toggleFlag = async (customerId, flagKey, enabled) => {
  const flag = await db.flags.findOne({
    customerId,
    key: flagKey
  });

  if (!flag) {
    throw new Error(`Flag '${flagKey}' not found`);
  }

  const previousState = flag.enabled;

  await db.flags.update(flag.id, { enabled });

  return { previousState, enabled };
};
```

### 4. Add Audit Logging

Log all flag toggles:

```javascript
await auditLog.create({
  action: 'FLAG_TOGGLED',
  customerId: req.customer.id,
  flagKey: flag_key,
  previousState: flag.previousState,
  newState: enabled,
  incidentId: incident_id,
  incidentMessage: incident_message,
  source: 'pathcanary',
  timestamp: new Date()
});
```

### 5. Handle Errors

Gracefully handle errors:

```javascript
app.post('/webhook/pathcanary', authenticateApiKey, async (req, res) => {
  try {
    // ... implementation
  } catch (error) {
    console.error('Webhook error:', error);

    res.status(200).json({
      success: false,
      flag_key: req.body.flag_key,
      previous_state: false,
      new_state: false,
      error: error.message
    });
  }
});
```

## Testing

### Manual Testing

Test your endpoint with cURL:

```bash
curl -X POST https://api.yourplatform.com/webhook/pathcanary \
  -H "Authorization: Bearer test_key" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "test-flag",
    "enabled": false,
    "incident_id": "test-123",
    "incident_message": "Test rollback",
    "source": "pathcanary"
  }'
```

### Automated Testing

Use our Partner SDK:

```bash
npm install @pathcanary/partner-sdk

# Create test file
cat > test.js << 'EOF'
const { PathCanaryPartnerClient } = require('@pathcanary/partner-sdk');

const client = new PathCanaryPartnerClient({
  webhookUrl: 'https://api.yourplatform.com/webhook/pathcanary',
  apiKey: 'test_key'
});

async function test() {
  const results = await client.runIntegrationTest('test-flag');
  console.log(results);
}

test();
EOF

# Run tests
node test.js
```

### Test Checklist

- [ ] Health check endpoint returns 200
- [ ] Valid API key accepted
- [ ] Invalid API key rejected with 401
- [ ] Flag toggle works (true → false)
- [ ] Flag toggle works (false → true)
- [ ] Invalid flag key handled gracefully
- [ ] Response time < 2 seconds
- [ ] Audit log records all actions

## Performance Requirements

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Response Time | < 500ms | < 2000ms | > 5000ms |
| Success Rate | > 99.5% | > 99% | < 99% |
| Availability | 99.9% | 99.5% | < 99.5% |

## Go-Live Process

### Phase 1: Development (Week 1-2)
- Implement webhook endpoint
- Add authentication
- Implement flag toggle logic
- Set up audit logging

### Phase 2: Testing (Week 2-3)
- Internal testing with Partner SDK
- Beta testing with 2-3 customers
- Performance testing
- Security review

### Phase 3: Launch (Week 4)
- Production deployment
- Documentation published
- Co-marketing announcement
- General availability

## Support

- **Technical Questions**: dev@pathcanary.com
- **Partnership Questions**: partners@pathcanary.com
- **Documentation**: https://github.com/raducut/pathcanary-parteners

---

**Next Steps**: Review the [API Specification](./API_SPECIFICATION.md) for detailed endpoint documentation.
