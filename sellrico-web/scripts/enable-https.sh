#!/usr/bin/env bash
set -euo pipefail

WEB_DIR=/opt/shoppio/web
BACKEND_ENV=/opt/shoppio/backend/.env

# Issue / renew certs (HTTP-01 via nginx). Requires DNS A records pointing at this server.
certbot --nginx \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --redirect \
  -d sellrico.com \
  -d www.sellrico.com \
  -d api.sellrico.com

# Point app + API at HTTPS
cat > "$WEB_DIR/.env" <<'EOF'
NEXT_PUBLIC_APP_URL=https://sellrico.com
NEXT_PUBLIC_API_URL=https://api.sellrico.com/api/v1
NEXT_PUBLIC_USE_MOCK_API=false
EOF

python3 - <<'PY'
from pathlib import Path
path = Path("/opt/shoppio/backend/.env")
text = path.read_text()
replacements = {
    "APP_URL=": "APP_URL=https://api.sellrico.com",
    "API_URL=": "API_URL=https://api.sellrico.com/api/v1",
    "CORS_ORIGINS=": (
        "CORS_ORIGINS=http://localhost:3001,http://localhost:3003,"
        "https://sellrico.com,https://www.sellrico.com,"
        "http://sellrico.com,http://www.sellrico.com"
    ),
}
lines = []
seen = set()
for line in text.splitlines():
    key = next((k for k in replacements if line.startswith(k)), None)
    if key:
        lines.append(replacements[key])
        seen.add(key)
    else:
        lines.append(line)
for key, value in replacements.items():
    if key not in seen:
        lines.append(value)
path.write_text("\n".join(lines) + "\n")
print("backend .env URLs updated")
PY

docker restart shoppio-api

cd "$WEB_DIR"
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

nginx -t
systemctl reload nginx

echo "--- checks ---"
sleep 2
curl -sS -o /dev/null -w 'https-web:%{http_code}\n' https://sellrico.com/
curl -sS -o /dev/null -w 'https-www:%{http_code}\n' https://www.sellrico.com/
curl -sS -o /dev/null -w 'https-api:%{http_code}\n' https://api.sellrico.com/api/v1/health
echo "HTTPS enable done."
