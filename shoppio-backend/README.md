# Shoppio Backend

NestJS multi-tenant SaaS API for the Shoppio WordPress plugin.

## Quick start

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate deploy
npm run start:dev
```

If Docker is not available, point `DATABASE_URL` at any reachable PostgreSQL 16 instance and run `npx prisma migrate deploy`.

- API base: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs
- Health: http://localhost:3000/api/v1/health
- Adminer: http://localhost:8080 (server `postgres`, user/password/db `shoppio`)

To also run the API container:

```bash
docker compose --profile full up -d --build
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Watch mode |
| `npm run build` | Compile TypeScript |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end smoke tests |
| `npm run lint` | ESLint |
| `npx prisma migrate dev` | Create/apply migrations |

## Auth endpoints

### Dashboard (sellrico-web)

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/auth/register` | Public |
| POST | `/api/v1/auth/login` | Public |
| POST | `/api/v1/auth/logout` | User JWT |
| POST | `/api/v1/auth/forgot-password` | Public (stub) |
| GET | `/api/v1/auth/me` | User JWT |

### WordPress plugin

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/auth/connect` | Public |
| POST | `/api/v1/auth/token` | Credentials in body |
| POST | `/api/v1/auth/revoke` | Site JWT |
| POST | `/api/v1/auth/rotate` | Site JWT |

Site identity is always resolved from credentials/JWT — never from a client-supplied `siteId`. Dashboard identity uses a separate user JWT (`typ: user`).

## Environment

See `.env.example`.
