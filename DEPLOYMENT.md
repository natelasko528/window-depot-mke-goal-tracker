# Deployment Instructions

## GitHub Repository Setup

Since GitHub CLI is not available, please create the repository manually:

1. Go to https://github.com/new
2. Repository name: `window-depot-goal-tracker`
3. Choose Public or Private
4. **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

Then run these commands in the project directory:

```bash
git remote add origin https://github.com/YOUR_USERNAME/window-depot-goal-tracker.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

## Vercel Deployment

After pushing to GitHub:

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Vercel will auto-detect Create React App settings
4. Click "Deploy"

The app will be automatically deployed and you'll get a URL.

Alternatively, you can use the Vercel CLI:
```bash
npm i -g vercel
vercel
```

## Local Testing

The app is already running locally at http://localhost:3000

## Build Verification

To test the production build locally:
```bash
npm run build
npx serve -s build
```
