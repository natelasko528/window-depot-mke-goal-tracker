# Vercel Environment Variables Setup

## IMPORTANT: Required for Supabase Integration

The Supabase backend integration is complete, but **environment variables must be added to Vercel** for it to work in production.

## Steps to Add Environment Variables

1. Go to: https://vercel.com/natelasko528s-projects/window-depot-mke-goal-tracker/settings/environment-variables

2. Click "Add New" or the "+" button

3. Add the following two environment variables:

   **Variable 1:**
   - Key: `REACT_APP_SUPABASE_URL`
   - Value: `https://jzxmmtaloiglvclrmfjb.supabase.co`
   - Environment: Select "Production", "Preview", and "Development" (or just "Production" if you prefer)

   **Variable 2:**
   - Key: `REACT_APP_SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6eG1tdGFsb2lnbHZjbHJtZmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODA5NjgsImV4cCI6MjA4NDE1Njk2OH0.fOTkZJsVODkyw5rNyA-bc61TlcWjwvfx7zQM-eOg-zg`
   - Environment: Select "Production", "Preview", and "Development" (or just "Production" if you prefer)

4. Click "Save" for each variable

5. **Trigger a new deployment** by:
   - Going to the Deployments tab
   - Clicking "Redeploy" on the latest deployment, OR
   - Making a small commit and pushing to trigger auto-deployment

## Verification

After adding the environment variables and redeploying:

1. Visit: https://window-depot-mke-goal-tracker.vercel.app
2. Open browser console (F12)
3. You should NOT see the "Supabase credentials not configured" warning
4. Create a user and verify it appears in Supabase dashboard
5. Test multi-device sync by opening the app in another browser/device

## Supabase Dashboard

View your database at: https://supabase.com/dashboard/project/jzxmmtaloiglvclrmfjb

## Current Status

- ✅ Supabase project created
- ✅ Database schema created (all tables with RLS)
- ✅ Code integrated and deployed
- ⏳ **Environment variables need to be added to Vercel** (this step)

Once environment variables are added, the app will have full multi-device synchronization!
