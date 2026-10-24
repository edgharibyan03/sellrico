# Sellrico Web

Public marketing site and merchant dashboard for **Sellrico**.

**Shoppio** is the WooCommerce AI shopping assistant product managed from this app.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Lucide icons
- Light theme only

## Quick start

```bash
cd sellrico-web
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3003](http://localhost:3003).

Auth, sites, products, and overview talk to `shoppio-backend`. Billing / assistant / usage may still use mocks when `NEXT_PUBLIC_USE_MOCK_API=true`.

## Environment

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Public site URL (SEO / metadata) |
| `NEXT_PUBLIC_API_URL` | Shoppio API base, e.g. `https://api.sellrico.com/api/v1` |
| `NEXT_PUBLIC_USE_MOCK_API` | `true` enables mocks for unfinished domains only |

Never put private secrets in `NEXT_PUBLIC_*` variables.

## Branding

Company/product names live in `src/lib/config/brand.ts`:

- `brand.name` → Sellrico (logo, SEO, account copy)
- `brand.product` → Shoppio (plugin, assistant, catalog product)

## Routes

### Marketing

- `/` — homepage
- `/pricing` — plans (config-driven placeholders)
- `/docs` — getting started

### Auth & app

- `/login`, `/signup`, `/forgot-password`
- `/onboarding`
- `/dashboard` — overview, sites, products, etc.
