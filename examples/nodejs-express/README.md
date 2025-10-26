# PathCanary Custom Provider - Reference Implementation

This is a complete, production-ready example of integrating a custom feature flag provider with PathCanary's Assisted Rollback system.

## Overview

This example demonstrates:
- ✅ Webhook endpoint implementation
- ✅ API key authentication
- ✅ Request validation
- ✅ Feature flag toggle logic
- ✅ Audit logging
- ✅ Error handling
- ✅ Health checks

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3002`

### 3. Test the Integration

```bash
# Test successful toggle
curl -X POST http://localhost:3002/webhook/pathcanary \
  -H "Authorization: Bearer test_sk_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "new-checkout-flow",
    "enabled": false,
    "incident_id": "test-123",
    "incident_message": "Testing rollback integration",
    "source": "pathcanary"
  }'

# Expected response:
# {
#   "success": true,
#   "flag_key": "new-checkout-flow",
#   "previous_state": true,
#   "new_state": false,
#   "provider_metadata": {
#     "flag_id": "flag_001",
#     "customer_id": "customer_001",
#     "environment": "production",
#     "updated_at": "2025-10-26T...",
#     "duration_ms": 15
#   }
# }
```

## Test Credentials

### Customer 001
- **API Key**: `test_sk_abc123def456`
- **Customer ID**: `customer_001`
- **Available Flags**:
  - `new-checkout-flow` (enabled: true)
  - `beta-search` (enabled: true)

### Customer 002
- **API Key**: `prod_sk_xyz789ghi012`
- **Customer ID**: `customer_002`
- **Available Flags**:
  - `mobile-app-redesign` (enabled: false)

## API Endpoints

### Webhook Endpoint

```http
POST /webhook/pathcanary
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "flag_key": "new-checkout-flow",
  "enabled": false,
  "incident_id": "inc_abc123",
  "incident_message": "Critical incident detected",
  "source": "pathcanary",
  "metadata": {
    "organization_id": "org_xyz",
    "funnel_id": "funnel_001",
    "severity": "critical",
    "timestamp": "2025-10-26T14:32:00.000Z"
  }
}
```

**Success Response:**
```json
{
  "success": true,
  "flag_key": "new-checkout-flow",
  "previous_state": true,
  "new_state": false,
  "provider_metadata": {
    "flag_id": "flag_001",
    "customer_id": "customer_001",
    "environment": "production",
    "updated_at": "2025-10-26T14:32:01.234Z",
    "duration_ms": 15
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "flag_key": "invalid-flag",
  "previous_state": false,
  "new_state": false,
  "error": "Feature flag 'invalid-flag' not found for customer customer_001",
  "provider_metadata": {
    "customer_id": "customer_001",
    "environment": "production"
  }
}
```

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "PathCanary Custom Feature Flag Provider",
  "version": "1.0.0",
  "timestamp": "2025-10-26T14:32:00.000Z"
}
```

### Get Feature Flag (Testing)

```http
GET /flags/:flagKey
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "id": "flag_001",
  "key": "new-checkout-flow",
  "enabled": true,
  "environment": "production",
  "description": "New checkout experience",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

### List All Flags (Testing)

```http
GET /flags
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "flags": [
    {
      "id": "flag_001",
      "key": "new-checkout-flow",
      "enabled": true,
      ...
    }
  ],
  "count": 2
}
```

### Get Audit Log (Testing)

```http
GET /audit-log?limit=50
Authorization: Bearer YOUR_API_KEY
```

**Response:**
```json
{
  "logs": [
    {
      "timestamp": "2025-10-26T14:32:00.000Z",
      "action": "FLAG_TOGGLED",
      "customer_id": "customer_001",
      "flag_key": "new-checkout-flow",
      "previous_state": true,
      "new_state": false,
      "incident_id": "inc_abc123",
      ...
    }
  ],
  "count": 1
}
```

## Testing with PathCanary SDK

```javascript
const { PathCanaryPartnerClient } = require('@pathcanary/partner-sdk')

const client = new PathCanaryPartnerClient({
  webhookUrl: 'http://localhost:3002/webhook/pathcanary',
  apiKey: 'test_sk_abc123def456',
  debug: true
})

// Run integration test
const results = await client.runIntegrationTest('new-checkout-flow')

console.log('Test Results:', results)
```

## Customization

### Add Your Database

Replace the in-memory `database` object with your actual database:

```javascript
// Example with MongoDB
const { MongoClient } = require('mongodb')

const client = new MongoClient(process.env.MONGODB_URI)
await client.connect()
const db = client.db('feature-flags')

// Get flag
const flag = await db.collection('flags').findOne({
  customer_id: req.customer.id,
  key: flag_key
})

// Update flag
await db.collection('flags').updateOne(
  { customer_id: req.customer.id, key: flag_key },
  { $set: { enabled, updated_at: new Date() } }
)
```

### Add Environment Support

```javascript
// Extract environment from metadata
const environment = metadata.environment || 'production'

// Query flag for specific environment
const flag = await db.collection('flags').findOne({
  customer_id: req.customer.id,
  key: flag_key,
  environment: environment
})
```

### Add Rate Limiting

```javascript
const rateLimit = require('express-rate-limit')

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later'
})

app.use('/webhook/pathcanary', limiter)
```

## Deployment

### Environment Variables

```bash
PORT=3002
NODE_ENV=production
DATABASE_URL=postgresql://...
API_KEY_ENCRYPTION_SECRET=your-secret-key
LOG_LEVEL=info
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3002

CMD ["node", "server.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pathcanary-custom-provider
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: provider
        image: your-org/pathcanary-provider:1.0.0
        ports:
        - containerPort: 3002
        env:
        - name: PORT
          value: "3002"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: provider-secrets
              key: database-url
```

## Monitoring

### Metrics to Track

- **Request volume**: Number of webhook requests
- **Success rate**: % of successful toggles
- **Response time**: P50, P95, P99 latency
- **Error rate**: % of failed requests

### Example with Prometheus

```javascript
const promClient = require('prom-client')

const requestDuration = new promClient.Histogram({
  name: 'pathcanary_webhook_duration_seconds',
  help: 'Duration of PathCanary webhook requests',
  labelNames: ['status']
})

const requestCounter = new promClient.Counter({
  name: 'pathcanary_webhook_requests_total',
  help: 'Total PathCanary webhook requests',
  labelNames: ['status', 'customer']
})

// In webhook handler
const end = requestDuration.startTimer()
// ... process request ...
end({ status: 'success' })
requestCounter.inc({ status: 'success', customer: req.customer.id })
```

## Security Checklist

- [ ] Use HTTPS in production
- [ ] Validate all input
- [ ] Rate limit requests
- [ ] Log authentication failures
- [ ] Encrypt API keys at rest
- [ ] Sanitize error messages
- [ ] Implement request timeouts
- [ ] Add CORS headers if needed

## Troubleshooting

### Error: "Invalid API key"

- Check that you're using the correct API key
- Ensure `Authorization: Bearer YOUR_API_KEY` header is set
- Verify API key is active in your system

### Error: "Flag not found"

- Check that flag_key matches exactly (case-sensitive)
- Verify the flag exists for the authenticated customer
- Check environment parameter if using multi-environment setup

### Slow response times

- Add database indexes on customer_id and flag_key
- Implement caching for frequently accessed flags
- Use connection pooling for database
- Monitor database query performance

## Support

- **Documentation**: https://docs.pathcanary.com/partners
- **Email**: partners@pathcanary.com
- **Slack**: #pathcanary-partners

## License

MIT
