# Team Guide — shared conventions

**Everyone reads this file. Then read only your own member guide.**

| Member | Guide | Owns |
|---|---|---|
| M1 | [M1-BACKEND-CORE.md](M1-BACKEND-CORE.md) | Auth, RBAC, tenancy, audit, infrastructure, deployment |
| M2 | [M2-HR-DOMAIN.md](M2-HR-DOMAIN.md) | Leave, attendance, holidays, tickets, notifications, analytics |
| M3 | [M3-AI-RAG.md](M3-AI-RAG.md) | Ingestion, embeddings, retrieval, chat orchestrator, tools |
| M4 | [M4-FRONTEND.md](M4-FRONTEND.md) | The entire React application |

Prerequisites: `../HANDOFF.md` (context + decisions) and `../SESSION-01-SCOPE-AND-TEAM-PLAN.md` (specification).

---

## 1. Folder structure — ownership by directory

This layout exists so four people rarely touch the same file. **Stay inside your folders.**

```
assistify/
├── docs/
├── server/
│   ├── src/
│   │   ├── config/               M1   env loading, db connection
│   │   ├── middleware/           M1   auth, rbac, tenancy, errors, rate limit
│   │   ├── shared/               M1   types, utils, base errors, api response
│   │   ├── modules/
│   │   │   ├── auth/             M1
│   │   │   ├── users/            M1
│   │   │   ├── companies/        M1
│   │   │   ├── audit/            M1
│   │   │   ├── leave/            M2
│   │   │   ├── attendance/       M2
│   │   │   ├── holidays/         M2
│   │   │   ├── tickets/          M2
│   │   │   ├── notifications/    M2
│   │   │   ├── analytics/        M2
│   │   │   ├── documents/        M3
│   │   │   ├── retrieval/        M3
│   │   │   └── chat/             M3
│   │   ├── scripts/seed.ts       M1 owns, everyone contributes their data
│   │   └── index.ts              M1
│   └── tests/
├── web/
│   ├── src/
│   │   ├── app/                  M4   router, layout, providers
│   │   ├── lib/                  M4   api client, auth context, hooks
│   │   ├── components/           M4   shared UI primitives
│   │   ├── features/             M4   auth/ leave/ tickets/ chat/ documents/ analytics/
│   │   └── types/                M4   generated from shared API types
├── docker-compose.yml            M1
└── .env.example                  M1
```

**Every backend module has the same five files:**

```
modules/<name>/
├── <name>.model.ts       Mongoose schema
├── <name>.schema.ts      Zod validation for requests
├── <name>.service.ts     business logic — NO express req/res in here
├── <name>.controller.ts  thin: parse → call service → respond
└── <name>.routes.ts      router + middleware wiring
```

**Why the service layer is separate:** M3's AI tools call `*.service.ts` functions directly, not HTTP endpoints. If business logic lives in controllers, M3 has to duplicate it. Keep services pure.

---

## 2. Git workflow

```
main            protected — PR only, M1 merges
└── feat/m2-leave-approval-workflow
└── feat/m3-chunking-pipeline
└── fix/m1-refresh-token-rotation
```

**Branch naming:** `<type>/<member>-<short-description>`
Types: `feat` · `fix` · `docs` · `refactor` · `test` · `chore`

**Commit format:**
```
<type>(<module>): <what changed>

<why, if not obvious>
```
Example: `feat(leave): add approval state machine with balance deduction`

**Rules**
1. Never push directly to `main`.
2. One PR per logical unit. A 2000-line PR will not get reviewed properly.
3. PR description states: what, why, how to test it.
4. Another member reviews before M1 merges.
5. Rebase on `main` before opening the PR.
6. **Never commit `.env`.** If you do, the secret is burned — rotate it, don't just delete the file.

---

## 3. API conventions — frozen in Phase 0

**Base path:** `/api/v1`

**Success response**
```json
{ "success": true, "data": { } }
```

**Error response**
```json
{ "success": false, "error": { "code": "LEAVE_INSUFFICIENT_BALANCE", "message": "Human readable" } }
```

**Status codes:** `200` ok · `201` created · `400` validation · `401` not authenticated · `403` authenticated but not allowed · `404` not found · `409` conflict · `429` rate limited · `500` server

**Non-negotiable rules**
1. **Every request body is validated with Zod.** No exceptions.
2. **No endpoint ever accepts `companyId` from the client.** It comes from the JWT. If you find yourself typing `req.body.companyId`, stop.
3. **No endpoint accepts `userId` for "my" resources.** `/leave/my-balance` reads the token, it does not take a parameter.
4. Errors return codes, not raw stack traces. Log detail server-side.
5. Dates are ISO 8601 strings over the wire, `Date` in Mongo.

---

## 4. The two rules that protect the whole system

**Tenancy:** every Mongoose query includes `companyId` from `req.auth.companyId`. Not sometimes — always. M1 provides a helper; use it.

**Ownership:** role checks are not enough. `hr` may read *any* leave request *in their company*. `employee` may read *only their own*. Check both.

```ts
// wrong — role check only
if (req.auth.role !== 'employee') return next();

// right — role AND scope
const leave = await LeaveRequest.findOne({ _id: id, companyId: req.auth.companyId });
if (!leave) throw new NotFoundError();
if (req.auth.role === 'employee' && !leave.userId.equals(req.auth.userId)) throw new ForbiddenError();
```

---

## 5. Definition of Done

A task is done when **all** of these are true:

- [ ] Code works for the happy path
- [ ] Validation rejects bad input with a useful error
- [ ] Tenancy filter applied to every query
- [ ] Ownership checked where relevant
- [ ] At least one test for the core logic
- [ ] Frontend has loading, empty, and error states (M4)
- [ ] Reviewed and merged by M1
- [ ] `PROJECT_MEMORY.md` updated if a decision changed

"It runs on my machine" is not done.

---

## 6. Working rhythm

- **Daily:** 10-minute standup — done / doing / blocked
- **Weekly:** demo whatever works to the other three. Working software, not slides.
- **End of each phase:** the exit gate is demonstrated live before the next phase starts. No exceptions — see `../HANDOFF.md` §10.

---

## 7. When you are blocked

1. Check the API contract document — most blockers are "I don't know the response shape"
2. **Mock it and keep moving.** The contract is frozen precisely so you never have to wait for someone else's endpoint
3. Raise it at standup if it's still blocking after half a day

Do not sit idle waiting for another member. Do not silently change a shared contract to unblock yourself — that breaks two other people.
