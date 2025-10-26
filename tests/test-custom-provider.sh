#!/bin/bash

# PathCanary Custom Provider - Quick Test Script
# Tests the custom provider example implementation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PROVIDER_URL="${PROVIDER_URL:-http://localhost:3002}"
API_KEY="${API_KEY:-test_sk_abc123def456}"

echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}PathCanary Custom Provider - Integration Test${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "${CYAN}Provider URL: ${PROVIDER_URL}${NC}"
echo -e "${CYAN}API Key: ${API_KEY:0:20}...${NC}"
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" "${PROVIDER_URL}/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo -e "${CYAN}   Response: ${BODY}${NC}"
else
    echo -e "${RED}❌ Health check failed (HTTP ${HTTP_CODE})${NC}"
    exit 1
fi
echo ""

# Test 2: Authentication - Valid API Key
echo -e "${YELLOW}Test 2: Valid Authentication${NC}"
RESPONSE=$(curl -s -X POST "${PROVIDER_URL}/webhook/pathcanary" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "new-checkout-flow",
    "enabled": false,
    "incident_id": "test-valid-auth",
    "incident_message": "Testing valid authentication",
    "source": "pathcanary"
  }' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
    SUCCESS=$(echo "$BODY" | grep -o '"success":true' || echo "")
    if [ -n "$SUCCESS" ]; then
        echo -e "${GREEN}✅ Authentication and flag toggle successful${NC}"
        echo -e "${CYAN}   Response: ${BODY}${NC}"
    else
        echo -e "${YELLOW}⚠️  Request succeeded but flag toggle failed${NC}"
        echo -e "${CYAN}   Response: ${BODY}${NC}"
    fi
else
    echo -e "${RED}❌ Request failed (HTTP ${HTTP_CODE})${NC}"
    echo -e "${CYAN}   Response: ${BODY}${NC}"
    exit 1
fi
echo ""

# Test 3: Authentication - Invalid API Key
echo -e "${YELLOW}Test 3: Invalid Authentication${NC}"
RESPONSE=$(curl -s -X POST "${PROVIDER_URL}/webhook/pathcanary" \
  -H "Authorization: Bearer invalid_key_123" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "new-checkout-flow",
    "enabled": false,
    "incident_id": "test-invalid-auth",
    "incident_message": "Testing invalid authentication",
    "source": "pathcanary"
  }' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✅ Invalid API key correctly rejected${NC}"
    echo -e "${CYAN}   Response: ${BODY}${NC}"
else
    echo -e "${RED}❌ Expected HTTP 401, got ${HTTP_CODE}${NC}"
    echo -e "${CYAN}   Response: ${BODY}${NC}"
fi
echo ""

# Test 4: Invalid Flag Key
echo -e "${YELLOW}Test 4: Invalid Flag Key${NC}"
RESPONSE=$(curl -s -X POST "${PROVIDER_URL}/webhook/pathcanary" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "invalid-flag-xyz",
    "enabled": false,
    "incident_id": "test-invalid-flag",
    "incident_message": "Testing invalid flag key",
    "source": "pathcanary"
  }' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
    SUCCESS=$(echo "$BODY" | grep -o '"success":false' || echo "")
    if [ -n "$SUCCESS" ]; then
        echo -e "${GREEN}✅ Invalid flag key handled correctly${NC}"
        echo -e "${CYAN}   Response: ${BODY}${NC}"
    else
        echo -e "${YELLOW}⚠️  Unexpected success for invalid flag${NC}"
        echo -e "${CYAN}   Response: ${BODY}${NC}"
    fi
else
    echo -e "${RED}❌ Unexpected HTTP code: ${HTTP_CODE}${NC}"
    echo -e "${CYAN}   Response: ${BODY}${NC}"
fi
echo ""

# Test 5: Toggle Flag ON
echo -e "${YELLOW}Test 5: Toggle Flag ON${NC}"
RESPONSE=$(curl -s -X POST "${PROVIDER_URL}/webhook/pathcanary" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "new-checkout-flow",
    "enabled": true,
    "incident_id": "test-enable-flag",
    "incident_message": "Testing flag re-enable",
    "source": "pathcanary"
  }' \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
    NEW_STATE=$(echo "$BODY" | grep -o '"new_state":true' || echo "")
    if [ -n "$NEW_STATE" ]; then
        echo -e "${GREEN}✅ Flag toggled ON successfully${NC}"
        echo -e "${CYAN}   Response: ${BODY}${NC}"
    else
        echo -e "${YELLOW}⚠️  Flag state not as expected${NC}"
        echo -e "${CYAN}   Response: ${BODY}${NC}"
    fi
else
    echo -e "${RED}❌ Request failed (HTTP ${HTTP_CODE})${NC}"
    echo -e "${CYAN}   Response: ${BODY}${NC}"
fi
echo ""

# Test 6: Performance Test
echo -e "${YELLOW}Test 6: Response Time Check${NC}"
START_TIME=$(date +%s%N)
RESPONSE=$(curl -s -X POST "${PROVIDER_URL}/webhook/pathcanary" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "flag_key": "new-checkout-flow",
    "enabled": false,
    "incident_id": "test-performance",
    "incident_message": "Performance test",
    "source": "pathcanary"
  }' \
  -w "\n%{http_code}")
END_TIME=$(date +%s%N)

DURATION_MS=$(( (END_TIME - START_TIME) / 1000000 ))

if [ $DURATION_MS -lt 2000 ]; then
    echo -e "${GREEN}✅ Response time: ${DURATION_MS}ms (< 2000ms recommended)${NC}"
elif [ $DURATION_MS -lt 5000 ]; then
    echo -e "${YELLOW}⚠️  Response time: ${DURATION_MS}ms (acceptable but could be faster)${NC}"
else
    echo -e "${RED}❌ Response time: ${DURATION_MS}ms (exceeds 5000ms threshold)${NC}"
fi
echo ""

# Test 7: Get Audit Log
echo -e "${YELLOW}Test 7: Audit Log${NC}"
RESPONSE=$(curl -s -X GET "${PROVIDER_URL}/audit-log?limit=5" \
  -H "Authorization: Bearer ${API_KEY}" \
  -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Audit log retrieved successfully${NC}"
    LOG_COUNT=$(echo "$BODY" | grep -o '"count":[0-9]*' | grep -o '[0-9]*' || echo "0")
    echo -e "${CYAN}   Log entries: ${LOG_COUNT}${NC}"
else
    echo -e "${RED}❌ Failed to retrieve audit log (HTTP ${HTTP_CODE})${NC}"
fi
echo ""

# Summary
echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""
echo -e "${GREEN}✅ Custom provider integration tests completed!${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo -e "  1. Configure this provider in PathCanary Settings → Rollback"
echo -e "  2. Set your webhook URL to: ${PROVIDER_URL}/webhook/pathcanary"
echo -e "  3. Use API key: ${API_KEY}"
echo -e "  4. Test with a real incident or manual rollback"
echo ""
echo -e "${CYAN}Provider documentation:${NC}"
echo -e "  examples/custom-provider/README.md"
echo ""
