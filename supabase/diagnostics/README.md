# Supabase Assistant Diagnostic Tools

This directory contains tools and documentation to restore assistant diagnostic access and diagnose schema permission issues.

## Quick Start

### If Assistant Tools Are Blocked

1. **First, try enabling organization settings** (recommended):
   - Follow: [SCHEMA_RESTORATION_GUIDE.md](./SCHEMA_RESTORATION_GUIDE.md#step-1-enable-organization-data-sharing-settings)
   - This is the fastest way to restore assistant access

2. **If org settings cannot be changed, use manual diagnostics**:
   - Run: `diagnostic_schema_access.sql` in Supabase SQL Editor
   - Collect output and provide to assistant
   - See: [SCHEMA_RESTORATION_GUIDE.md](./SCHEMA_RESTORATION_GUIDE.md#step-3-manual-diagnostic-collection-alternative)

3. **Reference schema information**:
   - See: [SCHEMA_SUMMARY.md](./SCHEMA_SUMMARY.md) for complete schema overview

## Files

### `diagnostic_schema_access.sql`
Comprehensive SQL diagnostic script that collects:
- All tables in public schema
- Installed extensions
- Custom types
- Functions and procedures
- RLS policies
- Grants and permissions
- Triggers and indexes
- Foreign key constraints
- Missing DELETE policies

**Usage**: Execute in Supabase SQL Editor or via CLI:
```bash
supabase db execute --file supabase/diagnostics/diagnostic_schema_access.sql
```

### `SCHEMA_RESTORATION_GUIDE.md`
Step-by-step guide to:
- Enable organization-level data-sharing settings
- Verify assistant access
- Collect manual diagnostics if needed
- Post-diagnostics remediation steps

### `SCHEMA_SUMMARY.md`
Complete schema reference including:
- All tables with descriptions
- Custom types
- Key functions
- Edge Functions list
- Expected extensions
- RLS policies summary
- Known issues and fixes

## Current Issue

**Problem**: Assistant diagnostic tools (`list_tables`, `list_extensions`, `list_edge_functions`) are blocked by organization-level data-sharing settings.

**Error Message**: 
> "You don't have permission to use this tool. This is an organization-wide setting requiring you to opt-in."

**Solution**: Enable minimal Bedrock opt-in in organization settings (see guide above).

## Project Information

- **Project ID**: `bmqdbetupttlthpadseq`
- **Database**: Supabase PostgreSQL
- **Schema**: `public`
- **RLS**: Enabled on all user tables

## Next Steps

1. ✅ Review diagnostic files
2. ⏳ Enable organization settings OR collect manual diagnostics
3. ⏳ Run diagnostics and analyze results
4. ⏳ Apply permission fixes if needed
5. ⏳ Verify schema access restored

## Support

- Supabase Docs: https://supabase.com/docs
- Organization Settings: https://supabase.com/dashboard/org/[org-id]/settings
- Project Dashboard: https://supabase.com/dashboard/project/bmqdbetupttlthpadseq

