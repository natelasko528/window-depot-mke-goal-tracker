# Quick Start: Adding XP System (First Feature)

This guide walks through implementing the first gamification feature: the XP system with level-up animations.

## Step 1: Add State Variables

**Location**: `src/App.jsx` - In STATE MANAGEMENT section (after line ~404)

```javascript
// Add after existing state variables:
const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(null);
const [xpToastVisible, setXpToastVisible] = useState(false);
```

## Step 2: Add awardXP Helper Function

**Location**: `src/App.jsx` - After state variables, before useEffect hooks

```javascript
// Award XP to user
const awardXP = useCallback(async (userId, amount, reason) => {
  const updatedUsers = users.map(u => {
    if (u.id === userId) {
      const newXP = (u.xp || 0) + amount;
      const oldLevel = calculateLevel(u.xp || 0);
      const newLevel = calculateLevel(newXP);
      const leveledUp = newLevel.level > oldLevel.level;

      if (leveledUp) {
        setShowLevelUpAnimation({ user: u, newLevel });
        setTimeout(() => setShowLevelUpAnimation(null), 5000);
      }

      // Show XP toast
      setToast({
        message: `+${amount} XP - ${reason}`,
        type: 'success',
      });

      return { ...u, xp: newXP, level: newLevel.level };
    }
    return u;
  });

  setUsers(updatedUsers);
  await storage.set('users', updatedUsers);

  // Sync to Supabase
  const user = updatedUsers.find(u => u.id === userId);
  if (user && isSupabaseConfigured()) {
    await queueSyncOperation({
      type: 'update',
      table: 'users',
      id: userId,
      data: { xp: user.xp, level: user.level },
    });
  }
}, [users]);
```

## Step 3: Create XP Bar Component

**Location**: `src/App.jsx` - Add new component before main WindowDepotTracker component

```javascript
// XP Bar Component
function XPBar({ user, theme }) {
  const THEME = theme;
  const currentLevel = calculateLevel(user.xp || 0);
  const xpInfo = getXPForNextLevel(user.xp || 0);

  return (
    <div style={{
      background: THEME.white,
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      {/* Level Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${currentLevel.color} 0%, ${currentLevel.color}CC 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: THEME.white,
            fontSize: '20px',
            fontWeight: '700',
            boxShadow: `0 4px 12px ${currentLevel.color}40`,
          }}>
            {currentLevel.level}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: THEME.text }}>
              Level {currentLevel.level} - {currentLevel.title}
            </div>
            <div style={{ fontSize: '14px', color: THEME.textLight }}>
              {user.xp || 0} XP
              {xpInfo.nextLevel && ` • ${Math.floor(xpInfo.needed)} XP to Level ${currentLevel.level + 1}`}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {xpInfo.nextLevel && (
        <div style={{
          width: '100%',
          height: '12px',
          background: THEME.secondary,
          borderRadius: '6px',
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div style={{
            width: `${xpInfo.progress}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${currentLevel.color} 0%, ${XP_LEVELS[currentLevel.level].color} 100%)`,
            transition: 'width 0.5s ease',
            borderRadius: '6px',
            boxShadow: `0 0 8px ${currentLevel.color}60`,
          }} />
        </div>
      )}
    </div>
  );
}
```

## Step 4: Add XPBar to Dashboard

**Location**: `src/App.jsx` - Find the Dashboard component (search for "function Dashboard" or where dashboard content renders)

Add the XPBar right after the welcome message and before the daily goals:

```javascript
// In Dashboard component:
return (
  <div>
    {/* Existing welcome message */}
    <h2 style={{...}}>Welcome, {currentUser?.name}!</h2>

    {/* NEW: Add XP Bar */}
    <XPBar user={currentUser} theme={THEME} />

    {/* Existing daily goals section */}
    <div style={{...}}>
      {CATEGORIES.map(category => (
        // ... existing goal tracking UI
      ))}
    </div>
  </div>
);
```

## Step 5: Integrate XP Rewards into Existing Actions

### Award XP for Goal Completion

**Location**: Find where goals are incremented (search for "handleIncrement" or similar)

```javascript
// In handleIncrement or wherever goal counts are updated:
const handleIncrement = async (category) => {
  // ... existing code to update logs ...

  // NEW: Check if goal was just completed
  const newCount = (dailyLogs[today]?.[currentUser.id]?.[category] || 0) + 1;
  const goalValue = currentUser.goals[category];

  if (newCount === goalValue) {
    // Goal just completed! Award XP
    await awardXP(
      currentUser.id,
      XP_SOURCES.COMPLETE_GOAL_CATEGORY,
      `Completed ${category} goal`
    );

    // Check if ALL goals are now complete
    const allGoalsComplete = CATEGORIES.every(cat => {
      const count = cat.id === category ? newCount : (dailyLogs[today]?.[currentUser.id]?.[cat.id] || 0);
      return count >= currentUser.goals[cat.id];
    });

    if (allGoalsComplete) {
      await awardXP(
        currentUser.id,
        XP_SOURCES.ALL_GOALS_BONUS,
        'All goals completed!'
      );
    }
  }

  // ... rest of existing code ...
};
```

