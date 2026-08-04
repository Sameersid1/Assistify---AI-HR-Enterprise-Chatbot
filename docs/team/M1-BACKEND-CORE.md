# M1 — Backend Core

**You own:** authentication, authorisation, multi-tenancy, audit logging, project infrastructure, deployment, and the API contract.

**Read first:** `README.md` (team conventions) → `../HANDOFF.md` → `../SESSION-01-SCOPE-AND-TEAM-PLAN.md`

---

## Why your role matters most in weeks 1–3

Everything the other three build sits on top of your work. If tenancy is wrong, every query in the system leaks data. If the API contract is vague, three people build against three different assumptions. **You are the critical path until Phase 2 — then you become support.**

You also own merges to `main`, which means you are the last line of defence on the two rules in the team guide §4.

---

## Your work by phase

| Phase | Weeks | Your load |
|---|---|---|
| 0 — Foundation | 1 | 🔴 Heavy — you drive this phase |
| 1 — Auth & Tenancy | 2–3 | 🔴 Heavy — this is your core deliverable |
| 2 — HR Core | 3–5 | 🟢 Light — support M2, code review |
| 3 — Ingestion | 5–7 | 🟢 Light — support M3, review |
| 4 — Chat | 7–9 | 🟡 **Co-own frontend with M4** (see HANDOFF §6) |
| 5 — Actions | 9–10 | 🟡 Audit logging of AI writes + frontend help |
| 6 — Hardening | 10–12 | 🔴 Heavy — security pass, Docker, deployment |

---

## PHASE 0 — Foundation (Week 1)

You are running this week. The other three are partly idle by design — that is fine, the payoff is that weeks 2–12 have no contract arguments.

### Step-by-step

**1. Repository scaffolding**
```
server/  → npm init, TypeScript, Express, Mongoose, Zod, dotenv
web/     → npm create vite@latest (React + TS), Tailwind
root     → docker-compose.yml (mongo + server + web), .env.example
```
Add ESLint + Prettier to both, with the same rules. Add `npm run dev`, `build`, `lint`, `test` scripts to both.

**2. Create the folder skeleton** exactly as in the team guide §1 — empty folders with a `.gitkeep`. This prevents three people inventing three structures in week 2.

**3. `docker-compose.yml`**
- `mongo` service with a named volume
- `server` on `:5000`, `web` on `:5173`
- Server reads `MONGO_URI` from env

**4. Database connection + config loader** (`config/`)
- Fail fast and loudly if a required env var is missing. A server that boots with a missing `JWT_SECRET` and fails at first login is worse than one that refuses to start.

**5. Shared plumbing** (`shared/`, `middleware/`)
- `ApiResponse` helpers matching team guide §3
- `AppError` base class + `NotFoundError`, `ForbiddenError`, `ValidationError`, `ConflictError`
- Global error-handling middleware — catches everything, logs detail, returns the safe shape
- `GET /api/v1/health` returning `{ status, db: 'connected' }`

**6. Write the API contract document** — `docs/API_PLANNING.md`

This is the most valuable thing you produce all week. For **every** endpoint the whole team will build: method, path, auth required, roles allowed, request body, response body, error codes.

Write it for endpoints that do not exist yet. That is the point — M3 and M4 build against it while M2 is still writing the implementation.

**7. Freeze the schema** — `docs/DATABASE_DESIGN.md`

All 15 collections with every field, type, index, and relationship. Sit down with all four members and agree it. After this week, changes need all-four sign-off.

### Exit gate — demonstrate to the team
- Anyone clones, runs `docker compose up`, hits `/api/v1/health`, gets a 200 with `db: connected`
- `API_PLANNING.md` and `DATABASE_DESIGN.md` signed off by all four

---

## PHASE 1 — Auth & Tenancy (Weeks 2–3)

**Build in this exact order.** Each step depends on the one before it.

### Flow

```
1. Company model
        ↓
2. User model (with companyId, role, passwordHash)
        ↓
3. Password utility        argon2 hash + verify
        ↓
4. JWT utility             sign access (15m) + refresh (7d), verify
        ↓
5. Token utility           → single-use token: generate raw + store hash
                             (shared by invitation AND password reset)
        ↓
6. Auth endpoints          ⚠️ THERE IS NO /auth/register — see
                              ../AUTH-AND-ONBOARDING-FLOW.md
   POST /auth/login              → verifies, issues both tokens
   POST /auth/refresh            → rotates refresh token
   POST /auth/logout             → invalidates refresh token
   GET  /auth/me                 → current user from token
   GET  /auth/invitation/:token  → validate before showing form
   POST /auth/activate           → token + password → ACTIVE + auto-login
   POST /auth/forgot-password    → always same response
   POST /auth/reset-password     → token + new password
        ↓
7. Invitation endpoints
   POST /users/invite            → role whitelist enforced in the SERVICE
   POST /users/:id/resend-invitation
   POST /users/:id/deactivate  /  reactivate
        ↓
8. requireAuth middleware  → verifies token, populates req.auth
        ↓
9. requireRole middleware  → role gate
        ↓
10. Tenancy helper         → every query scoped by req.auth.companyId
        ↓
11. Seed script            → 2 companies, 10 users, all roles, all ACTIVE
        ↓
12. Tests                  → permission matrix, both directions
```

