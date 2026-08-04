# v0 Prompt Pack — Assistify Frontend

**How to use this file**

1. Paste **Prompt 0** into a fresh v0 chat first. It establishes the design system and the app shell. Everything after inherits it.
2. Then paste **one screen prompt at a time**, in the order given, in the *same* v0 chat so it keeps the design language.
3. Export each result into `web/src/features/…` and wire routing yourself.

**Do not paste all screens at once.** v0 degrades badly when asked for many screens in one go — you get generic layouts and inconsistent spacing.

---

## Design decisions (made for you — reasoning included)

| Decision | Choice | Why |
|---|---|---|
| **Component library** | shadcn/ui | v0's native output. Copy-paste ownership, no runtime dependency, Tailwind-native |
| **Neutral palette** | Zinc | Slightly cooler and more modern than slate; reads enterprise, not clinical |
| **Primary accent** | Indigo 600 `#4F46E5` | Trustworthy and corporate without being the default "corporate blue". Works in light and dark |
| **Semantic colours** | Emerald (approved) · Amber (pending) · Rose (rejected) · Zinc (closed) | Status must be readable at a glance in a table. Reserve colour for meaning only |
| **Typography** | Inter, `tabular-nums` on all numbers | Numbers in tables must align vertically. Non-negotiable for a data product |
| **Elevation** | Flat — 1px borders, no shadows on cards | Shadows on everything is the tell of a student project. Shadows only for popovers, dialogs, dropdowns |
| **Radius** | `0.5rem` (8px) | Sharp enough to look professional, soft enough to look current |
| **Density** | Compact — 40px table rows, `py-2` cells | Enterprise tools are denser than consumer apps. HR scans lists |
| **Sidebar** | Fixed left, 256px, collapsible to 64px icons, Sheet drawer under 768px | Standard for role-based tools. Nav is data-driven so Phase 4 can add Chat/Tickets/Analytics without a rewrite |
| **Top bar** | 56px — page title left, search + bell + avatar right | Shallow so content gets the vertical space |
| **Dark mode** | CSS variables wired, toggle in the avatar menu | Nearly free with shadcn, and it demos well |

**The look we're targeting:** Linear / Vercel dashboard / Notion. Restrained, dense, generous whitespace *between* groups but tight *within* them.

---

# PROMPT 0 — Design system + app shell

> Paste this first, before anything else.

```
You are building the frontend for "Assistify", an AI-powered HR assistant used
by companies to let employees ask HR questions, check leave balances, apply for
leave, and raise support tickets.

STACK CONSTRAINTS — important:
- Plain React 19 + TypeScript + Vite. NOT Next.js.
- Do not use next/link, next/image, next/navigation, server components, or any
  "use client" directives. Use react-router-dom for navigation.
- Tailwind CSS + shadcn/ui components only.
- lucide-react for icons.

DESIGN SYSTEM — apply to everything you generate from now on:

Colours
- Neutral base: zinc (zinc-50 background, zinc-200 borders, zinc-900 text)
- Primary accent: indigo-600 (#4F46E5), hover indigo-700
- Status colours, used ONLY for status: emerald-600 approved/active,
  amber-600 pending/invited, rose-600 rejected/error, zinc-500 closed/inactive
- No gradients anywhere. No purple-on-white. No colour used decoratively.

Typography
- Inter, system fallback.
- Page titles: text-2xl font-semibold tracking-tight
- Section headings: text-sm font-medium text-zinc-500 uppercase tracking-wide
- Body: text-sm
- ALL numeric values use tabular-nums so columns align.

Surfaces
- Cards: bg-white, border border-zinc-200, rounded-lg, NO shadow.
- Shadows only on dialogs, dropdowns and popovers.
- Border radius 0.5rem throughout.

Density
- Table rows 40px, cells py-2 px-3, headers text-xs uppercase text-zinc-500.
- Page content max-width 1280px, padding p-6.
- Gap between page sections: space-y-6.

Dark mode
- Use shadcn CSS variables so dark mode works via a `dark` class on <html>.

WHAT TO BUILD IN THIS FIRST STEP — the application shell only:

1. A fixed left sidebar, 256px wide:
   - Top: the Assistify wordmark with a small indigo square logo mark.
   - Nav items rendered from a typed array (label, icon, href, roles[]),
     filtered by the current user's role. Do not hardcode the list in JSX.
   - Active item: indigo-50 background, indigo-700 text, 2px indigo left border.
   - Collapsible to a 64px icon-only rail with a toggle at the bottom.
   - Under 768px it becomes a shadcn Sheet drawer opened from a hamburger.

2. A 56px top bar:
   - Left: current page title.
   - Right: a search input (w-64, muted), a notification bell Button with a
     small indigo dot badge, and an avatar DropdownMenu containing the user's
     name, email, role badge, a dark-mode toggle, and Log out.

3. A content area that renders children, max-w-[1280px], p-6.

Nav items to define (role-gated):
  employee:    Dashboard, Chat, My Tickets
  hr:          Dashboard, Chat, Employees, Leave Approvals, Documents,
               Tickets, Analytics
  it_support:  Dashboard, IT Tickets
  admin:       Dashboard, Users, Settings
(Chat, Documents, Tickets and Analytics are placeholders for now — render the
nav entries but the pages come later.)

Use realistic sample data: user "Arjun Mehta", arjun@nexora.com, role HR,
company "Nexora Technologies".

Make it look like Linear or the Vercel dashboard: restrained, dense, precise.
Avoid anything that looks like a generic AI-generated template — no hero
gradients, no oversized rounded cards, no emoji used as icons.
```

