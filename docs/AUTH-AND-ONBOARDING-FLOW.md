# Authentication & Onboarding Flow

**Status:** proposal, r1 · 2026-08-02
**Supersedes:** the `POST /auth/register` endpoint listed in earlier drafts of `team/M1-BACKEND-CORE.md` — that endpoint is removed.

---

## The headline decision

> ## There is no public sign-up. Anywhere. For anyone.

The landing page has a **Login** button and nothing else. No "Create account", no "Sign up as employee", no "Register your company".

### Why — and this is a viva answer, not a preference

**Employment is a fact, not a claim.** If a stranger can sign up and select "Employee" at *Nexora Technologies*, they have just granted themselves access to Nexora's HR policies, holiday calendar, and internal ticketing. Email-domain checking doesn't save you either — anyone with a `@nexora.com` address (an intern who left, a contractor, someone who guessed the pattern) gets in, and plenty of legitimate staff use personal addresses.

In every real HR system — Workday, BambooHR, Zoho People, Darwinbox — **the employee record is created by HR first**. The person then *activates* an account that already exists. They never create one.

So the model is:

| ❌ Self-service registration | ✅ Invitation-based activation |
|---|---|
| User claims an identity | HR asserts the identity; user proves control of the email |
| Anyone can join any company | Only people HR already employs can join |
| Tenant isolation is theoretical | Tenant isolation starts at account creation |

**The absence of a signup button is itself a security control.** Say that out loud in the viva — most student projects have an open registration form on a multi-tenant app and never notice the hole.

---

## Who can create whom

```
super_admin  (seeded, platform level)
     │  creates
     ▼
  Company  +  its first  admin
     │  creates
     ▼
   hr  ·  it_support
     │  creates
     ▼
  employee
```

| Role | Created by | Can create |
|---|---|---|
| `super_admin` | **Seed script only.** Never through the UI. | Companies, and each company's first `admin` |
| `admin` | `super_admin` | `hr`, `it_support` |
| `hr` | `admin` | `employee` only |
| `it_support` | `admin` | nobody |
| `employee` | `hr` | nobody |

**Two deliberate constraints:**

1. **HR cannot create another HR.** Only `admin` can. This contains privilege escalation — a compromised HR account cannot mint more HR accounts. It also mirrors reality: hiring an HR executive is an org decision, not an HR-desk task.
2. **Nobody can create a role above their own.** Enforce this in the service layer, not just the UI. The check is: *is the target role in the set this actor is allowed to create?* — a whitelist, not a "is target role rank lower" comparison.

---

## Flow 1 — A new visitor arrives

```
Visitor hits the site
        │
        ▼
   Landing page
   (what Assistify does · one "Login" button · NO signup)
        │
        ▼
   Login page  ── "Forgot password?" ──► reset flow (Flow 4)
        │
   email + password
        │
        ▼
   ┌─── Valid? ───┐
  NO              YES
   │               │
   ▼               ▼
Generic error   Check account status
"Invalid            │
credentials"    ┌───┴────────┬──────────────┐
(never say    ACTIVE      INVITED       DEACTIVATED
 which field   │             │               │
 was wrong)    │             ▼               ▼
               │      "Your account isn't  "Account
               │       activated yet —      deactivated.
               │       check your           Contact HR."
               │       invitation link"
               ▼
        Issue access (15m) + refresh (7d) tokens
               │
               ▼
        Redirect by role:
          employee    → /dashboard
          hr          → /hr/dashboard
          it_support  → /it/tickets
          admin       → /admin/users
          super_admin → /platform/companies
```

**Login-page details that matter:**
- One generic error for wrong email *and* wrong password. Distinguishing them is a user-enumeration oracle.
- Rate limit by IP **and** by email (M1, Phase 6). Five failures → 15-minute lockout.
- No "remember which company" selector. The email identifies the user, and the user's record identifies the company. Asking the visitor to pick a company leaks your customer list.

---

## Flow 2 — HR onboards a new employee ⭐ *the important one*

This replaces "employee signs up".

