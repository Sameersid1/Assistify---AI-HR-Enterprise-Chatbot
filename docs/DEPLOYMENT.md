# Deployment

**Status:** configs prepared, not yet deployed. Both apps build cleanly.

```
server  → tsc         → exit 0
web     → tsc + vite  → exit 0   (dist 702 kB, 208 kB gzipped)
```

---

## First — should you deploy before 16 August?

**Yes, but keep the local build as your demo path.** Deployed is the bonus and the backup, not the thing you present.

### The reason, and it is specific

Render's free tier **spins the service down after 15 minutes of inactivity.** The next request has to boot a cold container — **30 to 60 seconds** during which your login just hangs.

If faculty open your URL cold, they watch a blank screen for a minute before anything happens. That is a worse first impression than not having a URL at all.

**Mitigations, in order of usefulness:**
1. Demo from `localhost`. Deployed URL is what you share afterwards.
2. If you must demo live, **load the site 2 minutes before** and keep a tab open — the service stays warm while it's being used.
3. A cron pinging `/api/v1/health` every 10 minutes keeps it awake, but free-tier hours are finite; this burns them.

### What deploying buys you
A URL in your report, faculty can try it after the demo, and — genuinely valuable — it forces you to fix the environment-variable and CORS problems now rather than at 11pm on the 15th.

**Budget 2 hours.** Not a day, but not 20 minutes either. Do it on a day when nothing else is due.

---

## Order matters — there is a circular dependency

The frontend needs the backend's URL. The backend's CORS needs the frontend's URL. Neither exists yet. Break the cycle like this:

```
1. MongoDB Atlas    → get MONGO_URI
2. Render (backend) → deploy with a placeholder CLIENT_URL → get API URL
3. Vercel (frontend)→ deploy with VITE_API_URL = the Render URL → get web URL
4. Render again     → set CLIENT_URL = the Vercel URL → redeploy
5. Seed Atlas
```

Step 4 is the one everyone forgets, and the symptom is a CORS error that looks like the backend is down.

---

## Step 1 — MongoDB Atlas

1. Create a free **M0** cluster (any region near you; Mumbai `ap-south-1` if offered).
2. **Database Access** → add a user, e.g. `assistify_app`, with a generated password. Save it.
3. **Network Access** → add `0.0.0.0/0`.

   > This looks alarming. It is necessary: Render's free tier has no static outbound IP, so there is nothing narrower to allowlist. The database is still protected by SCRAM credentials over TLS. Say exactly that if an examiner asks — it is a deliberate, explained tradeoff, not an oversight.

4. **Connect → Drivers** → copy the SRV string and append the database name:

```
mongodb+srv://assistify_app:<password>@cluster0.xxxxx.mongodb.net/assistify?retryWrites=true&w=majority
```

`<password>` must be URL-encoded if it contains `@ : / ? # [ ] %`.

## Step 2 — Render (backend)

**New → Web Service → connect the GitHub repo.** `render.yaml` in the repo root already declares the settings, or set them manually:

| Setting | Value |
|---|---|
| Root directory | `server` |
| Build command | `npm ci && npm run build` |
| Start command | `npm start` |
| Health check path | `/api/v1/health` |

Environment variables:

```
NODE_ENV           production
CLIENT_URL         http://localhost:5173     ← placeholder, fixed in step 4
MONGO_URI          <your Atlas SRV string>
JWT_ACCESS_SECRET  <64+ random hex chars>
JWT_REFRESH_SECRET <different 64+ random hex chars>
ACCESS_TOKEN_TTL   15m
REFRESH_TOKEN_TTL  7d
```

Generate the two secrets — **do not reuse your local ones**, they are on your disk in plaintext:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Do **not** set `PORT`. Render injects it, and `config/env.ts` already reads `process.env.PORT`.

**Verify before moving on:**
```
https://assistify-api.onrender.com/api/v1/health
→ {"success":true,"data":{"status":"ok","db":"connected"}}
```
If `db` is not `connected`, it is the Atlas allowlist or a bad password — not your code.

## Step 3 — Vercel (frontend)

**Add New → Project → import the repo.**

| Setting | Value |
|---|---|
| Root directory | `web` |
| Framework preset | Vite *(auto-detected)* |
| Build command | `npm run build` |
| Output directory | `dist` |

One environment variable:

```
VITE_API_URL = https://assistify-api.onrender.com/api/v1
```

> ⚠️ **`VITE_*` variables are baked in at build time, not read at runtime.** Changing one in the dashboard does nothing until you redeploy. This catches everybody once.

`web/vercel.json` is already committed and handles the SPA rewrite — without it, refreshing on `/app/employees` returns a 404 because Vercel looks for a file at that path.

## Step 4 — close the loop

Back in Render → Environment → set `CLIENT_URL` to your real Vercel URL (no trailing slash):

```
CLIENT_URL = https://assistify-xyz.vercel.app
```

Render redeploys automatically. **Skipping this means every login fails with a CORS error.**

## Step 5 — seed Atlas

The remote database is empty. Seed it from your machine by pointing at Atlas temporarily:

```powershell
cd server
$env:MONGO_URI = "mongodb+srv://...your Atlas string..."
npm run seed
Remove-Item Env:\MONGO_URI      # back to local mongo afterwards
```

Confirm six users across two tenants.

---

## Verify the deployment

- [ ] `/api/v1/health` returns `db: connected`
- [ ] Vercel URL loads the landing page
- [ ] Login as `hr@nexora.com` / `Password123!` succeeds
- [ ] **Refresh while on `/app`** — you stay logged in *(proves `/auth/me` + token storage work in production)*
- [ ] **Hard-refresh on `/app/employees`** — no 404 *(proves the SPA rewrite)*
- [ ] Log in as `employee@nexora.com`, try `/app/employees` — bounced *(role guard)*
- [ ] Log in as `hr@vertex.io` — different company data *(tenant isolation)*
- [ ] Browser console: **no CORS errors**
- [ ] Demo persona autofill is **absent** *(it is `import.meta.env.DEV` gated — its absence proves the production build stripped it)*

---

## Known gotchas

| Symptom | Cause |
|---|---|
| First request hangs ~50s | Render free-tier cold start. Expected. Warm it before demoing. |
| CORS error in console | `CLIENT_URL` still the placeholder, or has a trailing slash |
| Login works, refresh logs you out | `VITE_API_URL` wrong, or missing the `/api/v1` suffix |
| 404 on refresh at a sub-route | `vercel.json` not picked up — check root directory is `web` |
| `db: disconnected` | Atlas IP allowlist, or an un-encoded password |
| Env var change had no effect | `VITE_*` are build-time. Redeploy. |

### CORS allows exactly one origin

`app.ts` sets `origin: env.CLIENT_URL` — a single value. **Vercel preview deployments get unique URLs** (`assistify-git-branch-you.vercel.app`) and every one of them will fail CORS. Only the production URL works. Fine for now; if it becomes annoying, change the origin to a function that accepts a list.

### Bundle size

`701 kB` raw, `208 kB` gzipped — acceptable, and fine over a real connection. If you want it smaller later, `framer-motion` and per-icon `lucide-react` imports are the two biggest wins. Not worth doing before the demo.

---

## What I cannot do for you

Deployment needs accounts and credentials I do not have and should not handle: MongoDB Atlas, Render, Vercel. No deploy CLI is installed on this machine either.

Everything up to the click is done: both apps build, `vercel.json` and `render.yaml` are committed, and the steps above are exact. If a step fails, paste the error and I will debug it.