> ⚠️ **Read `../AUTH-AND-ONBOARDING-FLOW.md` before writing a line of this.** There is no public sign-up in this system. Users are *invited* by HR/admin and *activate* an account that already exists. An earlier draft of this guide listed `POST /auth/register` — that was wrong and the endpoint must not be built.

### Detail on the pieces that go wrong

**`req.auth` shape** — freeze this now, everyone depends on it:
```ts
req.auth = { userId: ObjectId, companyId: ObjectId, role: 'employee'|'hr'|'it_support'|'admin' }
```

**Refresh token rotation** — store a hash of the refresh token on the user document. On refresh: verify, issue a new pair, invalidate the old. Reusing an old refresh token should invalidate the whole family (it means the token leaked).

**The tenancy helper.** Do not rely on everyone remembering to add `companyId`. Give them something that makes forgetting hard:
```ts
// shared/tenantQuery.ts
export const scoped = (auth: Auth, filter = {}) => ({ ...filter, companyId: auth.companyId });
// usage: LeaveRequest.find(scoped(req.auth, { status: 'PENDING' }))
```
Then in review, grep for any `.find(` / `.findOne(` that doesn't go through it.

**Seed data — make it demo-ready from day one.** Two companies with deliberately different policies:
- Company A "Nexora Technologies" — 18 annual leaves
- Company B "Vertex Industries" — 24 annual leaves

Users per company: 1 admin, 1 hr, 1 it_support, 2–3 employees. Known passwords, documented in the README.

### The test that matters most

The permission matrix, **in both directions**:

| Actor | Target | Expected |
|---|---|---|
| Company A employee | Company B anything | 404 (not 403 — don't confirm it exists) |
| employee | another employee's leave | 403 |
| hr | IT ticket queue | 403 |
| it_support | any leave/attendance/salary | 403 |
| it_support | IT ticket of any employee | 200 |
| admin | user management | 200 |

The classic bug is testing only "IT can't see HR data" and never checking "HR can't see IT tickets". Write both.

### Exit gate
Log in as Company A employee and Company B employee — each sees only their own company. All four roles seeded. Permission matrix passes both directions.

---

## PHASE 2–3 — Support role (Weeks 3–7)

Your heavy lifting is done. Now:

- **Review every PR** against the two rules (tenancy + ownership). You are the only person looking at all the code.
- **Build the audit module** (`modules/audit/`) — M3 needs it in Phase 5, so have it ready early:
  ```ts
  logAudit({ companyId, actorUserId, actorType: 'user'|'ai', action, resourceType, resourceId, metadata })
  ```
- **Ownership-check helper** in `shared/` so M2 and M3 don't each write their own.
- Keep `API_PLANNING.md` current as reality drifts from the plan. It will drift; that's fine, as long as the document tracks it.

---

## PHASE 4–5 — Frontend co-ownership (Weeks 7–10)

Per HANDOFF §6, M4 has four UI surfaces and cannot finish alone. **You take a defined slice — agree it with M4 in week 6, in writing.**

Recommended split: you take the **HR dashboard, IT Support dashboard, and analytics page**; M4 keeps chat, auth, employee dashboard, and shared components.

Why this split: those three are table-and-filter heavy, closest to backend work, and least dependent on M4's design system.

Also in Phase 5: **wire audit logging into every AI-initiated write.** Every `apply_leave` and `create_ticket` executed by the assistant gets an audit row with `actorType: 'ai'`.

---

## PHASE 6 — Hardening & Delivery (Weeks 10–12)

Yours to drive.

**1. Security pass** — walk the checklist in `../SESSION-01-SCOPE-AND-TEAM-PLAN.md` §9 line by line and tick each one with evidence.

**2. Rate limiting** — `/auth/login` (brute force) and `/chat` (cost control). Per-IP and per-user.

**3. Production Dockerfiles** — multi-stage, non-root user, no dev dependencies.

**4. Deployment**
- MongoDB Atlas — cluster, vector index, IP allowlist, dedicated app user
- Backend → Render
- Frontend → Vercel
- Every secret in the platform's env config. Nothing in the repo.

**5. Final README** — prerequisites, setup, env vars, run instructions, seeded logins, deployed URLs.

**6. The demo script** — write it, then rehearse the full run twice with the whole team.

---

## What you must NOT do

- ❌ Do not put business logic in middleware. Auth and tenancy only.
- ❌ Do not let a PR through that queries without a tenancy filter, however small.
- ❌ Do not change the API contract silently — amend the document and tell the team.
- ❌ Do not build HR features because M2 is behind. Help by reviewing and by taking frontend load, not by duplicating their work.
- ❌ Do not defer the security checklist to week 12. Tick items as they become true.

---

## Your dependencies

| You need from | What | When |
|---|---|---|
| All | Sign-off on schema + API contract | End of Phase 0 |
| M2, M3 | Their seed data contributions | Phase 2, Phase 3 |
| M4 | Agreement on the frontend split | Week 6 |

| Who needs from you | What | By when |
|---|---|---|
| Everyone | Folder skeleton, error handling, API contract | End of Phase 0 |
| Everyone | `requireAuth`, `requireRole`, tenancy helper, `req.auth` | End of Phase 1 |
| M2, M3 | Ownership-check helper | Early Phase 2 |
| M3 | Audit logging service | Before Phase 5 |
| M4 | Working login + refresh + `/auth/me` | End of Phase 1 |
