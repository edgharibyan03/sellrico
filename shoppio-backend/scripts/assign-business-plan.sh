#!/usr/bin/env bash
set -euo pipefail

EMAIL="${1:-edgharibyan1@gmail.com}"

docker exec -i shoppio-postgres psql -U shoppio -d shoppio -v ON_ERROR_STOP=1 <<SQL
SELECT id, email FROM users WHERE email = '${EMAIL}';

SELECT p.slug, p.max_products, s.status, s.user_id
FROM subscriptions s
JOIN plans p ON p.id = s.plan_id
JOIN users u ON u.id = s.user_id
WHERE u.email = '${EMAIL}';

INSERT INTO subscriptions (
  id, user_id, plan_id, status, provider, interval, cancel_at_period_end,
  current_period_start, current_period_end, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  (SELECT id FROM plans WHERE slug = 'business' LIMIT 1),
  'ACTIVE',
  'manual',
  'MONTHLY',
  false,
  date_trunc('month', NOW() AT TIME ZONE 'UTC'),
  (date_trunc('month', NOW() AT TIME ZONE 'UTC') + interval '1 month'),
  NOW(),
  NOW()
FROM users u
WHERE u.email = '${EMAIL}'
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s WHERE s.user_id = u.id
  );

UPDATE subscriptions s
SET
  plan_id = (SELECT id FROM plans WHERE slug = 'business' LIMIT 1),
  status = 'ACTIVE',
  provider = 'manual',
  cancel_at_period_end = false,
  current_period_start = date_trunc('month', NOW() AT TIME ZONE 'UTC'),
  current_period_end = (date_trunc('month', NOW() AT TIME ZONE 'UTC') + interval '1 month'),
  updated_at = NOW()
FROM users u
WHERE s.user_id = u.id
  AND u.email = '${EMAIL}';

UPDATE sites si
SET plan_id = 'business',
    updated_at = NOW()
FROM users u
WHERE si.owner_user_id = u.id
  AND u.email = '${EMAIL}';

SELECT u.email, p.slug, p.max_products, s.status, s.provider
FROM subscriptions s
JOIN plans p ON p.id = s.plan_id
JOIN users u ON u.id = s.user_id
WHERE u.email = '${EMAIL}';

SELECT si.id, si.domain, si.plan_id
FROM sites si
JOIN users u ON u.id = si.owner_user_id
WHERE u.email = '${EMAIL}';

SELECT COUNT(*) AS product_count
FROM products pr
JOIN sites si ON si.id = pr.site_id
JOIN users u ON u.id = si.owner_user_id
WHERE u.email = '${EMAIL}';
SQL