#!/bin/bash

# API Testing Script for AI Assistant Backend
# Tests both local and ngrok endpoints

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

BASE_URL=${1:-"http://localhost:3000"}
NGROK_URL="https://${NGROK_DOMAIN}"

echo "========================================="
echo "API Testing Script"
echo "========================================="
echo ""
echo "Testing URL: $BASE_URL"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "---------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Health check successful"
    echo "$BODY" | python -m json.tool 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
    echo "$BODY"
fi
echo ""

# Test 2: Root Endpoint
echo "Test 2: Root Endpoint"
echo "---------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Root endpoint successful"
    echo "$BODY" | python -m json.tool 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}✗ FAIL${NC} - HTTP $HTTP_CODE"
    echo "$BODY"
fi
echo ""

# Test 3: Invalid Request (no query)
echo "Test 3: Validation - Missing Query"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/ask" \
    -H "Content-Type: application/json" \
    -d '{}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Validation working correctly"
    echo "$BODY" | python -m json.tool 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}✗ FAIL${NC} - Expected 400, got HTTP $HTTP_CODE"
    echo "$BODY"
fi
echo ""

# Test 4: Simple Query
echo "Test 4: Simple Query"
echo "--------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/ask" \
    -H "Content-Type: application/json" \
    -d '{"query": "Hello"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Simple query successful"
    echo "$BODY" | python -m json.tool 2>/dev/null | head -20 || echo "$BODY" | head -20
else
    echo -e "${YELLOW}⚠ WARNING${NC} - HTTP $HTTP_CODE"
    echo "$BODY" | head -20
fi
echo ""

# Test 5: RAG Query
echo "Test 5: RAG Query (Policy Question)"
echo "------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/ask" \
    -H "Content-Type: application/json" \
    -d '{"query": "What is the refund policy?"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - RAG query successful"
    echo "$BODY" | python -m json.tool 2>/dev/null | head -30 || echo "$BODY" | head -30
else
    echo -e "${YELLOW}⚠ WARNING${NC} - HTTP $HTTP_CODE"
    echo "$BODY" | head -20
fi
echo ""

# Test 6: Database Query
echo "Test 6: Database Query (Orders)"
echo "--------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/ask" \
    -H "Content-Type: application/json" \
    -d '{"query": "Show me all orders"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} - Database query successful"
    echo "$BODY" | python -m json.tool 2>/dev/null | head -30 || echo "$BODY" | head -30
else
    echo -e "${YELLOW}⚠ WARNING${NC} - HTTP $HTTP_CODE"
    echo "$BODY" | head -20
fi
echo ""

echo "========================================="
echo "Testing Complete"
echo "========================================="
echo ""

if [ "$BASE_URL" = "http://localhost:3000" ] && [ -n "$NGROK_DOMAIN" ]; then
    echo "To test via ngrok, run:"
    echo "./scripts/testing/test-api.sh $NGROK_URL"
fi