```
HR logs in → HR Dashboard → Employees → "Add Employee"
        │
        ▼
HR fills the employment record:
  full name · work email · employee ID · department
  designation · date of joining · reporting manager
  role (locked to "employee" for HR)
        │
        ▼
Backend creates the user:
  status        = INVITED
  companyId     = from HR's JWT   ← never from the form
  passwordHash  = null
  invitationTokenHash = hash(random 32 bytes)
  invitationExpiresAt = now + 72h
  invitedBy     = HR's userId
        │
        ├──► Leave balances initialised from the company's leave policy
        ├──► Audit log entry written
        │
        ▼
Activation link generated:
  https://app/activate?token=<raw token>
        │
        ▼
┌── How the link reaches the employee ──────────────┐
│ v1  : shown in the HR UI with a "Copy link"       │
│       button. HR sends it via their normal        │
│       channel (email, Teams, WhatsApp).           │
│ v1.1: emailed automatically — same token, same    │
│       flow, just a delivery mechanism             │
└───────────────────────────────────────────────────┘
        │
        ▼
Employee opens the link
        │
        ├── expired or already used? → "Link expired — ask HR to resend"
        │                               (HR gets a "Resend invite" button)
        ▼
Activation page:
  set password (with strength rules)
  confirm password
  [ ] I acknowledge the Employee Handbook   ← ties into policy acknowledgement
        │
        ▼
Backend:
  passwordHash = argon2(password)
  status       = ACTIVE
  invitationTokenHash = null      ← single use, burn it
  activatedAt  = now
        │
        ▼
Auto-login → employee dashboard → first-run tour of the chat
```

**Why the token is stored hashed:** the activation token is a password equivalent for those 72 hours. A leaked database dump with raw tokens is a leaked set of accounts. Hash it, compare hashes, exactly like a password.

**Why 72 hours:** long enough to survive a weekend, short enough that a forwarded link doesn't stay live for a month.

**Bulk import (NICE-TO-HAVE):** CSV upload creating many `INVITED` users at once. Realistic for onboarding a cohort, but not needed for the demo — the single-employee flow proves the model.

---

## Flow 3 — Admin onboards HR / IT Support

Structurally identical to Flow 2, with two differences:

- Performed by `admin`, not `hr`
- The role field offers `hr` and `it_support`

Same invitation → activation → active mechanism. **Build it once, parameterise the allowed roles.** Do not write two onboarding features.

```
admin → Admin Dashboard → Users → "Add Staff"
      → role: [ hr | it_support ]
      → same INVITED → link → activate → ACTIVE path
```

---

## Flow 4 — Forgot password

**Reuse the invitation machinery.** Same table, same token pattern, different `type`.

```
Login page → "Forgot password?" → enter email
        │
        ▼
ALWAYS respond: "If that email is registered, a reset link has been sent."
   ← identical response whether or not the account exists.
     Anything else is a user-enumeration oracle.
        │
        ▼
If the account exists and is ACTIVE:
   resetTokenHash = hash(random), expires in 1 hour
   (v1: link shown to admin/HR to relay · v1.1: emailed)
        │
        ▼
Reset page → new password → token burned
        │
        ▼
⚠️ Invalidate ALL existing refresh tokens for that user
   (a password reset must log out any session an attacker holds —
    otherwise the reset achieves nothing)
        │
        ▼
Redirect to login
```

Reset token expiry is **1 hour**, not 72 — a reset is an immediate action, an invitation is a scheduled one.

---

## Flow 5 — Offboarding (deactivate, never delete)

We cut the full offboarding workflow from scope, but the deactivate switch is essential and costs almost nothing.

```
HR → Employees → [employee] → "Deactivate"
        │
        ▼
  status = DEACTIVATED
  all refresh tokens invalidated  → existing sessions die at next refresh (≤15 min)
  login blocked with a clear message
        │
        ▼
  ✅ All their data is RETAINED
     (leave history, tickets, chat transcripts, audit trail)
```

**Never hard-delete a user.** Their user ID is referenced by leave requests, tickets, audit rows, and chat conversations. Deleting produces dangling references and destroys the audit trail — which is one of your five differentiators. Deactivation is the correct operation, and "we deactivate, we don't delete, because the audit log must stay intact" is a good answer when an examiner asks about data lifecycle.

---

## Flow 6 — Company provisioning (super_admin)

```
super_admin → /platform/companies → "Add Company"
        │
        ▼
  name · domain · leave policy defaults (e.g. 18 vs 24 annual)
        │
        ▼
  Company created
        │
        ▼
  Create its first admin (name + email) → INVITED → activation link
        │
        ▼
  From here the company is self-sufficient:
  admin invites hr + it_support → hr invites employees
```

### Recommendation on `super_admin`: build it, but keep it tiny

We have four roles today. This adds a fifth — so it needs to justify itself.

