# Assistify — B.Tech Final Year Project Presentation

**Slide-by-slide content for the KIET template (21 slides).**

Each section gives you two things:

- **ON THE SLIDE** — the actual text to paste. Kept short on purpose: faculty
  penalise walls of text, and you want them listening to you, not reading ahead.
- **SAY THIS** — speaker notes. Do not put these on the slide.

> **Read the note on Slide 11 before you build the deck.** This template is
> written for ML/research projects and asks for Accuracy/Precision/Recall/F1.
> You did not train a model, so those numbers do not exist for your project.
> Slide 11 explains what to present instead and how to defend it.

---

## Slide 1 — Title

**ON THE SLIDE**

```
Title of Project:
Assistify — AI-Powered HR Assistant with Enterprise Knowledge Search

Project ID:              [your ID]
Project Classification:  Application / Product
Presentation:            [First / Second]
Date of Presentation:    [date]
PPT Approved by Guide:   [Yes / No]

Student Name(s):  [all four names]
Guide:            Prof. / Dr. ______
```

**SAY THIS**

Classification is **Application/Product**, not Research. Say it confidently. If
a faculty member asks "where is the research contribution?", the answer is:
*"This is classified as an application project. The engineering contribution is
the multi-tenant architecture and the security model, not a novel algorithm."*
Trying to dress a web application up as research is how you get taken apart in
Q&A.

---

## Slide 2 — Introduction

**ON THE SLIDE**

```
Background
• HR departments answer the same policy questions repeatedly —
  leave balance, policy rules, IT access
• Answers live scattered across PDFs, emails and people's memory

Motivation
• Employees wait hours or days for answers that already exist in writing
• HR spends time on repetitive queries instead of actual people work

Need for the Project
• A single system that holds HR data and answers from it,
  with correct access control for each role

Current Scenario
• Existing HR software is expensive and enterprise-focused
• Generic chatbots cannot access company-specific data securely
```

**SAY THIS**

Anchor it in something concrete: *"An employee wants to know how many casual
leave days they have left. Today that means messaging HR and waiting. The data
already exists — it just isn't reachable."*

That framing makes the rest of the presentation obvious.

---

## Slide 3 — Problem Statement

**ON THE SLIDE**

```
The Problem
Employees cannot get instant, accurate answers to HR questions,
and HR cannot scale to answer them individually.

Existing Challenges
• Information scattered — PDFs, email threads, tribal knowledge
• No self-service — every query needs a human
• Access control is hard — payroll, leave and IT data
  must not be visible to everyone
• Multi-company products need strict data isolation:
  one company must never see another's data

Why It Needs Solving
• Repetitive queries consume HR capacity that should go to
  hiring, grievances and employee development
• Delayed answers directly affect employee experience
```

**SAY THIS**

The **fourth** challenge — data isolation — is the one that makes this an
engineering problem rather than a UI problem. Emphasise it, because it's what
the rest of your deck is built on.

---

## Slide 4 — Objectives

**ON THE SLIDE**

```
Main Objective
Build a secure, multi-tenant HR platform that centralises employee,
leave and policy data with role-based access control.

Specific Objectives
1. Design a multi-tenant data model where a single deployment
   serves multiple companies with complete data isolation
2. Implement invitation-based onboarding with no public sign-up,
   using single-use expiring tokens
3. Enforce role-based access control across five roles at both
   the route and the business-logic layer
4. Build a leave management module with a state machine and
   concurrency-safe balance handling
5. Deploy the system to production and verify the flows end to end

Expected Outcomes
• A deployed, working platform
• Verified role and tenant isolation
• A foundation ready for the AI assistant layer
```

**SAY THIS**

Five objectives, all of which you actually met. Do not add "build an AI chatbot"
as an objective if it isn't built — you'd be writing your own trap for the
Conclusion slide, where you have to say which objectives were achieved.

---

## Slide 5 — Literature Review

> **You must fill this yourself. Do not cite a paper you have not opened.**
> Faculty ask "what was the gap in reference 3?" and a fabricated citation ends
> the presentation badly.

