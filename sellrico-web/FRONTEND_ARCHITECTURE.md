# Sellrico Frontend Architecture

## Purpose

`sellrico-web` is the Sellrico merchant-facing surface:

1. Marketing website (Sellrico brand)
2. Authentication (Sellrico account)
3. Guided onboarding (connect WooCommerce via Shoppio)
4. SaaS dashboard (manage Shoppio for your stores)

It does **not** replace the WordPress plugin or NestJS backend. It consumes Shoppio APIs (and may mock unfinished domains).

## Package layout

```text
sellrico-web/src/
  app/
    (marketing)/     # public pages
    (auth)/          # login, signup, forgot password
    (onboarding)/    # first-run flow
    (dashboard)/     # authenticated app shell
  components/
    ui/              # shadcn primitives
    layout/          # chrome (marketing + dashboard)
    marketing/
    shared/          # loading / empty / error helpers
  lib/
    api/             # centralized API modules
    mock/            # mock store (localStorage)
    config/          # brand + pricing tokens
    types.ts
```

## Design system

- Brand tokens in `app/globals.css` (`--brand-ink`, `--brand-teal`, `--brand-mist`)
- Typography: Manrope (UI/heading) + IBM Plex Mono
- Light theme only (no dark-mode toggle)
- shadcn/ui for interactive primitives
- Lucide for icons

## API layer

All network access goes through `lib/api/*`:

| Module | Responsibility |
|--------|----------------|
| `client.ts` | fetch wrapper, envelope parsing, token storage, errors |
| `auth.ts` | register / login / logout / me / forgot password |
| `sites.ts` | sites CRUD, connect code, connection + sync status |
| `products.ts` | product listing |
| `assistant.ts` | assistant settings |
| `usage.ts` | usage summary |
| `billing.ts` | plans, subscription, checkout, portal |
| `dashboard.ts` | overview, activity, profile, onboarding |

When `NEXT_PUBLIC_USE_MOCK_API !== "false"`, modules call `lib/mock/store.ts` instead of the network.

### Response contract

Matches the Nest backend envelope:

```json
{ "success": true, "data": {} }
{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "..." } }
```

UI never renders raw API errors — `getUserFacingError()` maps them.

## Auth model (frontend)

Merchant sessions are **user JWT / access token** oriented (dashboard).

Existing backend plugin auth remains separate:

- `POST /api/v1/auth/connect` — WordPress plugin only
- Site JWT — plugin-to-API only

The browser must never receive or store site API secrets.

## Onboarding UX

Signup → Welcome → Store URL → Plugin connect code → Connection status → Product sync → Assistant setup → Dashboard.

Incomplete onboarding is redirected away from an empty dashboard.

## Pricing & billing

- Prices/limits: `lib/config/pricing.ts` (placeholders; `pricesUndecided: true`)
- Billing page calls:
  - `GET /billing/plans`
  - `GET /billing/subscription`
  - `POST /billing/checkout`
  - `POST /billing/portal`
- No payment-provider SDK in the frontend

## Mock data

`lib/mock/store.ts` persists demo state in `localStorage` so flows feel real during UI development. Components never embed fake arrays directly.

## Security rules

- No `NEXT_PUBLIC_*` private secrets / AI keys / payment secrets
- No direct WooCommerce / MySQL access from the browser
- Tenant isolation remains a backend responsibility
- Connect codes are treated as short-lived UX tokens; secrets stay in WordPress

## Backend endpoints still required

Merchant dashboard APIs (not yet implemented in Nest foundation):

- User auth: register, login, logout, me, forgot/reset password
- User-scoped sites list/create/disconnect + connect-code + connection/sync status
- Assistant get/patch
- Account-level products + usage summary
- Billing plans/subscription/checkout/portal
- User settings (profile, password, delete)

Plugin endpoints that already exist should remain unchanged.
