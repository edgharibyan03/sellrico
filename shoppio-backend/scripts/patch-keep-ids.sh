#!/usr/bin/env bash
set -euo pipefail
cd /opt/shoppio/backend
python3 - <<'PY'
from pathlib import Path
paths = [
    Path('src/products/dto/sync-products.dto.ts'),
    Path('dist/products/dto/sync-products.dto.js'),
]
for p in paths:
    if not p.exists():
        print(f'skip missing {p}')
        continue
    text = p.read_text()
    new = text.replace('@ArrayMaxSize(5000)', '@ArrayMaxSize(10000)').replace('ArrayMaxSize(5000)', 'ArrayMaxSize(10000)')
    new = new.replace('(0, class_validator_1.ArrayMaxSize)(5000)', '(0, class_validator_1.ArrayMaxSize)(10000)')
    if new != text:
        p.write_text(new)
        print(f'patched {p}')
    else:
        print(f'no change {p}')
PY
docker compose -f docker-compose.prod.yml restart api || docker restart shoppio-api
sleep 2
curl -sS http://127.0.0.1:3000/api/v1/health || curl -sS http://127.0.0.1:3000/health || true