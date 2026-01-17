# Multi-User, Multi-Device Sync Testing Strategy

## Overview
This document outlines comprehensive testing strategies for verifying multi-user data synchronization across multiple devices using Supabase real-time subscriptions and offline sync.

---

## Testing Methods

### Method 1: Multiple Browser Tabs/Windows (Same Device)
**Easiest and fastest way to simulate multiple users**

**Setup:**
1. Open the Vercel deployment URL in multiple browser tabs/windows
2. Use different users in each tab (e.g., "Nate" in tab 1, "Alice" in tab 2, "Bob" in tab 3)
3. Perform actions in one tab and verify they appear in others

**Test Scenarios:**
- ✅ **User Creation**: Create a new user in Tab 1 → Verify it appears in Tabs 2 & 3
- ✅ **Goal Updates**: Update goals in Tab 1 → Verify changes appear in Tabs 2 & 3
- ✅ **Daily Logs**: Increment reviews/demos in Tab 1 → Verify counts update in Tabs 2 & 3
- ✅ **Appointments**: Add appointment in Tab 1 → Verify it appears in Tabs 2 & 3
- ✅ **Feed Posts**: Post in Tab 1 → Verify post appears in Tabs 2 & 3
- ✅ **Likes/Comments**: Like/comment in Tab 1 → Verify updates in Tabs 2 & 3
- ✅ **Leaderboard**: Update scores in Tab 1 → Verify leaderboard updates in Tabs 2 & 3

**Expected Behavior:**
- Changes should appear within **2-5 seconds** via real-time subscriptions
- All tabs should show consistent data after sync completes

---

### Method 2: Different Browsers (Same Device)
**Tests cross-browser compatibility and IndexedDB isolation**

**Setup:**
1. Open Chrome with one user (e.g., "Nate")
2. Open Firefox/Edge with another user (e.g., "Alice")
3. Perform actions and verify sync

**Test Scenarios:**
- ✅ Same as Method 1, but across different browsers
- ✅ Verify IndexedDB data is isolated per browser
- ✅ Verify each browser has its own offline sync queue

**Expected Behavior:**
- Both browsers sync to same Supabase database
- IndexedDB data is separate per browser
- Real-time updates work across browsers

---

### Method 3: Incognito/Private Windows
**Tests session isolation and sync**

**Setup:**
1. Open normal Chrome window with "Nate"
2. Open incognito Chrome window with "Alice"
3. Verify both sync independently

**Test Scenarios:**
- ✅ Same as Method 1, but with incognito windows
- ✅ Verify IndexedDB works in incognito mode
- ✅ Verify sync queue persists during session

**Expected Behavior:**
- Incognito windows sync normally during session
- IndexedDB is isolated per window
- Data syncs to same Supabase database

---

### Method 4: Different Devices (Real Multi-Device)
**Most realistic testing scenario**

**Setup:**
1. Open app on **Desktop** (Chrome/Firefox)
2. Open app on **Mobile** (Chrome/Safari on phone)
3. Open app on **Tablet** (if available)
4. Use different users on each device

**Test Scenarios:**
- ✅ Create user on Desktop → Verify on Mobile/Tablet
- ✅ Add appointment on Mobile → Verify on Desktop/Tablet
- ✅ Update goals on Desktop → Verify on Mobile/Tablet
- ✅ Post in feed on Mobile → Verify on Desktop/Tablet
- ✅ Go offline on one device, make changes → Verify syncs when back online

**Expected Behavior:**
- Changes sync across all devices within 2-5 seconds
- Offline changes queue and sync when online
- All devices show consistent data

---

### Method 5: Network Simulation
**Tests offline sync queue and conflict resolution**

**Setup:**
1. Open two browser tabs with different users
2. Use browser DevTools to simulate offline mode
3. Make changes while offline
4. Go back online and verify sync

**Steps:**
1. Open Chrome DevTools → Network tab
2. Select "Offline" checkbox
3. In Tab 1 (offline), add appointment, update goals, post in feed
4. In Tab 2 (online), make different changes
5. Go back online in Tab 1
6. Verify sync queue processes and conflicts resolve

