# Fix dashboard crash and protected server function 401s

## What's happening

The red "Something went wrong — Cannot read properties of undefined (reading 'sourced')" screen is the root error boundary catching a render crash in `Dashboard.tsx`. The deeper cause is showing up in runtime errors as `Error: [object Response]` thrown from `getDashboardData` — the server function is returning `401 Unauthorized`, so `data` ends up undefined and the dashboard tries to read `data.peCoverage.sourced` anyway.

### Root cause of the 401

`requireSupabaseAuth` (in `src/integrations/supabase/auth-middleware.ts`) requires every protected server function call to include an `Authorization: Bearer <supabase access_token>` header. But nothing in the app currently attaches that header to `createServerFn` requests:

- `src/router.tsx` does not configure a request hook.
- `src/start.ts` only adds an error-handling middleware.
- `useServerFn(getDashboardData)` is called as `fn()` with no headers.

Result: every protected server function (`getDashboardData`, `listCandidates`, `getCandidate`, `createCandidate`, `updateCandidate`, `deleteCandidate`, `importCandidates`, `importPeFirms`) 401s for any signed-in user. Dashboard, Candidates list, Candidate detail, Add candidate, and CSV import are all broken end-to-end — the dashboard just happens to be the most visible.

### Secondary cause of the visible crash

In `Dashboard.tsx` the `StatCardsRow` block renders:

```tsx
role === "recruiter" && data ? (
  <>{data.peCoverage.sourced} ... </>
) : ...
```

If `data` exists but `peCoverage` is somehow missing (or any future partial response), this still throws. We should be defensive here too so a server fn failure surfaces a friendly empty state rather than the global error boundary.

## Plan

### 1. Attach the Supabase access token to all server function calls

Add a small client-side request interceptor that, before any `createServerFn` HTTP call, reads the current Supabase session and adds `Authorization: Bearer <access_token>`.

The cleanest place to do this in TanStack Start is via `setHeaders` in a `clientMiddleware` registered in `src/start.ts`:

```text
src/start.ts
  - import { createMiddleware } from "@tanstack/react-start"
  - add an authMiddleware (type: 'function').client(...) that:
      * calls supabase.auth.getSession()
      * if a session exists, calls setHeaders({ Authorization: `Bearer ${access_token}` })
      * then calls next()
  - register it on createStart via requestMiddleware (server side stays as-is) and a new clientMiddleware list
```

If TanStack Start's middleware API in this version doesn't expose a global client middleware list, fall back to wrapping `useServerFn` in a small helper (e.g. `useAuthedServerFn`) that injects the header per call, and replace the existing `useServerFn(...)` usages.

After this change, all `requireSupabaseAuth`-protected calls succeed for signed-in users with a valid session.

### 2. Make the Dashboard defensive

Update `src/components/dashboard/Dashboard.tsx` so that:

- `StatCardsRow` uses optional chaining and a fallback: `data?.peCoverage?.sourced ?? 0`, `data?.peCoverage?.total ?? TOTAL_PE_UNIVERSE`.
- If `data` is undefined and not loading, render a small "Couldn't load coverage" empty state inside the PE coverage card instead of throwing.
- Same pattern for `funnel`, `geography`, `irFunctions` (already mostly using `?? []` — verify and tighten).

Also add an `errorComponent` to `src/routes/_authenticated/dashboard.tsx` so a future server failure renders inline (with a Retry button that calls `router.invalidate()` + `reset()`) rather than blowing up to the root boundary.

### 3. Verify

- Sign in as a recruiter, load `/dashboard` — no error overlay, real numbers render.
- Network tab: `/_serverFn/...getDashboardData` returns `200`, request includes `Authorization: Bearer ...`.
- Load `/candidates` — list loads (was also 401 before).
- Open `/candidates/$id`, edit a stage — succeeds, activity log entry appears.
- `/import` → upload a small CSV → import succeeds.

## Out of scope

- No schema changes, no UI redesign, no new features. Pure bugfix.
