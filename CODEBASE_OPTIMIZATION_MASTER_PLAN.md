# Master Codebase Optimization Plan

## Executive Summary
This plan addresses the "optimize everything" request by targeting four key pillars: **Database Performance**, **Frontend Efficiency**, **Code Quality**, and **Security**. 

**Current State:**
- **Strengths:** Advanced memory management (`memoryBudgetManager`), lazy loading with retries, strong Netlify configuration, and comprehensive "fix" migrations.
- **Weaknesses:** Over-aggressive cache clearing (hurts UX/Network), potential missing database indexes on foreign keys, complex/redundant RLS policies, and "Context Hell" in `main.tsx`.

---

## Phase 1: Database & Backend (High Impact)

The Supabase database is the foundation. Optimization here yields the biggest global speedups.

### 1.1 Indexing Strategy (Immediate Action)
PostgreSQL does **not** automatically index Foreign Keys. We found missing indexes that can cause full table scans during joins or RLS checks.

- **Action:** Create a new migration `20251120000000_optimize_indexes.sql` to:
    - Add indexes to `profiles(user_id)` (exists as unique constraint, but explicit index helps joins if not primary).
    - **CRITICAL:** Add index to `air_quality_readings(user_id)` if relying solely on composite indexes that might be ordered incorrectly for specific queries.
    - Add indexes to `notifications(user_id)`, `user_points(user_id)`, and `user_settings(user_id)` if missing.
    - **Cleanup:** Remove redundant indexes (e.g., `idx_air_quality_readings_user_timestamp` defined twice).

### 1.2 RLS Policy Audit
Many "fix" migrations have layered RLS policies. Complex RLS policies run *for every row* returned.
- **Action:** Simplify policies. avoid using `get_user_id()` functions if `auth.uid()` suffices.
- **Action:** Ensure RLS policies use the indexes created in 1.1.

### 1.3 Database Maintenance
- **Action:** Schedule a weekly `VACUUM ANALYZE` (via `pg_cron` if available, or manual SQL script) to update query planner statistics, especially for `air_quality_readings` which likely grows fast.

---

## Phase 2: Frontend Architecture (Speed & UX)

### 2.1 React Query Tuning (Balance Memory vs. Network)
Current config in `src/main.tsx` is too aggressive: `gcTime: 30000` (30s). This forces re-fetching and re-parsing data if a user switches tabs for just 30 seconds, increasing CPU usage and network latency.
- **Action:** Relax `gcTime` to 5 minutes (300,000ms) and `staleTime` to 1 minute (60,000ms).
- **Reasoning:** Air quality doesn't change every 30 seconds. This reduces server load and makes the app feel "instant" on navigation.

### 2.2 Bundle Size & Code Splitting
- **Action:** Verify `vite.config.ts` manual chunks. Ensure `recharts` and `leaflet` are in their own chunks or lazy-loaded if only used on specific pages (like `HistoryView`).
- **Action:** Review `src/pages/Index.tsx`. It manually handles routing/views. Consider moving strictly to `react-router-dom`'s `Outlet` for standard code splitting behavior, or ensure the current manual `lazy()` imports are effective.

### 2.3 Component Rendering
- **Action:** `AirQualityDashboard.tsx` uses `React.memo`. Extend this to `HistoryView` charts. Recharts is heavy; ensure it only re-renders when data actually changes.
- **Action:** Reduce "Context Hell" in `main.tsx`. Combine related providers or use a Composition pattern to reduce the tree depth, which improves React DevTools performance and debugging.

---

## Phase 3: Code Quality & Maintainability

### 3.1 Strict Type Safety
- **Action:** Run `tsc --noEmit` and target any usage of `any`.
- **Action:** Ensure all Supabase database types are generated and used (`Database` interface), rather than manual type definitions that can drift.

### 3.2 Linting & Dead Code
- **Action:** Run `npm run lint:fix`.
- **Action:** Scan for unused exports using `ts-prune` (if installed) or manual review.
- **Action:** Remove `console.log` statements (Vite drops them in prod, but they clutter dev).

---

## Phase 4: Security & Reliability

### 4.1 CSP & Headers
- **Action:** `netlify.toml` is good, but ensure `connect-src` includes all third-party APIs (e.g., OpenAQ, OpenWeather).
- **Action:** Verify `Cross-Origin-Opener-Policy` settings don't break OAuth popups (if used).

### 4.2 Error Handling
- **Action:** Ensure `EnhancedErrorBoundary` wraps all lazy-loaded components (currently implemented in `Index.tsx`).
- **Action:** Add Global Error Reporting (Sentry is installed in package.json, verify it's initialized in `main.tsx`).

---

## Immediate Next Steps (Execution)

1. **Apply Database Optimizations**: Create and apply the index migration.
2. **Tune React Query**: Adjust `main.tsx` config.
3. **Lint & Cleanup**: Run the linter.