**Test Scenarios:**
- ✅ **Offline Queue**: Make changes offline → Verify they're queued
- ✅ **Sync on Reconnect**: Go online → Verify queued changes sync
- ✅ **Conflict Resolution**: Same data modified offline on two devices → Verify last write wins or proper resolution
- ✅ **Sync Interval**: Verify 5-second sync interval processes queue

**Expected Behavior:**
- Offline changes stored in IndexedDB sync queue
- Changes sync automatically when online
- Sync queue processes every 5 seconds
- Failed operations retry up to 3 times

---

## Detailed Test Cases

### Test Case 1: Real-Time User Sync
**Steps:**
1. Open Tab 1 → Select "Nate" user
2. Open Tab 2 → Select "Alice" user
3. In Tab 1 → Settings → Add new user "Bob"
4. **Verify**: Bob appears in Tab 2 within 5 seconds
5. In Tab 2 → Delete user "Bob"
6. **Verify**: Bob disappears from Tab 1 within 5 seconds

**Expected**: Real-time subscription updates user list across tabs

---

### Test Case 2: Daily Logs Multi-User Sync
**Steps:**
1. Tab 1 → Select "Nate" → Dashboard
2. Tab 2 → Select "Alice" → Dashboard
3. In Tab 1 → Click "+" on Reviews → Increment to 3
4. **Verify**: Tab 2 leaderboard shows Nate's review count = 3
5. In Tab 2 → Click "+" on Demos → Increment to 5
6. **Verify**: Tab 1 leaderboard shows Alice's demo count = 5

**Expected**: Daily logs sync and leaderboard updates in real-time

---

### Test Case 3: Appointments Cross-Device
**Steps:**
1. Desktop → Select "Nate" → Appointments tab
2. Mobile → Select "Alice" → Appointments tab
3. Desktop → Add appointment: "John Doe, Windows, Jan 20"
4. **Verify**: Appointment appears on Mobile within 5 seconds
5. Mobile → Delete the appointment
6. **Verify**: Appointment disappears on Desktop within 5 seconds

**Expected**: Appointments sync across devices in real-time

---

### Test Case 4: Feed Posts with Likes/Comments
**Steps:**
1. Tab 1 → Select "Nate" → Feed tab
2. Tab 2 → Select "Alice" → Feed tab
3. Tab 1 → Post: "Great day today! 5 demos completed!"
4. **Verify**: Post appears in Tab 2 feed within 5 seconds
5. Tab 2 → Like the post
6. **Verify**: Like count updates in Tab 1 within 5 seconds
7. Tab 1 → Comment: "Nice work!"
8. **Verify**: Comment appears in Tab 2 within 5 seconds

**Expected**: Feed posts, likes, and comments sync in real-time

---

### Test Case 5: Offline Sync Queue
**Steps:**
1. Tab 1 → DevTools → Network → Set to "Offline"
2. Tab 2 → Keep online
3. Tab 1 → Add appointment, update goals, post in feed
4. **Verify**: Changes saved locally but not in Tab 2
5. Tab 1 → Network → Set to "Online"
6. **Verify**: Changes sync to Tab 2 within 10 seconds (5s interval + processing time)
7. Check browser console → Verify "Sync queue processed" messages

**Expected**: Offline changes queue and sync when online

---

### Test Case 6: Goal Updates Multi-User
**Steps:**
1. Tab 1 → Select "Nate" → Goals tab → Set Reviews goal to 10
2. Tab 2 → Select "Alice" → Goals tab
3. **Verify**: Nate's goal update doesn't affect Alice's goals
4. Tab 2 → Set Demos goal to 8
5. Tab 1 → Switch to Alice → Verify goal = 8
6. Tab 1 → Switch back to Nate → Verify goal = 10

**Expected**: User-specific goals sync correctly per user

---

