# Rollback: Country Selector Dropdown Removal

**Date:** 2025-09-22

## Summary
- Fully rolled back all changes related to the country selector dropdown and Combobox autocomplete in the Air Quality Dashboard.
- Removed all UI, state, and logic for country selection from `AirQualityDashboard.tsx`.
- Deleted `src/components/ui/Combobox.tsx` and `src/data/countries.json` as they are no longer used.
- Fixed all related type and runtime errors, restoring the dashboard to its original, pre-dropdown state.

## Motivation
- The dropdown feature was experimental and is no longer required.
- Ensured the app is stable and AQI data collection logic is not affected by UI experiments.

## Files Affected
- `src/components/AirQualityDashboard.tsx`: Removed all country selector and Combobox logic.
- `src/components/ui/Combobox.tsx`: Deleted.
- `src/data/countries.json`: Deleted.

## Validation
- All compile and runtime errors resolved.
- Dashboard UI and AQI logic function as before the dropdown changes.

---

For future reference, the dropdown feature can be restored if needed by re-adding the above files and logic.