**The argument for:** without it, the honest answer to *"how does a new company get onboarded?"* is *"we run a database script."* That is a weak answer to an obvious examiner question, and it leaves the multi-tenancy story with a hole at the front.

**The argument against:** it is a fifth role, a fifth dashboard, and D2 already ruled self-serve tenant onboarding out of scope.

**Verdict — SHOULD-HAVE, scoped to two screens:** a company list and a "create company + first admin" form. That's it. No billing, no plans, no subdomains, no tenant settings console, no analytics across tenants. Roughly a day.

**Critically: the demo must not depend on it.** Both demo companies are created by the seed script. `super_admin` is shown as *"and here's how a third company would be onboarded"* — a bonus, never a dependency. If Phase 5 runs late, this is a clean cut with zero blast radius.

**The first `super_admin` is seeded**, with credentials from environment variables and a forced password change on first login. It is never created through the UI — that would be the same open-registration hole one level up.

---

## User status — the state machine

```
              HR/admin invites
                    │
                    ▼
                INVITED ──── 72h passes ────► EXPIRED
                    │                            │
         activates password              HR clicks "Resend"
                    │                            │
                    ▼                            └──► back to INVITED
                 ACTIVE ◄──────────────┐
                    │                  │
          HR deactivates          HR reactivates
                    │                  │
                    ▼                  │
              DEACTIVATED ─────────────┘
```

`LOCKED` (after repeated failed logins, auto-clearing after 15 minutes) is optional — add it in Phase 6 with rate limiting if time allows.

---

## Data model additions

On the `users` collection:

| Field | Type | Notes |
|---|---|---|
| `status` | `INVITED \| ACTIVE \| DEACTIVATED` | Indexed |
| `passwordHash` | `string \| null` | Null until activation |
| `invitationTokenHash` | `string \| null` | Hashed, single use, cleared on activation |
| `invitationExpiresAt` | `Date \| null` | |
| `invitedBy` | `ObjectId → users` | Who onboarded this person |
| `activatedAt` | `Date \| null` | |
| `resetTokenHash` | `string \| null` | Same pattern, 1h expiry |
| `resetExpiresAt` | `Date \| null` | |
| `refreshTokenHashes` | `string[]` | Invalidated on password reset / deactivation |

No new collection required.

---

## Endpoint changes

### ❌ Removed
```
POST /auth/register        ← delete this. It was a mistake in the earlier draft.
```

### ✅ Public (no token)
```
POST /auth/login                    email + password → tokens
POST /auth/refresh                  rotate refresh → new access
POST /auth/forgot-password          always returns the same message
POST /auth/reset-password           token + new password
GET  /auth/invitation/:token        validate before showing the form
POST /auth/activate                 token + password → ACTIVE + auto-login
```

### 🔒 Authenticated
```
GET   /auth/me                      current user
POST  /auth/logout                  invalidate this refresh token
POST  /auth/change-password         old + new, while logged in

POST  /users/invite                 hr → employee | admin → hr, it_support
POST  /users/:id/resend-invitation
POST  /users/:id/deactivate
POST  /users/:id/reactivate
GET   /users                        role-scoped, tenant-scoped list

POST  /platform/companies           super_admin only
GET   /platform/companies           super_admin only
```

**The rule that governs all of them:** `companyId` is never in a request body. On `/users/invite` it comes from the inviter's JWT. A `super_admin` creating a company is the only place a company is named, and that is a creation, not a selection.

---

## Impact on the team

| Member | What changes |
|---|---|
| **M1** | Phase 1 flow replaces `register` with the invitation + activation endpoints. Token generation/hashing utility is shared by invitation and reset — write it once. Role-creation whitelist enforced in the service layer. |
| **M2** | On invite, initialise the new user's leave balances from the company policy. On deactivate, decide what happens to their open tickets (recommendation: leave them open, reassign manually). |
| **M3** | No change. The assistant is only reachable by authenticated, ACTIVE users. |
| **M4** | **No signup page.** Build instead: landing, login, forgot-password, reset-password, activation, and the invite form inside the HR/Admin dashboards. Role-based redirect after login. |

---

## Open questions for the owner

1. **Approve "no public signup"?** (Strong recommendation: yes)
2. **Add `super_admin` as a fifth role, scoped to two screens?** (Recommendation: yes, as SHOULD-HAVE, demo-independent)
3. **Can HR create other HR users, or admin only?** (Recommendation: admin only)
4. **v1 invitation delivery — copy-link in the UI, or is email worth pulling forward?** (Recommendation: copy-link; email stays deferred per D15)