### Test Case 7: Leaderboard Real-Time Updates
**Steps:**
1. Tab 1 → Select "Nate" → Leaderboard
2. Tab 2 → Select "Alice" → Leaderboard
3. Tab 1 → Dashboard → Increment Reviews to 5
4. **Verify**: Tab 2 leaderboard shows updated score for Nate
5. Tab 2 → Dashboard → Increment Demos to 10
6. **Verify**: Tab 1 leaderboard shows updated score for Alice

**Expected**: Leaderboard updates in real-time as scores change

---

## Monitoring Sync Behavior

### Browser Console Monitoring
**What to watch for:**
```javascript
// Real-time subscription events
"User change received!" 
"Daily log change received!"
"Appointment change received!"
"Feed post change received!"

// Sync operations
"Operation queued:"
"Supabase insert success:"
"Supabase update success:"
"Sync queue processed"

// Errors (should NOT see these)
"Failed to sync" 
"Sync operation failed"
```

### Network Tab Monitoring
**What to check:**
- Supabase WebSocket connections (real-time subscriptions)
- API calls to `supabase.co/rest/v1/` (sync operations)
- Failed requests (should be none when online)

### IndexedDB Inspection
**How to inspect:**
1. Chrome DevTools → Application → IndexedDB
2. Check `WindowDepotTracker` database
3. Verify `syncQueue` store contains queued operations when offline
4. Verify `data` store updates when sync completes

---

## Automated Testing Script (Future Enhancement)

### Manual Verification Checklist
- [ ] User creation syncs across tabs
- [ ] User deletion syncs across tabs
- [ ] Goal updates sync per user
- [ ] Daily log increments sync in real-time
- [ ] Appointments sync across devices
- [ ] Feed posts appear in all tabs within 5 seconds
- [ ] Likes update in real-time
- [ ] Comments appear in real-time
- [ ] Leaderboard updates as scores change
- [ ] Offline changes queue properly
- [ ] Sync queue processes when online
- [ ] Failed operations retry up to 3 times

---

## Troubleshooting

### Issue: Changes not syncing
**Check:**
1. Are environment variables set in Vercel? (`REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`)
2. Are real-time subscriptions active? (Check console for subscription messages)
3. Is the browser online? (Check network tab)
4. Are there errors in console? (Check for Supabase connection errors)

### Issue: Offline changes not syncing
**Check:**
1. Is sync queue populated? (Check IndexedDB → syncQueue store)
2. Is sync interval running? (Check console for "Sync queue processed")
3. Are there retry errors? (Check console for failed operations)

### Issue: Real-time updates delayed
**Check:**
1. WebSocket connection status (Check Network tab → WS connections)
2. Supabase project status (Check Supabase dashboard)
3. Browser extension conflicts (Disable ad blockers)

---

## Quick Test Commands

### Test Real-Time Sync (Browser Console)
```javascript
// In Tab 1 console
// Add a test user programmatically
const testUser = { name: 'Test User', role: 'employee', goals: {} };
// This will trigger sync if using the app's functions

// In Tab 2 console
// Monitor for real-time updates
supabase.channel('users_changes').on('postgres_changes', 
  { event: '*', schema: 'public', table: 'users' },
  (payload) => console.log('User change!', payload)
).subscribe();
```

---

## Next Steps for Production

1. **Add Sync Status UI**: Show sync indicator (green = synced, yellow = syncing, red = error)
2. **Add Conflict Resolution UI**: Notify users when conflicts occur
3. **Add Sync Logs**: Admin view to see sync history
4. **Performance Testing**: Test with 10+ simultaneous users
5. **Load Testing**: Test Supabase limits with high-frequency updates
6. **Error Recovery Testing**: Test behavior when Supabase is temporarily unavailable

---

## Conclusion

Start with **Method 1** (multiple tabs) for fastest testing, then progress to **Method 4** (different devices) for realistic scenarios. Use **Method 5** (network simulation) to verify offline sync behavior.

All methods test the same sync mechanisms, just from different perspectives!