---

# PROMPT 1 — Landing page

```
Build the public landing page for Assistify, route "/".

Deliberately there is NO sign-up button anywhere — accounts are created by HR
and activated by invitation. The only call to action is "Log in".

Sections:
1. Slim top nav: logo left, single "Log in" Button (primary indigo) right.
2. Hero, left-aligned within a max-w-5xl container (not centered):
   - Small pill badge: "AI-powered HR assistant"
   - Headline: "Every HR answer, instantly." (text-5xl font-semibold tracking-tight)
   - Subhead, max-w-xl, text-zinc-600: employees ask questions in plain English
     and get answers from their own company's policies — plus their real leave
     balance, attendance and tickets.
   - Two buttons: "Log in" (primary) and "See how it works" (ghost).
3. A framed product preview panel below the hero: a mock chat exchange —
   employee asks "How many casual leaves do I have left?" and the assistant
   replies "You have 8 casual leaves remaining out of 12 for 2026." plus a
   second exchange citing "Leave Policy 2026 · Section 4.2" as a small
   source chip. Render it as a bordered card, not a screenshot.
4. Three feature cards in a grid:
   - "Grounded in your policies" — answers cite the source document
   - "Knows your data" — real leave balances, attendance and ticket status
   - "Takes action" — applies leave and raises tickets, with your confirmation
   Each: lucide icon in an indigo-50 rounded square, title, one-line description.
5. Minimal footer: wordmark, copyright, three dummy links.

Keep it restrained and typographic. No gradient mesh backgrounds, no floating
3D shapes, no stock imagery. Whitespace does the work.
```

---

# PROMPT 2 — Login page

```
Build the login page, route "/login".

Split layout on desktop, single column under 1024px:
- Left (60%): centered form card, max-w-sm.
  - Small logo + wordmark above the form.
  - "Welcome back" heading, "Sign in to your Assistify account" subtext.
  - Email and Password fields using shadcn Form + react-hook-form + zod.
  - "Forgot password?" link, right-aligned above the password field.
  - Full-width primary "Sign in" Button with a loading spinner state.
  - An Alert (destructive variant) above the form for errors, showing exactly
    "Invalid email or password" — never reveal which field was wrong.
  - Below the card, muted helper text: "Don't have an account? Your HR team
    will send you an invitation."  — there is NO sign-up link.
- Right (40%): a zinc-900 panel with a short pull-quote about reducing HR
  workload and a subtle dot-grid pattern. Hidden below 1024px.

Include a demo-credentials hint card below the form (dashed border, muted):
  arjun@nexora.com / Test@123 — Employee
  hr@nexora.com / Test@123 — HR
```

---

# PROMPT 3 — Activation page

```
Build the account activation page, route "/activate?token=…".

This is where an invited employee sets their password for the first time.
Same centered-card layout as login, max-w-md.

Three states, all of which you should render as separate variants:

1. VALIDATING — skeleton placeholders, "Checking your invitation…"

2. VALID — form:
   - Heading "Set your password", subtext "You've been invited to join
     Nexora Technologies as an Employee."
   - A read-only field showing the invited email (muted, with a lock icon).
   - Password + Confirm password fields.
   - A live password strength meter: four segments that fill and change colour
     as rules are met (8+ chars, uppercase, number, symbol). Show the rules as
     a checklist that ticks green as satisfied.
   - Checkbox: "I have read and accept the Employee Handbook" with the handbook
     text underlined as a link. Required.
   - Full-width primary "Activate account" Button.

3. EXPIRED — centered empty state: amber alert-triangle icon, "This invitation
   has expired", explanation that invitation links are valid for 72 hours, and
   a "Contact your HR team" secondary button.
```

---

# PROMPT 4 — Employee dashboard ⭐