**ON THE SLIDE** — use a comparison table, not bullets:

```
| # | Work / Standard        | Focus                      | Limitation / Gap        |
|---|------------------------|----------------------------|-------------------------|
| 1 | [HR chatbot paper]     | NLP-based HR query bot     | Single-tenant; no RBAC  |
| 2 | [Multi-tenancy paper]  | SaaS isolation patterns    | No HR-domain treatment  |
| 3 | [RAG paper]            | Retrieval-augmented gen.   | No access-control layer |
| 4 | RFC 9106 (Argon2)      | Password hashing standard  | Primitive, not a system |
| 5 | OWASP ASVS             | Security verification req. | Checklist, not design   |

Research Gap
Existing HR chatbot work assumes a single organisation and does not
address tenant isolation or role-based authorisation of the data the
assistant is allowed to reach.
```

**How to find papers 1–3 (about 30 minutes on IEEE Xplore or Google Scholar):**

Search these exact strings:
- `"HR chatbot" employee self-service`
- `multi-tenant SaaS data isolation architecture`
- `retrieval augmented generation enterprise documents`
- `role-based access control web application`

**Standards you can cite safely** — these definitely exist, but still open them
before citing:
- IETF RFC 7519 — *JSON Web Token (JWT)*
- IETF RFC 9106 — *Argon2 Memory-Hard Function for Password Hashing*
- OWASP Application Security Verification Standard (ASVS)
- Lewis et al., *Retrieval-Augmented Generation for Knowledge-Intensive NLP
  Tasks*, NeurIPS 2020

**SAY THIS**

The gap statement is the point of this slide. Yours is genuinely defensible:
HR chatbot literature treats one company; you treat many, with isolation as a
first-class requirement.

---

## Slide 6 — Proposed Methodology

**ON THE SLIDE**

```
Technologies
Frontend    React 19 · TypeScript · Vite · Tailwind CSS · shadcn/ui
Backend     Node.js · Express · TypeScript · Mongoose
Database    MongoDB (Atlas)
Security    JWT (access + refresh) · Argon2id · Zod · Helmet · CORS
Deployment  Render (API) · Vercel (frontend) · MongoDB Atlas

Working Process — Onboarding Flow
Admin invites HR
   → single-use token generated (SHA-256 hashed, 72h expiry)
   → invitation email sent over HTTPS
   → HR opens link, token validated
   → HR sets password (Argon2id) → account ACTIVE
   → auto-login, tokens issued

Development Methodology
Incremental / Agile — module by module, each verified end to end
before starting the next
```

**Draw this flowchart** (PowerPoint shapes, keep it simple):

```
   ┌──────────┐   invite    ┌──────────┐   invite    ┌────────────┐
   │  ADMIN   │────────────▶│    HR    │────────────▶│  EMPLOYEE  │
   └──────────┘             └──────────┘             └────────────┘
        │                        │                         │
        │ creates                │ approves                │ applies
        ▼                        ▼                         ▼
   ┌──────────┐             ┌──────────┐             ┌────────────┐
   │IT SUPPORT│             │  LEAVE   │◀────────────│   LEAVE    │
   └──────────┘             │ DECISION │             │  REQUEST   │
                            └──────────┘             └────────────┘
```

**SAY THIS**

The one-way arrows are the message: **who can create whom is a fixed whitelist**.
HR cannot create HR. Point at it and say so — it's the clearest visual proof
that you thought about security.

---

## Slide 7 — System Architecture

**ON THE SLIDE** — rebuild this as PowerPoint boxes, don't paste ASCII art:

```
┌─────────────────────┐         ┌──────────────────────┐        ┌───────────────┐
│   React SPA         │  HTTPS  │   Express REST API   │        │  MongoDB      │
│   (Vercel)          │────────▶│   (Render)           │───────▶│  Atlas        │
│                     │  JSON   │                      │Mongoose│               │
│  • React Router     │         │  • helmet / cors     │        │  companies    │
│  • AuthContext      │◀────────│  • requireAuth (JWT) │        │  users        │
│  • API client       │ success │  • requireRole       │        │  leaveBalances│
│  • ProtectedRoute   │ /error  │  • Zod validation    │        │  leaveRequests│
└─────────────────────┘         │  • error handler     │        └───────────────┘
                                └──────────┬───────────┘
                                           │              ┌──────────────┐
                                           └─────────────▶│ Email (HTTPS)│
                                                          └──────────────┘
```

**Label the arrows.** Add a caption under the diagram:

> Every request carries a JWT. `companyId` is read from the verified token,
> never from the request body — this is what enforces tenant isolation.

**SAY THIS**

If you say only one sentence on this slide, say that caption. It's the single
most important design decision in the project.

---

## Slide 8 — Software & Hardware Requirements

**ON THE SLIDE**

```
Software
• Node.js 20+ · TypeScript 5.7
• MongoDB 7 / MongoDB Atlas (cloud)
• React 19 · Vite
• VS Code, Git, GitHub
• Postman (API testing)

Hardware (Development)
• Intel i5 or equivalent, 8 GB RAM
• Internet connection (cloud database)

Hardware (Deployment)
• None — fully cloud-hosted
• Render (API) · Vercel (frontend) · MongoDB Atlas (database)
• Accessible from any device with a browser
```

**SAY THIS**

"No hardware required for deployment" is a genuine advantage of a web
application — say it out loud rather than leaving the slide looking thin.

---

## Slide 9 — Modules

**ON THE SLIDE**

```
1. Authentication Module
   Login, JWT issue/refresh/rotation, logout, session restore

2. Onboarding & Invitation Module
   Token generation, email delivery, activation, account status

3. User Management Module
   Invite, list, deactivate/reactivate, role-creation whitelist

4. Leave Management Module
   Balance provisioning, apply, approve, reject, cancel, state machine

5. Access Control Module (cross-cutting)
   Route-level role gates + service-level ownership checks

6. Tenant Isolation Module (cross-cutting)
   Every query scoped by companyId taken from the verified token

7. Notification Module
   Transactional email with SMTP and HTTPS transports
```

**SAY THIS**

Modules 5 and 6 are marked cross-cutting because they aren't screens — they run
on every request. Saying that shows you understand the difference between a
feature and an architectural concern.

---

## Slide 10 — Implementation

**ON THE SLIDE** — screenshots only, minimal text. Take these six:

```
1. Login page
2. Admin panel — Invite HR / Staff dialog
3. The invitation email as received in a real inbox
4. Activation page — new user setting their password
5. Role-specific dashboard (HR or Admin)
6. Employee directory / user list
```

**Layout:** two per slide, three slides. One-line caption under each. Crop the
screenshots rather than stretching them.

**SAY THIS**

Screenshot 3 — the real email in a real inbox — is worth more than the other
five combined. It proves the system is deployed and actually reaching people,
not running on localhost. Make sure the timestamp is visible.

**Prepare a live demo as backup.** If the projector allows it, run the invite →
email → activate → login flow live. It takes 90 seconds and is far more
convincing than screenshots. Wake the Render service about 2 minutes before you
present — the free tier sleeps and the first request takes 30–50 seconds.

---

## Slide 11 — Results & Discussion

> **The template asks for Accuracy / Precision / Recall / F1. You do not have
> these, and you must not invent them.** Those are classification metrics for a
> trained model. Your project is a software system, so the correct results are
> functional verification and performance measurements.
>
> If asked why there's no accuracy figure:
> *"Those are model evaluation metrics. This project is classified as an
> application, so the results are functional verification — whether each
> security boundary holds and whether the flows complete correctly."*
> That is a correct answer, not an excuse.

**ON THE SLIDE**

