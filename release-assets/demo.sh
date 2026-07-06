#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm run build
REPLYLANE_ALLOW_LOCAL_UNAUTH=true node dist/server.js &
PID=$!
sleep 1
echo "=== Health ==="
curl -s http://127.0.0.1:3070/v1/replylane/health | head -c 200
echo ""
echo "=== Opportunity ==="
curl -s -X POST http://127.0.0.1:3070/v1/replylane/opportunity/score \
  -H 'Content-Type: application/json' \
  -d '{"tweetText":"We tested reply timing across 50 accounts.","authorHandle":"builder","authorFollowers":8000,"replyCount":5,"ageMinutes":4,"yourFollowers":800,"yourNiche":"SaaS"}' | head -c 350
echo ""
echo "=== Draft ==="
curl -s -X POST http://127.0.0.1:3070/v1/replylane/replies/draft \
  -H 'Content-Type: application/json' \
  -d '{"tweetText":"How do you grow on X in 2026?","yourNiche":"SaaS","count":2}' | head -c 350
echo ""
echo "=== Risk ==="
curl -s -X POST http://127.0.0.1:3070/v1/replylane/replies/risk \
  -H 'Content-Type: application/json' \
  -d '{"replyText":"Great post!"}' | head -c 250
echo ""
kill $PID
wait $PID 2>/dev/null || true
echo "Demo complete."