### Award XP for Creating Appointment

**Location**: Find where appointments are created (search for "createAppointment" or similar)

```javascript
// In appointment creation handler:
const handleCreateAppointment = async (appointmentData) => {
  // ... existing code to create appointment ...

  // NEW: Award XP
  await awardXP(
    currentUser.id,
    XP_SOURCES.CREATE_APPOINTMENT,
    'Created appointment'
  );

  // ... rest of existing code ...
};
```

### Award XP for Feed Post

**Location**: Find where feed posts are created (search for "createPost" or "handlePost")

```javascript
// In feed post creation handler:
const handleCreatePost = async (content) => {
  // ... existing code to create post ...

  // NEW: Award XP
  await awardXP(
    currentUser.id,
    XP_SOURCES.POST_TO_FEED,
    'Posted to feed'
  );

  // ... rest of existing code ...
};
```

### Award XP for Receiving Likes

**Location**: Find where likes are added (search for "handleLike" or similar)

```javascript
// In like handler:
const handleLike = async (postId, postUserId) => {
  // ... existing code to add like ...

  // NEW: Award XP to post author
  if (postUserId !== currentUser.id) { // Don't award for self-likes
    await awardXP(
      postUserId,
      XP_SOURCES.RECEIVE_LIKE,
      'Post liked'
    );
  }

  // ... rest of existing code ...
};
```

## Step 6: Add Level-Up Animation

**Location**: `src/App.jsx` - Add component before WindowDepotTracker

```javascript
// Level-Up Animation Component
function LevelUpAnimation({ levelUpData, theme }) {
  if (!levelUpData) return null;

  const THEME = theme;
  const { user, newLevel } = levelUpData;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      animation: 'fadeIn 0.3s ease-in',
    }}>
      <div style={{
        background: THEME.white,
        borderRadius: '20px',
        padding: '40px',
        textAlign: 'center',
        maxWidth: '400px',
        animation: 'scaleIn 0.5s ease-out',
      }}>
        {/* Sparkle Effect */}
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>
          ✨🎉✨
        </div>

        {/* Level Badge */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${newLevel.color} 0%, ${newLevel.color}CC 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: THEME.white,
          fontSize: '48px',
          fontWeight: '700',
          margin: '0 auto 20px',
          boxShadow: `0 8px 24px ${newLevel.color}60`,
          animation: 'pulse 1s ease-in-out infinite',
        }}>
          {newLevel.level}
        </div>

        {/* Text */}
        <div style={{ fontSize: '32px', fontWeight: '700', color: THEME.text, marginBottom: '10px' }}>
          Level Up!
        </div>
        <div style={{ fontSize: '24px', fontWeight: '600', color: newLevel.color, marginBottom: '10px' }}>
          Level {newLevel.level} - {newLevel.title}
        </div>
        <div style={{ fontSize: '16px', color: THEME.textLight }}>
          You're making great progress, {user.name}!
        </div>
      </div>
    </div>
  );
}
```

Then add to main render:

```javascript
// In WindowDepotTracker return statement, add at top level:
return (
  <div className="App">
    {/* NEW: Level-up animation overlay */}
    <LevelUpAnimation levelUpData={showLevelUpAnimation} theme={THEME} />

    {/* Existing app content */}
    {/* ... */}
  </div>
);
```

## Step 7: Add CSS Animations

**Location**: `src/App.css` or add a `<style>` tag in the HTML

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
```

## Step 8: Test XP System

1. **Create a test user**: Use Admin Panel to create a new employee
2. **Complete a goal**: Increment a category until it reaches the goal value
3. **Check XP award**: You should see "+50 XP - Completed [category] goal" toast
4. **Check XP bar**: The XP bar should update and show progress
5. **Level up**: Continue earning XP until you level up (500 XP for level 2)
6. **Check animation**: You should see the level-up animation overlay

## Debugging Tips

```javascript
// Add console logs to verify XP awards:
console.log('Awarding XP:', { userId, amount, reason, currentXP: user.xp, newXP: newXP });

// Check XP calculation:
console.log('Level calculation:', { xp: user.xp, level: calculateLevel(user.xp) });

// Verify storage:
storage.get('users').then(users => console.log('Users in storage:', users));
```

## Next Steps

Once XP system is working:

1. ✅ Test on multiple users
2. ✅ Verify sync to Supabase
3. ✅ Test offline mode
4. → Move to **Achievements System** (see GAMIFICATION_IMPLEMENTATION_GUIDE.md)
5. → Then **Challenges System**
6. → Then **Enhanced Admin Panel**

---

**Estimated Time**: 2-3 hours for first implementation
**Complexity**: Medium
**Dependencies**: None (foundation is complete)
**Status**: Ready to implement 🚀
