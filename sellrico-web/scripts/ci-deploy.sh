#!/usr/bin/env bash
set -euo pipefail

WEB_DIR=/opt/shoppio/web

cd "$WEB_DIR"

cat > "$WEB_DIR/.env" <<'EOF'
NEXT_PUBLIC_APP_URL=https://sellrico.com
NEXT_PUBLIC_API_URL=https://api.sellrico.com/api/v1
NEXT_PUBLIC_USE_MOCK_API=false
EOF

echo "Building and starting sellrico-web..."
docker compose -f docker-compose.prod.yml up -d --build

echo "Waiting for web..."
for i in $(seq 1 30); do
  if curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/ | grep -q '200'; then
    echo "web:200"
    docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'NAMES|sellrico-web' || true
    echo "Web deploy done."
    exit 0
  fi
  sleep 2
done

echo "Web health check failed" >&2
docker logs sellrico-web --tail 80 || true
exit 1
