# Assistify — Server (API)

Node.js + Express + TypeScript + Mongoose. This is the backend for Assistify.

## Prerequisites

- Node.js 20+ (developed on 22/25)
- MongoDB running locally on `mongodb://127.0.0.1:27017`
  - macOS: `brew services start mongodb-community`

## Setup

```bash
cd server
npm install
cp .env.example .env      # then fill in the JWT secrets (any long random strings for dev)
npm run seed              # creates the demo company + users
npm run dev               # starts the API on http://localhost:5050
```

Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Start with hot-reload (tsx watch) |
| `npm run seed` | Reset + seed the demo data |
| `npm run typecheck` | TypeScript check, no emit |
| `npm run build` / `npm start` | Compile to `dist/` and run |

## Demo logins (from the seed)

Password for all: **`Password123!`**

| Role | Email |
|---|---|
| HR | `hr@nexora.com` |
| Employee | `employee@nexora.com` |

Company: **Nexora Technologies** (18 annual leaves).

## Endpoints so far

All under `/api/v1`. Response envelope: `{ success, data }` or `{ success, error: { code, message } }`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | — | Liveness + DB state |
| POST | `/auth/login` | — | email + password → user + access/refresh tokens |
| GET | `/auth/me` | Bearer | Current user from token |

### Quick check

```bash
curl -s localhost:5050/api/v1/health

curl -s -X POST localhost:5050/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"hr@nexora.com","password":"Password123!"}'
```

## Structure (frozen — see `docs/team/README.md` §1)

```
src/
├── config/     env loader (fail-fast), db connection
├── middleware/ auth (requireAuth/requireRole), error handler
├── shared/     ApiResponse, AppError classes, tenancy helper, types
├── modules/
│   ├── auth/       login, JWT, password (argon2id)   ← 5-file pattern
│   ├── users/      user model (invitation fields)
│   ├── companies/  company model (leave policy)
│   └── health/
├── scripts/seed.ts
├── app.ts      express app wiring
└── index.ts    bootstrap (connect db → listen)
```

Each domain module follows: `*.model.ts · *.schema.ts · *.service.ts · *.controller.ts · *.routes.ts`.
Business logic lives in `*.service.ts` (no req/res) so it can be reused later.

## Non-negotiable rules (team guide §3–4)

- Every request body validated with **Zod**.
- **No endpoint accepts `companyId` or `userId` from the client** — identity comes from the JWT.
- Every DB query is tenant-scoped via `scoped(req.auth, …)`.
- Passwords hashed with **Argon2id**; refresh tokens stored **hashed**.

## Next (Aug 7 onward)

Invitation → activation endpoints, refresh/logout, `POST /users/invite` with the
role-creation whitelist, then the leave apply/approve endpoints.
