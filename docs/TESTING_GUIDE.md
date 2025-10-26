# PathCanary Feature Flag Rollback - Testing Guide

This guide will help you test the complete feature flag rollback implementation.

## Prerequisites

- PathCanary application running
- Node.js 18+ installed
- Access to Supabase database

## Test Scenarios

### Scenario 1: Test Custom Provider (Recommended)

This tests the complete webhook flow using the example custom provider.

#### Step 1: Start Custom Provider Server

```bash
# Terminal 1: Start the custom provider
cd examples/custom-provider
npm install
npm start
```

You should see:
```
🚀 PathCanary Custom Feature Flag Provider
📡 Webhook endpoint: http://localhost:3002/webhook/pathcanary
✅ Server is ready to receive PathCanary webhooks
```

#### Step 2: Run Integration Tests

```bash
# Terminal 2: Run automated tests
cd tests
./test-custom-provider.sh
```

**Expected output:**
```
✅ Health check passed
✅ Authentication and flag toggle successful
✅ Invalid API key correctly rejected
✅ Invalid flag key handled correctly
✅ Flag toggled ON successfully
✅ Response time: 15ms (< 2000ms recommended)
✅ Audit log retrieved successfully
```

#### Step 3: Test Via PathCanary UI

1. **Configure Rollback Integration**
   ```
   Go to: Settings → Rollback → Add Configuration

   Funnel: [Select a test funnel]
   Integration Type: Feature Flag Toggle
   Provider: Custom API
   API Key: test_sk_abc123def456
   Flag Key: new-checkout-flow
   Environment: production
   Custom API URL: http://localhost:3002/webhook/pathcanary

   ✅ Enable Configuration
   ✅ Auto-rollback on Critical
   ```

2. **Trigger Manual Rollback**
   ```
   Go to: Settings → Rollback → [Your Configuration]
   Click: "Test Rollback" or trigger from an incident
   ```

3. **Verify Rollback History**
   ```
   Go to: Settings → Rollback → History tab

   You should see:
   - Trigger Type: Manual (or Auto if triggered by incident)
   - Status: Success
   - Integration: feature_flag
   - Flag Key: new-checkout-flow
   - State: true → false
   ```

---

### Scenario 2: Test LaunchDarkly Integration

If you have a LaunchDarkly account:

#### Step 1: Get LaunchDarkly Credentials

1. Go to https://app.launchdarkly.com
2. Account Settings → Authorization
3. Create API Access Token with `Writer` role
4. Copy the token (starts with `api-...`)

#### Step 2: Configure in PathCanary

```
Settings → Rollback → Add Configuration

Funnel: [Select funnel]
Integration Type: Feature Flag Toggle
Provider: LaunchDarkly
API Key: [Your LaunchDarkly token]
Flag Key: [Your flag key]
Environment: production
```

#### Step 3: Test

1. Create a test incident (severity: critical)
2. Watch as the flag is automatically disabled
3. Check LaunchDarkly dashboard to verify

---

### Scenario 3: Test Complete E2E Flow

This tests the entire incident → rollback → recovery flow.

#### Step 1: Set Up Test Environment

```bash
# 1. Start custom provider
cd examples/custom-provider
npm start

# 2. Configure rollback in PathCanary UI
# Follow Scenario 1, Step 3

# 3. Create a test funnel with monitoring enabled
```

#### Step 2: Trigger Incident

Option A: Via API
```bash
curl -X POST http://localhost:3000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "funnel_id": "YOUR_FUNNEL_ID",
    "severity": "critical",
    "message": "Test incident - feature flag rollback",
    "source": "manual_test"
  }'
```

Option B: Via n8n workflow
```bash
curl -X POST http://localhost:5678/webhook/anomaly-check \
  -H "Content-Type: application/json" \
  -d '{
    "funnel_id": "YOUR_FUNNEL_ID",
    "organization_id": "YOUR_ORG_ID",
    "run_id": "test-run-123",
    "status": "fail",
    "device": "desktop",
    "metrics": {"total_ms": 15000},
    "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'"
  }'
```

#### Step 3: Verify Rollback Execution

1. **Check Logs**
   ```bash
   # Custom provider logs
   # Should show: ✅ Successfully toggled flag 'new-checkout-flow': true → false

   # PathCanary app logs
   docker logs pathcanary-app-1 -f | grep rollback
   ```

2. **Check Database**
   ```sql
   -- Check rollback history
   SELECT * FROM rollback_history
   ORDER BY executed_at DESC
   LIMIT 5;

   -- Check incident status
   SELECT id, severity, status, message
   FROM incidents
   ORDER BY created_at DESC
   LIMIT 5;
   ```

3. **Check UI**
   - Dashboard → Overview → Status Banner (should show rollback event)
   - Settings → Rollback → History (should show execution)
   - Funnel Detail → Should show "Assisted Rollback Active" badge

#### Step 4: Verify Recovery

1. **Re-enable the flag**
   ```bash
   curl -X POST http://localhost:3002/webhook/pathcanary \
     -H "Authorization: Bearer test_sk_abc123def456" \
     -H "Content-Type: application/json" \
     -d '{
       "flag_key": "new-checkout-flow",
       "enabled": true,
       "incident_id": "recovery-test",
       "incident_message": "Manual recovery",
       "source": "pathcanary"
     }'
   ```

