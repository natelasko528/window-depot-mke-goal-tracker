# Supabase Migration Instructions

## Overview

This document provides step-by-step instructions for applying database migrations to your Supabase project. The migrations create missing tables for gamification, audit logging, and daily snapshots features.

## Prerequisites

- Access to your Supabase project dashboard
- Admin or owner permissions on the Supabase project
- Project ID: `jzxmmtaloiglvclrmfjb`

## Migration Status

✅ **Migration Applied**: The consolidated migration `apply_all_missing_tables` has been successfully applied via Supabase MCP.

## Tables Created

This migration creates the following tables:

### Daily Snapshots
- `daily_snapshots` - Historical goal tracking data

### Gamification Tables
- `achievements` - Achievement definitions (23 pre-populated achievements)
- `challenges` - Challenge definitions
- `user_challenges` - User progress on challenges
- `rewards` - Reward definitions (virtual and real)
- `user_rewards` - User-earned rewards

### Audit & System Tables
- `audit_log` - Admin action logging
- `system_settings` - System-wide configuration
- `data_backups` - Backup metadata
- `error_log` - Application error tracking

## Verification Steps

### 1. Check Tables Exist

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/jzxmmtaloiglvclrmfjb
2. Navigate to **Table Editor** in the left sidebar
3. Verify the following tables are present:
   - `daily_snapshots`
   - `achievements`
   - `challenges`
   - `user_challenges`
   - `rewards`
   - `user_rewards`
   - `audit_log`
   - `system_settings`
   - `data_backups`
   - `error_log`

### 2. Verify Row Level Security (RLS)

1. In the **Table Editor**, click on any of the new tables
2. Check the **Policies** tab
3. Verify that RLS is enabled and policies exist:
   - All tables should have `allow_all_*` policies for all operations

### 3. Verify Realtime Subscriptions

1. Navigate to **Database** → **Replication** in the Supabase dashboard
2. Verify that all new tables are listed in the replication settings
3. All tables should be enabled for realtime updates

### 4. Check Achievements Data

1. In **Table Editor**, open the `achievements` table
2. Verify that 23 achievements are present (pre-populated)
3. Check that achievements span all tiers: bronze, silver, gold, diamond, platinum, legendary

### 5. Check System Settings

1. In **Table Editor**, open the `system_settings` table
2. Verify that default settings are present:
   - `app_version`
   - `maintenance_mode`
   - `max_users`

## Manual Application (If Needed)

If you need to apply the migration manually via the Supabase SQL Editor:

1. Go to **SQL Editor** in the Supabase dashboard
2. Click **New Query**
3. Copy the contents of `supabase/migrations/000_apply_all_missing_tables.sql` (if created)
4. Paste into the SQL editor
5. Click **Run** to execute
6. Verify no errors appear in the results

## Troubleshooting

### Error: "relation already exists"

If you see errors about tables already existing, this is normal. The migration uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, so it's safe to re-run.

### Error: "publication does not exist"

If you see errors about `supabase_realtime` publication, ensure that:
1. Realtime is enabled in your Supabase project
2. The publication exists (it should be created automatically)

### Missing Tables After Migration

If tables are missing after running the migration:

1. Check the SQL Editor for any error messages
2. Verify you have the correct permissions (admin/owner)
3. Try running the migration again (it's idempotent)

### RLS Policy Errors

If you see RLS policy errors:

1. Check that RLS is enabled on the table
2. Verify the policy name matches exactly (case-sensitive)
3. Ensure the policy allows the operations you need

## Post-Migration Checklist

After applying the migration, verify:

- [ ] All 10 tables exist in the database
- [ ] RLS is enabled on all new tables
- [ ] Realtime subscriptions are enabled
- [ ] 23 achievements are pre-populated
- [ ] System settings are initialized
- [ ] No errors in the application console
- [ ] Sync operations work without PGRST205 errors

## Next Steps

After successful migration:

1. **Update Application Code**: Ensure your application code references the new tables correctly
2. **Test Features**: Test gamification features, audit logging, and daily snapshots
3. **Monitor Errors**: Check the `error_log` table for any application errors
4. **Review Audit Log**: Check the `audit_log` table to verify logging is working

## Support

If you encounter issues:

1. Check the Supabase dashboard logs
2. Review the `error_log` table for application errors
3. Verify all environment variables are set correctly
4. Check the application console for PGRST205 errors (table not found)

## Migration Files

The migration combines three separate migration files:
- `004_add_daily_snapshots.sql`
- `006_gamification.sql`
- `007_audit_log.sql`

All have been consolidated and applied as a single migration: `apply_all_missing_tables`.

---

**Last Updated**: 2025-01-16  
**Migration Status**: ✅ Applied Successfully
