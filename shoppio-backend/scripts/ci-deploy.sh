#!/usr/bin/env bash
set -euo pipefail

API_DIR=/opt/shoppio/backend

cd "$API_DIR"

if [[ ! -f .env ]]; then
  echo "Missing $API_DIR/.env — create it on the server before deploying." >&2
  exit 1
fi

echo "Building and recreating shoppio-api..."
docker compose -f docker-compose.prod.yml up -d --build --force-recreate api

echo "Waiting for API..."
for i in $(seq 1 45); do
  if curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/api/v1/health | grep -q '200'; then
    echo "api:200"
    docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'NAMES|shoppio-' || true
    echo "API deploy done."
    exit 0
  fi
  sleep 2
done

echo "API health check failed" >&2
docker logs shoppio-api --tail 80 || true
exit 1
