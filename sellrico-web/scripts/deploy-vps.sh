#!/usr/bin/env bash
set -euo pipefail

WEB_DIR=/opt/shoppio/web
BACKEND_ENV=/opt/shoppio/backend/.env
NGINX_SRC="$WEB_DIR/scripts/nginx-sellrico.conf"
NGINX_DST=/etc/nginx/sites-available/sellrico

cd "$WEB_DIR"

cat > "$WEB_DIR/.env" <<'EOF'
NEXT_PUBLIC_APP_URL=https://sellrico.com
NEXT_PUBLIC_API_URL=https://api.sellrico.com/api/v1
NEXT_PUBLIC_USE_MOCK_API=false
EOF

# Ensure CORS allows the public site
python3 - <<'PY'
from pathlib import Path
path = Path("/opt/shoppio/backend/.env")
text = path.read_text()
wanted = (
    "http://localhost:3001,http://localhost:3003,"
    "https://sellrico.com,https://www.sellrico.com"
)
lines = []
found = False
for line in text.splitlines():
    if line.startswith("CORS_ORIGINS="):
        lines.append(f"CORS_ORIGINS={wanted}")
        found = True
    else:
        lines.append(line)
if not found:
    lines.append(f"CORS_ORIGINS={wanted}")
path.write_text("\n".join(lines) + "\n")
print("CORS_ORIGINS updated")
PY

docker restart shoppio-api

echo "Building sellrico-web..."
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d

# Fix nginx: remove broken /tmp symlink site, install sellrico vhosts
rm -f /etc/nginx/sites-enabled/shoppio
rm -f /etc/nginx/sites-available/shoppio
cp "$NGINX_SRC" "$NGINX_DST"
ln -sfn "$NGINX_DST" /etc/nginx/sites-enabled/sellrico

# Disable default site if it would steal traffic
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  rm -f /etc/nginx/sites-enabled/default
fi

nginx -t
systemctl reload nginx

echo "--- containers ---"
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

echo "--- local checks ---"
curl -sS -o /dev/null -w 'api:%{http_code}\n' http://127.0.0.1:3000/api/v1/health
curl -sS -o /dev/null -w 'web:%{http_code}\n' http://127.0.0.1:3001/
curl -sS -o /dev/null -w 'nginx-api-host:%{http_code}\n' -H 'Host: api.sellrico.com' http://127.0.0.1/api/v1/health
curl -sS -o /dev/null -w 'nginx-web-host:%{http_code}\n' -H 'Host: sellrico.com' http://127.0.0.1/
curl -sS -o /dev/null -w 'nginx-ip:%{http_code}\n' http://127.0.0.1/api/v1/health

echo "Deploy done."
