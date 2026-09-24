# Shoppio

Shoppio is a commercial AI assistant for WordPress and WooCommerce websites. Website visitors will communicate with an AI assistant through a chat widget. The assistant will understand site content and, for WooCommerce stores, work with the product catalog (search, recommendations, cart actions).

This repository contains the **foundation** of the Shoppio platform: a WordPress plugin and a multi-tenant NestJS SaaS backend. AI features, RAG, product sync, billing, and the chat UI are intentionally **not** implemented yet.

## Architecture overview

```text
Customer WordPress Website
        │
   Shoppio Plugin (PHP)
        │
        │ HTTPS / REST API (/api/v1)
        ▼
   Shoppio Backend (NestJS)
        │
        ├── Authentication
        ├── Sites (multi-tenant)
        ├── Products (schema only)
        ├── Conversations (schema only)
        ├── Usage tracking (schema only)
        ├── AI (placeholder)
        └── Billing (future)
```

| Layer | Responsibility |
|-------|----------------|
| **WordPress plugin** | WordPress/WooCommerce integration, local site data, authentication storage, API client, future trusted site actions |
| **Shoppio backend** | Business logic, multi-tenancy, AI orchestration, product indexing, conversations, usage, billing, external providers |

The backend never connects to a customer's MySQL database. The plugin is the trusted bridge.

## Repository layout

```text
shoppio/                 # WordPress plugin (Shoppio product)
shoppio-backend/         # NestJS Shoppio API
sellrico-web/            # Sellrico marketing + dashboard (Next.js)
README.md
ARCHITECTURE.md
```

## WordPress plugin architecture

- Single entry file: `shoppio/shoppio.php`
- PSR-4 namespace `Shoppio\` via Composer
- Modules: Admin, Auth, Http, Api, WooCommerce, Database, Support
- Site settings stored in WordPress options (`autoload => false` for secrets)
- HTTP client wraps `wp_remote_*` for backend communication
- Secrets are never exposed to frontend JavaScript

See [shoppio/readme.txt](shoppio/readme.txt) for WordPress.org-style metadata.

## Backend architecture

- NestJS + TypeScript (strict mode)
- PostgreSQL via Prisma ORM
- Versioned API under `/api/v1`
- Swagger/OpenAPI at `/api/docs`
- Feature modules: auth, sites, products, conversations, usage, users, ai
- Shared concerns in `common/` (filters, decorators, response envelope)

See [shoppio-backend/README.md](shoppio-backend/README.md).

## Database / multi-tenancy

Every tenant is a **Site** (connected WordPress installation). Tenant-scoped models (`Product`, `Conversation`, `UsageEvent`, `SiteCredential`) always include `siteId`.

**Critical rule:** the backend never trusts a client-supplied `siteId`. The authenticated credential (API key → JWT) resolves the site. All queries are scoped to that site.

Product identity within a tenant is `(siteId, externalProductId)` because WooCommerce product IDs are only unique per WordPress install.

## Local development setup

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- PHP 8.1+ and Composer (for the plugin)
- WordPress 6.x (to run the plugin)

### Backend

```bash
cd shoppio-backend
cp .env.example .env
docker compose up -d          # PostgreSQL + Adminer
npm install
npx prisma migrate deploy
npm run start:dev
```

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Adminer: `http://localhost:8080`

### Frontend (Sellrico marketing + dashboard)

```bash
cd sellrico-web
cp .env.example .env.local
npm install
npm run dev
```

- App: http://localhost:3003
- Auth / sites / products / overview use the Shoppio API; some unfinished pages may still mock

See [sellrico-web/README.md](sellrico-web/README.md) and [sellrico-web/FRONTEND_ARCHITECTURE.md](sellrico-web/FRONTEND_ARCHITECTURE.md).

### WordPress plugin

```bash
cd shoppio
composer install --no-dev
composer test   # plain PHP smoke tests
```

Symlink or copy the `shoppio/` directory into `wp-content/plugins/shoppio`, then activate **Shoppio** in wp-admin.

> **Note:** Full PHPUnit/PHPStan/PHPCS install requires PHP `zip` extension (or 7-Zip). Production autoload works with `composer install --no-dev`.

## Environment variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_URL` | Public application URL |
| `API_URL` | Public API base URL |
| `JWT_SECRET` | Secret for signing site JWTs |
| `PORT` | HTTP port (default `3000`) |
| `NODE_ENV` | `development` / `production` / `test` |
| `OPENAI_API_KEY` | OpenAI API key (pro / business plans) |
| `OPENAI_MODEL` | OpenAI model (default `gpt-4o-mini`) |
| `DEEPSEEK_API_KEY` | DeepSeek API key (free plan) |
| `DEEPSEEK_MODEL` | DeepSeek model (default `deepseek-chat`) |
| `DEEPSEEK_BASE_URL` | DeepSeek API base URL |

Never hardcode secrets. Plugin configuration uses WordPress options, not backend env vars.

## How the plugin communicates with the backend

1. Admin connects the site (domain + API URL) via the Shoppio settings page.
2. Plugin calls `POST /api/v1/auth/connect` and receives `keyId` + `secret` (secret shown once).
3. Credentials are stored server-side in WordPress options.
4. For API calls, the plugin exchanges credentials for a short-lived JWT via `POST /api/v1/auth/token`.
5. Authenticated requests use `Authorization: Bearer <jwt>`.
6. The backend resolves the site from the JWT — never from a body `siteId`.

## Security principles

- Hash API secrets at rest (Argon2id); never store plaintext secrets in the database
- Do not trust client-supplied tenant identifiers
- Scope every tenant query to the authenticated site
- Do not expose API secrets to browser JavaScript
- Do not log secrets, tokens, or passwords
- Return predictable error envelopes without stack traces in production

## Planned future modules

- AI chat orchestration and provider adapters
- RAG / embeddings / vector search
- WooCommerce product synchronization and search
- Chat widget UI
- Usage metering and billing/subscriptions
- Merchant dashboard APIs (user accounts, site management) — UI exists in `sellrico-web`
- Credential rotation UX and connect codes from the dashboard

## Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) — decisions and rationale
- [shoppio-backend/README.md](shoppio-backend/README.md) — backend details
- Swagger UI — interactive API docs when the backend is running