```
Functional Verification — Access Control Matrix

| Action                       | Employee | HR    | IT    | Admin |
|------------------------------|----------|-------|-------|-------|
| View own leave balance       | ✔        | ✔     | ✔     | ✔     |
| Apply for leave              | ✔        | ✔     | ✔     | ✔     |
| Approve others' leave        | ✘ 403    | ✔     | ✘ 403 | ✔     |
| Approve OWN leave            | ✘ 403    | ✘ 403 | ✘ 403 | ✘ 403 |
| Invite an employee           | ✘ 403    | ✔     | ✘ 403 | ✔     |
| Invite an HR                 | ✘ 403    | ✘ 403 | ✘ 403 | ✔     |
| Access another company's data| ✘ 404    | ✘ 404 | ✘ 404 | ✘ 404 |

All boundaries verified against the deployed system.
```

```
End-to-End Flows Verified
✔ Admin invites HR → email delivered → activation → login
✔ HR invites employee → 201 Created
✔ HR attempts to invite HR → 403 Forbidden (escalation blocked)
✔ Leave apply → balance reserved → approve → balance consumed
✔ Duplicate / overlapping leave request → 409 Conflict

Observations
• Invitation email delivery: measured 3.3 s and 11.5 s (cold transport)
• Concurrency: atomic balance update prevents over-allocation of
  leave days under simultaneous requests
• System deployed and publicly reachable
```

**SAY THIS**

Point at the row **"Approve OWN leave — ✘ for everyone including Admin"**. That
is separation of duties, and it's the row that shows you thought about the
domain and not just the code. Faculty who have seen a hundred CRUD projects will
notice it.

**Put your own numbers in before presenting.** Re-run the flows and note the
actual timings — don't present these without checking them yourself.

---

## Slide 12 — Cost Estimation

**ON THE SLIDE**

```
Actual Development Cost

| Item                   | Cost | Notes                      |
|------------------------|------|----------------------------|
| Software / Licenses    | ₹0   | Fully open-source stack    |
| Hardware               | ₹0   | Existing student laptops   |
| Cloud — API (Render)   | ₹0   | Free tier                  |
| Cloud — Web (Vercel)   | ₹0   | Free tier                  |
| Database (Atlas M0)    | ₹0   | Free tier, 512 MB          |
| Email (Brevo)          | ₹0   | Free tier, 300 emails/day  |
| Domain                 | ₹0   | Platform subdomains        |
| TOTAL                  | ₹0   |                            |

Estimated Production Cost (~500 users)

| Item                        | Cost / month |
|-----------------------------|--------------|
| Render Starter (always-on)  | ~₹600        |
| MongoDB Atlas M10           | ~₹4,800      |
| Transactional email         | ~₹1,600      |
| Domain + SSL                | ~₹100        |
| TOTAL                       | ~₹7,100      |
```

**SAY THIS**

₹0 is a strong answer, not a weak one — say *"the entire system was built and
deployed at zero cost using open-source software and free cloud tiers."* Then
show the second table to prove you understand what it would actually cost to
run, because "free" on its own sounds naive.

Verify the production figures before presenting — cloud pricing changes.

---

## Slide 13 — Project Complexity

**ON THE SLIDE** — one line each, expand verbally:

```
Technical Complexity
Full-stack TypeScript across two applications sharing an API contract;
stateless JWT authentication with rotating refresh tokens

Algorithm Complexity
Working-day computation excluding weekends; concurrency-safe balance
reservation using an atomic conditional update; leave state machine

Database Complexity
Multi-tenant schema with compound indexes; unique constraint enforcing
one balance row per user/year/leave-type; idempotent provisioning

UI/UX Complexity
Four role-specific dashboards from one codebase; route guards;
responsive layouts; light and dark theming

Integration Complexity
Two independently deployed applications on different domains; CORS;
token refresh and request replay; dual email transports (SMTP + HTTPS)

Deployment Complexity
Three cloud platforms; environment separation between local and
production; a circular configuration dependency resolved in two passes
```

**SAY THIS**

If asked to pick the hardest, say the **concurrency problem** in leave balances,
and be ready to explain it — an employee with 2 days left submitting three
2-day requests. It's the most technically interesting thing in the project.

---

