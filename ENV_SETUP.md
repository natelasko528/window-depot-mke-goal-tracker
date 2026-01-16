# Environment Variables Setup

## Local Development

Create a `.env.local` file in the root directory with the following content:

```
REACT_APP_SUPABASE_URL=https://jzxmmtaloiglvclrmfjb.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6eG1tdGFsb2lnbHZjbHJtZmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODA5NjgsImV4cCI6MjA4NDE1Njk2OH0.fOTkZJsVODkyw5rNyA-bc61TlcWjwvfx7zQM-eOg-zg
```

**Note:** The `.env.local` file is already in `.gitignore` and will not be committed to the repository.

## Vercel Production

Add these environment variables in the Vercel dashboard:

1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add the following:
   - `REACT_APP_SUPABASE_URL` = `https://jzxmmtaloiglvclrmfjb.supabase.co`
   - `REACT_APP_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6eG1tdGFsb2lnbHZjbHJtZmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODA5NjgsImV4cCI6MjA4NDE1Njk2OH0.fOTkZJsVODkyw5rNyA-bc61TlcWjwvfx7zQM-eOg-zg`

After adding the variables, trigger a new deployment for the changes to take effect.