```
Build the employee dashboard, route "/dashboard". This renders inside the app
shell you already built.

Page header: "Good morning, Arjun" with today's date in muted text on the right.

Section 1 — Leave balances, a 3-column grid of cards:
  Casual Leave    8 of 12 remaining
  Sick Leave      5 of 8 remaining
  Earned Leave    14 of 18 remaining
Each card: small uppercase label, a large tabular-nums number (text-3xl
font-semibold) with "of N" in smaller muted text beside it, a thin Progress
bar in indigo, and the used count below. These numbers are the most important
thing on the page — give them room.

Section 2 — a 2-column row:
  Left (2/3): "Recent leave requests" card containing a compact Table with
  columns Type, Dates, Days, Status, Applied. Five rows mixing statuses.
  Status rendered as a Badge: Approved emerald, Pending amber, Rejected rose.
  Card header has a "New request" primary Button on the right.
  Include an empty-state variant (calendar icon, "No leave requests yet").

  Right (1/3): stacked cards —
  - "Upcoming holidays": three entries with date and holiday name
    (Independence Day, Ganesh Chaturthi, Gandhi Jayanti).
  - "Attendance this month": a large percentage (94%) with tabular-nums and a
    muted "22 of 23 days present".

Section 3 — a full-width card promoting the assistant: indigo-50 background,
message-circle icon, "Ask Assistify anything", subtext "Leave policy, holidays,
reimbursements — get answers instantly", and an "Open chat" Button. This is a
placeholder for a feature shipping later.

Use realistic Indian names and dates in 2026. All numbers tabular-nums.
```

---

# PROMPT 5 — Apply leave dialog

```
Build an "Apply for leave" dialog (shadcn Dialog), opened from the employee
dashboard. Width sm:max-w-lg.

Fields, using shadcn Form + react-hook-form + zod:
1. Leave type — Select with Casual Leave (8 available), Sick Leave (5), Earned
   Leave (14). Show the available count as muted text inside each option.
2. Date range — a single Popover containing a range Calendar. The trigger
   Button shows "12 Aug 2026 – 14 Aug 2026" or "Pick dates" when empty.
3. An auto-calculated summary strip below the dates: a bordered zinc-50 row
   showing "3 working days" on the left and "5 remaining after this request"
   on the right, both tabular-nums. If the request exceeds the balance, this
   strip turns rose and reads "Exceeds available balance".
4. Reason — Textarea, 3 rows, placeholder "Briefly describe the reason",
   with a character counter (max 500).

Footer: "Cancel" ghost Button and "Submit request" primary Button. The submit
button is disabled while the balance is exceeded or the form is invalid, and
shows a spinner while submitting.

On success the dialog closes and a sonner toast appears: "Leave request
submitted — HR will review it shortly."
```

---

# PROMPT 6 — HR dashboard

```
Build the HR dashboard, route "/hr", inside the app shell.

Page header: "HR Dashboard", subtext "Nexora Technologies".

Row 1 — four stat cards in a grid:
  Total employees        48    (+3 this month, emerald, small trending-up icon)
  Pending approvals       7    (amber, requires action)
  Open tickets           12    (5 HR · 7 IT, shown as muted sub-text)
  On leave today          4
Each: uppercase label, tabular-nums text-3xl value, a muted sub-line, and a
small lucide icon top-right in a zinc-100 rounded square.

Row 2 — 2-column:
  Left (2/3): "Pending leave approvals" card. Compact table: Employee (Avatar +
  name + department stacked), Type, Dates, Days, and an actions column with
  small "Approve" (emerald outline) and "Reject" (rose ghost) buttons. Four
  rows. Card footer link: "View all 7 requests".

  Right (1/3): "Recent activity" — a vertical timeline of six items, each with
  a small coloured dot, one line of text and a relative timestamp
  ("Priya Sharma activated her account · 2h ago",
   "Leave approved for Rahul Nair · 4h ago",
   "New IT ticket raised · 5h ago").

Row 3 — full-width "Assistant activity" card, a preview of analytics shipping
later: three inline metrics separated by vertical dividers —
  Deflection rate 68%  ·  Conversations this month 214  ·  Tickets created 34
with a muted "Full analytics coming soon" note on the right.
```

---

# PROMPT 7 — Employees list

```
Build the employees list, route "/hr/employees", inside the app shell.

Page header: "Employees" with a primary "Add employee" Button (user-plus icon)
on the right.

Toolbar above the table:
- Search Input with a magnifier icon, w-72, placeholder "Search by name or
  email".
- A Select for Department (All, Engineering, Sales, HR, Finance).
- A Select for Status (All, Active, Invited, Deactivated).
- Right-aligned muted count: "48 employees".

Table columns:
- Employee — Avatar with initials, name (font-medium) and email (muted) stacked
- Employee ID — tabular-nums
- Department
- Designation
- Role — Badge, outline variant
- Status — Badge: Active emerald, Invited amber, Deactivated zinc
- Actions — a MoreHorizontal DropdownMenu with View profile, Resend invitation
  (only for Invited), Deactivate (rose text)

Eight rows of realistic Indian employee data with a mix of statuses — include
at least two Invited and one Deactivated so all three badge styles are visible.

Below the table: pagination showing "Showing 1–8 of 48" with Previous / Next
buttons.

Also render an empty state variant: users icon in a zinc-100 circle,
"No employees found", "Try adjusting your filters", and a ghost "Clear filters"
button.
```