## Slide 14 — Relevance to Environment & SDGs

**ON THE SLIDE**

```
a) Relevance to Environment
• Fully paperless — leave applications, approvals and policy
  distribution replace printed forms and physical files
• Cloud-hosted with no dedicated on-premise server, reducing
  hardware and energy footprint
• Supports remote and distributed work, reducing commute

b) Applicable SDGs
• SDG 8 — Decent Work and Economic Growth
  Transparent leave entitlement and a documented approval trail;
  employees can see their own rights without having to ask
• SDG 9 — Industry, Innovation and Infrastructure
  Affordable digital infrastructure for small organisations that
  cannot afford enterprise HR software
• SDG 12 — Responsible Consumption and Production
  Elimination of paper-based HR record keeping

c) Evidence of Addressing SDGs
• Code repository:
  github.com/Sameersid1/Assistify---AI-HR-Enterprise-Chatbot
• Live deployment (publicly accessible URLs)

d) Ethics & Safety
• Human Participants: none — no user study conducted
• Data: no real employee data used; all test data is synthetic
• Privacy by design: passwords stored only as Argon2id hashes;
  tokens stored only as SHA-256 hashes; no plaintext credentials
• Least privilege: IT Support deliberately cannot access leave data,
  which is medical-adjacent personal information
• Conflict of Interest: none
```

**SAY THIS**

**SDG 8 is your honest primary fit.** Don't claim SDG 3 (health) or SDG 4
(education) just because the template lists them as examples — a stretched SDG
claim invites a question you can't answer.

The privacy-by-design points under Ethics are real and specific. Faculty rarely
see a student project that considered this at all.

---

## Slide 15 — Applications

**ON THE SLIDE**

```
Direct Applications
• Small and medium enterprises without dedicated HR software
• IT services companies managing distributed teams
• Educational institutions — staff leave and administration
• Startups needing HR infrastructure at low cost

Multi-Tenant Advantage
A single deployment can serve many organisations simultaneously,
each fully isolated — enabling a SaaS delivery model rather than
a separate installation per customer

Adaptable To
• Hospital staff scheduling and duty rosters
• Contractor and workforce management
• Any domain needing role-based approval workflows
```

**SAY THIS**

The template's example list (Healthcare, Banking, Agriculture, Smart Cities) is
generic. Yours is specific to what you built, which reads far better. The
multi-tenant point is the commercially interesting one — you built a product,
not an installation.

---

## Slide 16 — Advantages & Limitations

> Be honest here. A limitations slide that says "scalability" and nothing else
> tells faculty you haven't examined your own work. Specific limitations with
> known fixes read as maturity.

**ON THE SLIDE**

```
Advantages
• True multi-tenancy — one deployment, many companies, isolated data
• Security by design — no public sign-up; invitation-only onboarding;
  Argon2id hashing; short-lived tokens with rotation and reuse detection
• Role-based access enforced server-side, not merely hidden in the UI
• Concurrency-safe leave balances — cannot be over-allocated
• Zero infrastructure cost; deployed and publicly accessible
• Graceful degradation — if email fails, the activation link is still
  returned so onboarding can continue

Limitations
• AI assistant layer designed but not yet implemented
• Some dashboard screens still render placeholder data pending
  API integration
• No automated test suite — verification was manual
• No rate limiting on authentication endpoints
• No audit log for sensitive administrative actions
• Free-tier hosting sleeps when idle, causing a cold-start delay
```

**SAY THIS**

Volunteering "AI not yet implemented" **before** they ask is the single most
important choice in this deck. Your project title says AI-Powered. If a faculty
member discovers it isn't built, everything else you claimed becomes suspect. If
you state it yourself, you control the framing:

> *"The AI layer is designed and scoped — tool calling over the HR APIs with
> retrieval over policy documents. What we built first is the platform
> underneath it, because an assistant with no secure data layer to read from
> isn't useful. That's the next phase."*

That's a defensible engineering sequence, and it's true.

---

## Slide 17 — Future Scope

