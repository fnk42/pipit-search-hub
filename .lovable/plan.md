# Transformari IR Search — Phase 1 Plan

Build the foundation: auth, schema, app shell, and dashboard home. Candidate table, PE firm universe, client view detail, weekly report, and CSV import are deferred to later phases.

## 1. Backend (Lovable Cloud)

**Enable Lovable Cloud** for auth + Postgres.

### Auth
- Email magic-link sign-in.
- Whitelist enforced **at sign-in** via an edge function hook (`before-user-created` / custom sign-in server route): allow `*@goldenpipitrecruiting.com` and exact match `sean@transformari.com`. All others get a clean "Access denied" page; no magic link is sent.
- Role assignment on first sign-in: domain `@goldenpipitrecruiting.com` → `recruiter`; `sean@transformari.com` → `client`.

### Schema
- `app_role` enum: `recruiter`, `client`.
- `user_roles (id, user_id → auth.users, role app_role, unique(user_id, role))` with `has_role()` SECURITY DEFINER function (per Lovable user-roles pattern; never store roles on profiles).
- `profiles (id → auth.users, email, full_name, created_at)` auto-created via trigger on `auth.users` insert.
- `location_bucket` enum: Florida, Texas, Tri-State, Other US, International.
- `pipeline_stage` enum: Sourced, Contacted, Engaged, Screening, Client Interview, Offer, Placed, Declined, Passed.
- `ir_function` enum: Capital Raising, LP Relations, Reporting & Analytics, Marketing & Comms, Strategy.
- `pe_status` enum: Target, Contacted, Sourced From, Declined, Not Relevant.
- `pe_tier` enum: Tier 1, Tier 2, Tier 3.
- `candidates` — all fields per spec; `ir_functions` as `ir_function[]`; `notes` text (markdown); `client_visible` boolean default false.
- `pe_firms` — per spec.
- `activity_log (id, user_id, action, entity_type, entity_id, payload jsonb, created_at)`. Trigger on `candidates` writes a row only when `pipeline_stage` changes.

### RLS
- `candidates`, `pe_firms`, `activity_log`, `profiles`, `user_roles`: enable RLS.
- Recruiters: full SELECT/INSERT/UPDATE/DELETE on candidates, pe_firms, activity_log via `has_role(auth.uid(), 'recruiter')`.
- Clients: SELECT on `candidates` filtered to `client_visible = true`. No access to pe_firms or activity_log. (Dashboard counts for client also reflect only visible candidates.)
- `user_roles`: users read their own; only recruiters insert.

### Seed data
- 10 candidates spread across all 9 pipeline stages and 5 location buckets, with realistic names and current_firms drawn from Carlyle, KKR, Vista Equity, Apollo, Blackstone, TPG, Bain Capital, Warburg Pincus, Silver Lake, Advent.
- 15 PE firms with real-world AUM and HQ city/state, mixed tiers and statuses.
- A constant `TOTAL_PE_UNIVERSE = 91` used by the coverage card.

## 2. Frontend

### Design tokens (`src/styles.css`)
- Convert palette to oklch: navy `#0F1C2E` → `--primary`; gold `#F5A623` → `--accent`; off-white `--background`; pure white `--card`; muted slate borders.
- Inter via Google Fonts in `__root.tsx` head; set as default sans.
- No `.dark` overrides used; light only.
- Shadow tokens: `--shadow-soft`, `--shadow-card` (subtle, layered).
- Gold pill, gold left-border active indicator, navy hero card all use semantic tokens.

### Routes (TanStack Start, file-based)
- `src/routes/login.tsx` — email input, magic-link request, "Access denied" state.
- `src/routes/auth/callback.tsx` — handles magic-link return, role lookup, redirect to `/`.
- `src/routes/_authenticated.tsx` — `beforeLoad` gate on Supabase session; renders shell.
- `src/routes/_authenticated/index.tsx` — Dashboard home.
- Stubs (empty "Coming soon" pages so sidebar links work): `candidates.tsx`, `pe-firms.tsx`, `weekly-report.tsx`, `activity-log.tsx`, `settings.tsx`.

### App shell (`src/components/shell/`)
- `TopBar` — wordmark left, centered engagement title, avatar + role pill right.
- `AppSidebar` — shadcn `Sidebar` with `collapsible="icon"`. Items filtered by role (recruiter sees 6, client sees 3). Active item: navy bg + 3px gold left border.
- `Footer` — single muted line.
- `SidebarTrigger` in top bar so mobile toggle is always reachable.

### Dashboard blocks (`src/components/dashboard/`)
- `EngagementSummary` — navy hero card, white text, 3 columns. Search initiated = MIN(candidates.created_at). Days active = today − that date. Candidates in pipeline = count excluding Placed/Declined/Passed.
- `PipelineFunnel` — horizontal funnel from Sourced → Placed using seeded counts; loading skeleton; empty state copy as specified.
- `StatCardsRow` — three shadcn `Card`s: geography bar chart (recharts via shadcn `chart`), IR function donut, "X / 91 firms" with gold progress bar.
- `RecentActivity` — last 10 activity_log rows joined to profiles for user name; empty state copy as specified.

### Data fetching
- Server functions in `src/lib/dashboard.functions.ts` protected by `requireSupabaseAuth`, returning role-aware aggregates (client view filters by `client_visible`).
- React Query in components via `useServerFn`.

## 3. Acceptance verification
- Recruiter email → full sidebar + dashboard with seeded numbers.
- Client email → 3-item sidebar + dashboard reflecting client-visible subset.
- Other email → Access denied at `/login`.
- 375px viewport: vertical stack, sidebar collapses to off-canvas, top bar wraps cleanly.
- Only navy / gold / white / muted slate appear in components.

## Out of scope (later phases)
Candidate detail/table CRUD, PE firm management, weekly report generation, CSV import, settings UI, profile editing.
