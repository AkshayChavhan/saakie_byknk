#\!/bin/bash
# Test webhook endpoint
echo "Testing webhook endpoint..."
curl -X POST http://localhost:3001/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -H "svix-id: test" \
  -H "svix-timestamp: test" \
  -H "svix-signature: test" \
  -d '{"test": "data"}' \
  -v