**ON THE SLIDE**

```
Phase 1 — AI Assistant (designed, next to build)
• Conversational interface over the existing HR APIs
• Tool calling: the assistant invokes real functions (leave balance,
  apply for leave) rather than generating answers from memory
• Tools execute under the caller's own permissions — the assistant
  can never exceed what the user is already allowed to do

Phase 2 — Enterprise Knowledge Search
• Upload and index company policy documents
• Retrieval-augmented generation with vector search
• Retrieval filtered by company, so no cross-tenant policy leakage

Phase 3 — Platform Completion
• IT ticketing module
• HR analytics dashboard
• Automated test suite and audit logging
• Mobile application
```

**SAY THIS**

The line that impresses — *"tools execute under the caller's own permissions"* —
means a user can't get the AI to fetch data they couldn't fetch themselves. Say
it. It shows the AI plan inherits the security model rather than bypassing it,
which is the mistake most people make.

---

## Slide 18 — Project Outcomes

**ON THE SLIDE** — state the truth:

```
Research Paper
• Status: [Not communicated / Communicated — pick the true one]
• Planned: an application paper on multi-tenant access control
  for HR assistant systems

Patent
• Status: Not filed

Technical Outcomes Achieved
• Working multi-tenant platform, deployed and publicly accessible
• Public code repository with documented architecture decisions
• Complete authentication and onboarding system verified end to end
• Leave management module with concurrency-safe balance handling
```

**SAY THIS**

If you have no paper and no patent, say so plainly and move on. The "Technical
Outcomes" block means the slide isn't empty and redirects to what you did
deliver. Never write "Communicated" for a paper you haven't submitted — that is
checkable, and it's the kind of claim that follows you.

---

## Slide 19 — Conclusion

**ON THE SLIDE**

```
Objectives Achieved
✔ Multi-tenant architecture with database-level data isolation
✔ Invitation-based onboarding — no public sign-up
✔ Five-role RBAC enforced at route and service layers
✔ Leave management with a state machine and safe concurrency
✔ Deployed to production and verified end to end

Key Contributions
• A security model where tenant identity comes from a verified token
  and can never be supplied by the client
• A role-creation whitelist that prevents privilege escalation —
  HR cannot create another HR
• Concurrency-safe quota management using atomic conditional updates

Final Remarks
Assistify delivers a working, secure, multi-tenant HR platform.
The AI assistant layer is designed and is the immediate next phase.
The foundation it requires — authenticated, role-aware, tenant-isolated
data access — is complete.
```

**SAY THIS**

The five achieved objectives map exactly onto Slide 4. That's deliberate —
examiners check. Never list an objective on Slide 4 that you can't tick here.

The last sentence is your closing line. Practise it.

---

## Slide 20 — References

**ON THE SLIDE** — IEEE format, 8–15 entries:

```
[1] A. Author, B. Author, "Title of paper," Journal Name, vol. x,
    no. x, pp. xx–xx, Year.

[2] A. Author, "Title of paper," in Proc. Conference Name, City,
    Country, Year, pp. xx–xx.
```

**Entries you can include (verify each by opening it):**

```
[ ] M. Jones, J. Bradley, and N. Sakimura, "JSON Web Token (JWT),"
    IETF RFC 7519, May 2015.

[ ] A. Biryukov, D. Dinu, D. Khovratovich, and S. Josefsson, "Argon2
    Memory-Hard Function for Password Hashing and Proof-of-Work
    Applications," IETF RFC 9106, September 2021.

[ ] OWASP Foundation, "Application Security Verification Standard (ASVS)."
    [Online]. Available: https://owasp.org/

[ ] OWASP Foundation, "OWASP Top 10." [Online].
    Available: https://owasp.org/www-project-top-ten/

[ ] P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive
    NLP Tasks," in Proc. NeurIPS, 2020.

[ ] MongoDB Inc., "MongoDB Documentation." [Online].
    Available: https://www.mongodb.com/docs/
```

