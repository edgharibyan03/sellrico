# Shoppio Architecture

This document explains the important architectural decisions behind the Shoppio foundation and why they were made.

## Product boundary

Shoppio is split into two deployables:

1. **WordPress plugin** — runs on the customer’s site; integrates with WordPress/WooCommerce; holds connection credentials; performs local actions.
2. **Shoppio backend** — multi-tenant SaaS; owns business logic, data, and (later) AI.

The backend must **not** connect to customer MySQL. The plugin is the only bridge to the customer’s WordPress installation. This keeps credentials, hosting diversity, and security boundaries manageable for a commercial SaaS.

## Monorepo layout

```text
shoppio/            # Plugin
shoppio-backend/    # API
```

One repository keeps shared documentation and aligned versioning while allowing independent deployment (plugin to WordPress hosts; backend to cloud).

## Multi-tenancy model

A **Site** represents one connected WordPress installation. All tenant data (`Product`, `Conversation`, `Message`, `UsageEvent`, `SiteCredential`) is keyed by `siteId`.

### Never trust client `siteId`

WordPress plugins run in an environment the merchant controls. A malicious or compromised plugin could send another tenant’s UUID. Therefore:

1. The plugin authenticates with site credentials (`keyId` + `secret`).
2. The backend verifies the secret and issues a site-scoped JWT (`sub` = site id).
3. Guards resolve the site from the JWT (or credential exchange).
4. Services query with `where: { siteId: authenticatedSite.id }`.

Controllers must not accept `siteId` from the request body as an authorization source.

### WooCommerce product identity

WooCommerce product IDs are unique only within one WordPress install. The unique constraint is:

```text
@@unique([siteId, externalProductId])
```

## Authentication

### Chosen design

- **Connect** creates a `Site` and a `SiteCredential`.
- Credentials are `keyId` (public) + `secret` (shown once).
- Secrets are stored as **Argon2id hashes**, never plaintext.
- The plugin exchanges credentials for a **short-lived JWT** so the long-lived secret is not sent on every request.
- **Revoke** marks a credential inactive; **rotate** (stubbed for later) will issue a new secret and invalidate the old one.

### Why not session cookies?

Plugin-to-API traffic is server-to-server from PHP. API keys + JWT fit unattended WordPress cron/admin flows better than browser cookies.

### Why not put secrets in JavaScript?

Anything in public JS can be scraped. Connection secrets stay in WordPress options (`autoload => false`) and are used only by PHP.

### Users

A `User` model exists for future dashboard ownership (`Site.ownerUserId`). Initial connect allows sites without an owner so local development works before the merchant dashboard exists.

## API versioning

All routes live under `/api/v1`. Breaking changes will introduce `/api/v2` rather than mutating v1 behavior. Swagger documents public vs authenticated plugin endpoints.

## Response envelope

```json
{ "success": true, "data": { } }
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "..." } }
```

Predictable shapes simplify the PHP client and future SDKs. Production responses omit stack traces.

## Plugin responsibilities (and non-responsibilities)

**Does:**

- Admin settings and connection UX
- Storing credentials securely on the site
- HTTP client to Shoppio API
- Detecting WooCommerce (for future features)
- Future: enqueue chat assets, execute trusted backend-requested actions (add to cart, etc.)

**Does not:**

- Host LLM calls
- Store the global product index
- Own billing or usage aggregation across tenants

## Backend module layout

| Module | Role today | Future |
|--------|------------|--------|
| `auth` | Connect, token, revoke | Rotate, connect codes, dashboard auth |
| `sites` | Authenticated site profile stub | Lifecycle, claiming, settings |
| `products` | Schema + empty controller | Sync, search, recommendations |
| `conversations` / messages | Schema + stubs | Chat persistence |
| `usage` | Schema + stubs | Metering, quotas |
| `users` | Schema stub | Dashboard accounts |
| `ai` | Empty module | Providers, agents, tools |
| `common` | Filters, decorators, tenant helpers | Shared cross-cutting concerns |

Empty modules are intentional extension points without fake business logic.

## Data access

Prisma is used for type-safe schema and migrations. There was no strong reason to choose another ORM for this NestJS + PostgreSQL stack.

## Local development

Docker Compose runs PostgreSQL (and Adminer for inspecting tenant data). The Nest app can run on the host with `npm run start:dev` against Compose Postgres, keeping Node HMR fast while the database stays reproducible.

## Logging

Backend and plugin loggers must redact secrets, tokens, and passwords. Plugin logging respects `WP_DEBUG` and never echoes credentials to the browser.

## What is deliberately deferred

- LLM / RAG / embeddings / vector DB
- Product synchronization
- Chat UI and WooCommerce cart actions
- Billing and subscriptions
- Dashboard UI and account linking
- Production rate limiting and WAF (design allows adding them at the API gateway or Nest middleware later)

## Guiding principle

Prefer a **clean, production-oriented foundation** that is easy to extend over premature abstractions. Add complexity only when a concrete feature requires it.
