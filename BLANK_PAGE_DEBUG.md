# Blank Page Debugging Guide

## Current Status

✅ **Build Status:** Compiled successfully (255.93 kB gzipped)
✅ **Vercel Deployment:** Live at preview URL
❌ **Issue:** Page appears blank when loaded

## Most Likely Causes

### 1. JavaScript Console Errors (Most Common)
The React app may be throwing runtime errors that prevent rendering.

**How to Check:**
1. Open the preview URL in browser
2. Open Developer Tools (F12 or Right-click → Inspect)
3. Go to **Console** tab
4. Look for red error messages

**Common Errors to Look For:**
- `Cannot read property of undefined`
- `X is not defined`
- Module import errors
- IndexedDB/localStorage errors

### 2. Authentication Redirect Loop
The preview deployment requires Vercel authentication which might interfere.

**How to Fix:**
- Wait for PR merge to master for production deployment (no auth required)
- Or use Vercel CLI: `vercel curl <preview-url>`

### 3. ESLint Rule Disabling Side Effects
We disabled ESLint rules which may have hidden real errors.

**How to Check:**
```bash
# Check for actual syntax errors
npm run build 2>&1 | grep -i "error"
```

## Debugging Steps

### Step 1: Check Browser Console
```
1. Open: https://window-depot-mke-goal-tracker-git-c93a74-natelasko528s-projects.vercel.app/
2. Press F12 (Developer Tools)
3. Click Console tab
4. Refresh page (Ctrl+R or Cmd+R)
5. Copy any error messages
```

### Step 2: Check Network Tab
```
1. In Developer Tools, click Network tab
2. Refresh page
3. Look for failed requests (red status codes)
4. Check if main JavaScript bundle loads:
   - Look for: main.[hash].js
   - Status should be: 200 OK
   - Size should be: ~256 KB
```

### Step 3: Check Application Tab
```
1. In Developer Tools, click Application tab
2. Check IndexedDB → WindowDepotTracker
3. Check if database exists and has data
4. Try clearing: Storage → Clear site data
5. Refresh and see if it loads
```

### Step 4: Test Local Build
```bash
# Serve the local build to test
cd build
python3 -m http.server 8080

# Open in browser: http://localhost:8080
# This tests the exact same build Vercel is serving
```

## Quick Fixes to Try

### Fix 1: Clear Browser Cache
```
1. Press Ctrl+Shift+Delete (or Cmd+Shift+Delete)
2. Select "Cached images and files"
3. Click "Clear data"
4. Reload page
```

### Fix 2: Hard Refresh
```
- Windows/Linux: Ctrl + Shift + R
- Mac: Cmd + Shift + R
```

### Fix 3: Incognito/Private Mode
```
Open preview URL in incognito window to rule out cache/cookie issues
```

## If Still Blank After All Steps

### Check for Runtime Errors in Code

**File:** `src/App.jsx`

**Lines to Check:**
- Line 610-630: useEffect initialization
- Line 700-720: Keyboard event handlers
- Line 8186: SettingsPage component

**Common Issues:**
```javascript
// Check if these cause errors:
- getToday() function calls
- localStorage access
- IndexedDB operations
- theme.js imports
```

### Verify Build Output

```bash
# Check build directory structure
ls -la build/
ls -la build/static/js/

# Verify main JS file exists and has content
ls -lh build/static/js/main.*.js
```

### Test Without Service Worker

Add to `build/index.html` before closing `</body>`:
```html
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
      for(let registration of registrations) {
        registration.unregister();
      }
    });
  }
</script>
```

## Expected Behavior (When Working)

1. **Initial Load:**
   - Shows "Window Depot Goal Tracker" title
   - Displays user selection screen OR dashboard (if user exists)

2. **First Time:**
   - "Create User" button visible
   - Form to enter name and select role

3. **Returning User:**
   - Dashboard with "Today's Progress"
   - Navigation bar at bottom
   - Theme applied (light/dark/system)

## Report Issue

If none of these steps work, please provide:
1. Screenshot of blank page
2. Browser console errors (copy full error text)
3. Network tab showing failed requests
4. Browser and version (Chrome 120, Safari 17, etc.)

---

**Next Step:** Merge PR to master to deploy to production URL
**Production URL:** https://window-depot-mke-goal-tracker.vercel.app (currently has old code)
**PR URL:** https://github.com/natelasko528/window-depot-mke-goal-tracker/compare/master...claude/release-v2-complete-2NdKw