**Still needed: 4–6 domain papers on HR chatbots / multi-tenant SaaS.** Find them
on IEEE Xplore or Google Scholar using the search strings on Slide 5. Cite them
in the Literature Review table so the two slides agree — an uncited reference,
or a citation with no matching reference, is an easy mark to lose.

---

## Slide 21 — Thank You

**ON THE SLIDE**

```
Thank You

Questions & Answers

Repository:  github.com/Sameersid1/Assistify---AI-HR-Enterprise-Chatbot
Live Demo:   [your Vercel URL]
```

**SAY THIS**

Putting the live URL on the final slide is a quiet confidence signal — it says
the project is real and inspectable. Make sure the Render service is awake
before you reach this slide.

---

# Anticipated Questions

Prepare these. They are the ones faculty actually ask.

**"Where is the AI? The title says AI-Powered."**
> The AI layer is designed and scoped — tool calling over the HR APIs with
> retrieval over policy documents — and it's the next phase. We built the
> platform underneath it first, because an assistant needs a secure, role-aware
> data layer to read from before it's useful.

**"How is this different from existing HR software?"**
> Two things. It's multi-tenant, so one deployment serves many companies with
> isolated data rather than a separate installation per customer. And it uses
> invitation-based onboarding rather than public sign-up, because in HR software
> you don't sign yourself up for your employer's system — someone grants you
> access.

**"What if two employees apply for the same leave days simultaneously?"**
> The balance check and the update are a single atomic database operation with a
> condition attached, so the second request matches no record and is rejected
> with a conflict error. A naive read-then-write would let both succeed — that's
> a check-then-act race, and putting the check inside the update eliminates it.

**"How do you stop one company seeing another's data?"**
> The company ID comes from the signed authentication token, never from the
> request. Every database query is filtered by it. A user requesting another
> company's record by its real ID gets a 404, because the query filters on both
> the ID and the company and matches nothing.

**"Why MongoDB and not SQL?"**
> The data is document-shaped — one user record holds the profile, invitation
> state and session data that would be three or four joined tables in SQL. The
> honest counterpoint is that leave balances are relational and PostgreSQL would
> have given us transactions; we handled that with atomic operators instead.

**"Did you test it?"**
> Manually and systematically — the access control matrix on the results slide is
> the outcome of that, and there's a script that walks the role rules. There's no
> automated test suite, and that's the gap we'd close first.

**"What was the hardest problem?"**
> Invitation emails worked locally and failed in production with identical
> credentials. The failure said "connection timeout" rather than an
> authentication error, which meant the connection was never completing — the
> hosting platform blocks the outbound ports email uses, because free hosts that
> can send mail get abused by spammers. We switched to sending over HTTPS
> instead, which no host can block without breaking the site itself.

**"How many people worked on it, and what did you do?"**
> Answer honestly and specifically. Naming your own slice — frontend and
> integration, or backend, or deployment — is more credible than four people all
> claiming everything.

---

# Deck Checklist

**Before submitting for guide approval:**
- [ ] Fill in Project ID, names, guide name, presentation number, date
- [ ] Complete Slide 5 with real papers you have opened
- [ ] Make Slide 20 references match Slide 5 citations exactly
- [ ] Take the six screenshots for Slide 10
- [ ] Re-run the flows and put YOUR measured numbers on Slide 11
- [ ] Verify the production cost figures on Slide 12
- [ ] Rebuild the ASCII diagrams as PowerPoint shapes — they will not paste well
- [ ] Check every slide has the Project ID in the footer

**On presentation day:**
- [ ] Wake the Render service about 2 minutes before you start
- [ ] Confirm you can log in on the deployed site
- [ ] Have the live invite → email → activate flow ready as a demo
- [ ] Have the repository open in a browser tab
- [ ] Know which slide you'd skip if short on time (Slide 15)

**Timing:** 21 slides in a typical 15-minute slot is roughly 40 seconds each.
Spend your time on Slides 6, 7, 11 and 16 — methodology, architecture, results
and limitations. Move quickly through 8, 12 and 15.