2. **Mark incident as resolved**
   - Go to: Incidents → [Your Incident]
   - Click: "Mark as Resolved"

---

## Automated Test Suite

### Run All Tests

```bash
# Install dependencies (first time only)
cd /srv/docker/pathcanary
npm install

# Run TypeScript integration tests
npx ts-node tests/test-feature-flag-rollback.ts

# Run shell script tests (custom provider)
./tests/test-custom-provider.sh
```

### Individual Tests

```bash
# Test 1: Health check
curl http://localhost:3002/health

# Test 2: Valid authentication
curl -X POST http://localhost:3002/webhook/pathcanary \
  -H "Authorization: Bearer test_sk_abc123def456" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "new-checkout-flow",
    "enabled": false,
    "incident_id": "test-123",
    "incident_message": "Manual test",
    "source": "pathcanary"
  }'

# Test 3: Invalid API key
curl -X POST http://localhost:3002/webhook/pathcanary \
  -H "Authorization: Bearer invalid_key" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "new-checkout-flow",
    "enabled": false,
    "incident_id": "test-456",
    "incident_message": "Auth test",
    "source": "pathcanary"
  }'

# Test 4: Get audit log
curl -X GET http://localhost:3002/audit-log \
  -H "Authorization: Bearer test_sk_abc123def456"
```

---

## Verification Checklist

### Custom Provider Tests
- [ ] Health check returns 200 OK
- [ ] Valid API key accepted
- [ ] Invalid API key rejected (401)
- [ ] Flag toggle successful (true → false)
- [ ] Invalid flag key handled gracefully
- [ ] Response time < 2 seconds
- [ ] Audit log populated

### PathCanary Integration Tests
- [ ] Rollback config created successfully
- [ ] Manual rollback triggers flag toggle
- [ ] Auto-rollback triggers on critical incidents
- [ ] Rollback history recorded
- [ ] Status banner shows rollback event
- [ ] Funnel shows "Assisted Rollback Active" badge
- [ ] Email/Slack alerts sent (if configured)

### E2E Flow Tests
- [ ] Incident creation triggers auto-rollback
- [ ] Flag disabled within 5 seconds
- [ ] Provider receives correct payload
- [ ] Rollback history shows all details
- [ ] Incident status updates correctly
- [ ] Recovery workflow completes

---

## Common Issues

### Issue: Custom provider not starting

**Solution:**
```bash
cd examples/custom-provider
rm -rf node_modules
npm install
npm start
```

### Issue: "Connection refused" errors

**Solution:**
- Check that custom provider is running on port 3002
- Verify no firewall blocking localhost:3002
- Try: `curl http://localhost:3002/health`

### Issue: "Invalid API key" in PathCanary

**Solution:**
- Use exact API key: `test_sk_abc123def456`
- Check for trailing spaces in config
- Verify provider logs show authentication attempts

### Issue: Flag not toggling

**Solution:**
- Check custom provider logs for errors
- Verify flag key matches exactly: `new-checkout-flow`
- Check audit log: `curl http://localhost:3002/audit-log -H "Authorization: Bearer test_sk_abc123def456"`

### Issue: Rollback not triggering automatically

**Solution:**
- Verify rollback config has `auto_rollback_on_critical: true`
- Check incident severity is `critical` (not `high`)
- Verify rollback config is `enabled: true`
- Check n8n workflow is running

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Response Time | < 500ms | < 2000ms | > 5000ms |
| Success Rate | > 99.5% | > 99% | < 99% |
| Availability | 99.9% | 99.5% | < 99.5% |

### Load Testing

```bash
# Install apache bench (if not installed)
# Ubuntu: sudo apt-get install apache2-utils
# macOS: brew install httpd

# Test with 100 requests, 10 concurrent
ab -n 100 -c 10 \
  -H "Authorization: Bearer test_sk_abc123def456" \
  -H "Content-Type: application/json" \
  -p /tmp/test-payload.json \
  http://localhost:3002/webhook/pathcanary
```

**Expected results:**
- Mean response time: < 100ms
- 99% percentile: < 500ms
- No failed requests

---

## Next Steps

After successful testing:

1. **Production Deployment**
   - Deploy custom provider to production environment
   - Use HTTPS endpoint (required)
   - Configure production API keys
   - Set up monitoring and alerting

2. **Partner Integration**
   - Contact feature flag providers
   - Share integration documentation
   - Schedule technical review calls
   - Coordinate beta testing

3. **Documentation**
   - Create customer-facing setup guides
   - Record demo videos
   - Write blog posts
   - Update partner portal

4. **Monitoring**
   - Set up Datadog/New Relic dashboards
   - Configure PagerDuty alerts
   - Track success rate metrics
   - Monitor customer adoption

---

## Support

- **Technical Issues**: dev@pathcanary.com
- **Partner Questions**: partners@pathcanary.com
- **Documentation**: https://docs.pathcanary.com/partners
- **Slack**: #pathcanary-partners

---

**Last Updated**: October 26, 2025
**Version**: 1.0.0
