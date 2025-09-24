# Error Boundary Validation Guide

Use this checklist to confirm the updated dashboard error boundaries behave as expected.

## Prerequisites

- Run the app locally: `npm run dev`
- Ensure developer tools console is visible
- Open the dashboard route at `http://localhost:5173/dashboard`

## Test Scenarios

1. **Dashboard module crash**
   - Temporarily throw an error in `AirQualityDashboard` render path (e.g., `throw new Error('test dashboard error')`).
   - Reload the dashboard view.
   - Verify that only the dashboard area shows the fallback with "Dashboard Error" messaging while the rest of the shell remains interactive.

2. **Profile view crash**
   - Introduce a `throw new Error('profile fail')` inside `ProfileView`.
   - Navigate to the **Profile** tab from the sidebar or mobile nav.
   - Confirm the localized fallback appears with the refresh guidance, and navigation to other tabs still works.

3. **History view crash**
   - Add `throw new Error('history error')` inside `HistoryView`.
   - Switch to the **History** tab.
   - Ensure only the history content shows the error fallback.

4. **Rewards view crash**
   - Inject a deliberate error in `Rewards` (e.g., `useEffect(() => { throw new Error('rewards'); }, [])`).
   - Navigate to **Rewards**.
   - Confirm the rewards-specific fallback renders.

5. **Network recovery after fallback**
   - After each injected error, remove the thrown error code.
   - Use the fallback "Refresh Page" button or browser refresh.
   - Verify the view re-renders normally.

## Cleanup

- Remove any temporary error injections.
- Run `npm run lint` and `npm run build` to ensure no regressions.
