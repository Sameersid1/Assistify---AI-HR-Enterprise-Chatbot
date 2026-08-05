# Assistify Frontend — AI HR & Ops Portal

Assistify is a modern, high-density HR & IT Service Management Web Application built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS** following the **Linear/Vercel design language** (zinc palette, indigo-600 primary, clean borders, crisp typography, and dark mode support).

---

## 🌟 What's Included & Recent Improvements

### 1. Role-Based Dashboards (1-Screen Zero-Scroll)
- **Employee Dashboard (`/app`)**:
  - **3 Balance Cards**: SVG circular progress rings (Casual 8/12, Sick 5/8, Earned 14/18) with bold numbers.
  - **Recent Requests Table**: High-density interactive table with status badges (Approved, Pending, Rejected) and a "+ New request" submission modal.
  - **Upcoming Holidays & Attendance Widget**: 94% attendance indicator with quarterly holiday schedule.
  - **AI Assistant Quick Launch Banner**: Direct link to the conversational AI bot.

- **HR Manager Dashboard (`/app`)**:
  - **Thin Metric Strip**: 4-segment overview (Pending approvals 7, Open tickets 12, On leave 4, New joiners 3).
  - **Priority Queue Approvals Table**: One-click Approve/Reject action buttons, employee avatars, leave types, and balance impact.
  - **Live Activity Feed & AI Deflection Metrics**: 68% deflection rate, 214 queries handled.

- **Admin Dashboard (`/app`)**:
  - **System Health Strip**: Real-time status indicators (API healthy, DB connected, 48 users, Backup status).
  - **Role Distribution Bar**: Visual proportion bar (Employee 87%, HR 6%, IT 4%, Admin 2%).
  - **Pending Invitations**: Fast resend actions and "+ Invite staff" modal.
  - **Terminal-Style Audit Log**: Monospaced SOC-2 synced activity log.
  - **Org Policy Card**: Configured leave quotas and regional timezone settings.

### 2. Layout & Global Navigation
- **Dynamic Sidebar**:
  - Role-filtered navigation categories (General, Operations, Governance).
  - Dedicated role widgets (Leave balance quota for Employee, Queue counter for HR, Health status for Admin).
  - Clean `w-64` layout with collapse/expand toggle and user profile pill with one-click logout.
- **TopBar**:
  - **Dark / Light mode toggle** placed conveniently on the top-left next to the page title.
  - Global `⌘K` search input.
  - Notification dropdown and role status pill.
- **Outer Margins & Border Framing**:
  - Generous padding (`px-6 py-5 md:px-8 md:py-6 lg:px-10`) so no cards, buttons, or numbers are cut off on any screen.
  - Crisp, defined borders (`border border-zinc-200/90 dark:border-zinc-800/90 rounded-xl`) across all elements.

---

## 🚀 Quickstart

### Prerequisites
- Node.js 18+ or 20+
- npm / yarn / pnpm

### Installation & Run
```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Build for production
npm run build
```

---

## 🔑 Demo Role Switching

You can switch between roles directly on the Login page or by testing credentials:
- **Employee**: `arjun@nexora.com`
- **HR Manager**: `priya@nexora.com`
- **Administrator**: `superadmin@nexora.com`

---

## 📁 Project Structure

```
assistify/
├── public/                 # Static assets
├── src/
│   ├── components/
│   │   ├── layout/         # AppLayout, Sidebar, TopBar
│   │   └── ui/             # shadcn/ui primitives (button, badge, input, card, dialog, etc.)
│   ├── config/             # navigation.ts (role-based nav groups)
│   ├── context/            # AuthContext.tsx, ThemeContext.tsx
│   ├── lib/                # utils.ts (cn helper)
│   ├── pages/              # DashboardPage.tsx, LoginPage.tsx, ChatPage.tsx, DirectoryPage.tsx, etc.
│   ├── App.tsx             # Route configuration
│   ├── main.tsx            # Application entrypoint
│   └── index.css           # Design tokens, Tailwind base, and dark mode palette
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```