---

# PROMPT 8 — Add employee + invitation link ⭐

```
Build the "Add employee" page, route "/hr/employees/new", inside the app shell.

A back link ("← Employees") above a page header "Add employee", subtext
"They'll receive an invitation link to activate their account."

A single form card, max-w-2xl, with grouped sections separated by a Separator:

Section "Personal details" — 2-column grid:
  Full name (required), Work email (required, with a helper line below reading
  "Must be a @nexora.com address" that shows an amber warning — not an error —
  if a different domain is typed: "This isn't a recognised company domain.
  You can still send the invitation.")

Section "Employment details" — 2-column grid:
  Employee ID (required), Department (Select), Designation,
  Date of joining (Popover + Calendar), Reporting manager (Select of employees)

Section "Access":
  Role — a RadioGroup with a single enabled option "Employee" (selected), and
  a disabled "HR" option with a small muted note "Only an administrator can
  create HR accounts."

Footer: "Cancel" ghost and "Send invitation" primary.

THEN build the success Dialog that appears after submitting — this is the most
important part of the screen:
- Emerald check-circle icon in a circle at the top.
- "Invitation created" heading, subtext "Share this link with Priya Sharma.
  It expires in 72 hours."
- A read-only Input containing a long activation URL, with a "Copy" Button
  attached on the right that switches to a check icon and "Copied" for two
  seconds after being clicked.
- A muted note: "Email delivery is coming soon — for now, send this link
  through your usual channel."
- Footer buttons: "Add another" ghost and "Done" primary.
```

---

# PROMPT 9 — Leave approvals ⭐ (the demo centrepiece)

```
Build the leave approvals page, route "/hr/leave", inside the app shell.
This is the most important screen in the product demo — make it excellent.

Page header: "Leave approvals", subtext "Review and action employee requests".

Tabs (shadcn Tabs): Pending (7) · Approved · Rejected · All — counts shown as
small muted numbers inside the tab labels.

Under the Pending tab, a table with generous rows (56px, not the compact 40px —
these rows carry more information):
- Employee — Avatar, name, department stacked
- Leave type — Badge, outline
- Dates — "12 Aug – 14 Aug 2026" with a muted "3 days" below, tabular-nums
- Balance after — "5 of 12 remaining" in tabular-nums; render in amber if the
  approval would take the employee below 2 days remaining
- Applied — relative time, muted ("2 days ago")
- Actions — "Approve" (emerald, outline) and "Reject" (rose, ghost)

Add an expandable row: clicking a row reveals the employee's reason text in a
zinc-50 inset panel, plus any overlapping requests from the same department
shown as a small amber inline warning ("2 others in Engineering are on leave
these dates").

Build two AlertDialogs:
- Approve: "Approve leave request?" with a summary line (employee, type, dates,
  days) and a note that the balance will be deducted. Confirm button emerald.
- Reject: same summary plus a required Textarea "Reason for rejection" so the
  employee understands. Confirm button rose, disabled until the reason is typed.

After either action, a sonner toast: "Leave approved for Priya Sharma" or
"Request rejected". The row animates out of the pending list.

Include an empty state for when there is nothing pending: emerald check-circle,
"All caught up", "No pending leave requests to review."

Six realistic rows with varied leave types, date ranges and departments.
```

---

# PROMPT 10 — 404

```
Build a 404 page. Centered, minimal: a large tabular-nums "404" in zinc-200,
"Page not found" heading, one muted line of explanation, and a primary
"Back to dashboard" Button. Reuse the wordmark above it. Keep it under
half a screen of content — no illustrations.
```

---

## After v0 — your checklist

- [ ] Strip any `"use client"` directives and Next.js imports v0 slipped in
- [ ] Replace `next/link` with react-router `Link`
- [ ] Move each screen into `web/src/features/<area>/`
- [ ] Replace hardcoded arrays with imports from `lib/mock.ts`
- [ ] Confirm every table has loading (Skeleton), empty and error states
- [ ] Check every screen at 375px, 768px and 1440px
- [ ] Run through with keyboard only — dialogs must trap focus and close on Escape

## Prompts to keep for Phase 4 (do not build now)

Chat interface · Document upload & management · Ticket queues (HR and IT) ·
Analytics dashboard · Notification dropdown · Profile & settings
