# Gamification & Admin Tools Implementation Guide

## Overview

This guide provides a complete implementation plan for Team Omega's mission: Admin Tools & Gamification Squad. The database migrations and sync layer are complete. This document provides the remaining App.jsx implementation details.

## Completed Components

- ✅ **Database Migrations**: `006_gamification.sql` and `007_audit_log.sql` created
- ✅ **Sync Layer**: `sync.js` updated to handle all new tables
- ✅ **Constants**: XP_LEVELS, XP_SOURCES, ACHIEVEMENT_TIERS added to App.jsx

## Implementation Checklist

### Part 1: Gamification System (Lines to Add in App.jsx)

#### 1. Add New State Variables (After line 404 in STATE MANAGEMENT section)

```javascript
// Gamification state
const [achievements, setAchievements] = useState([]);
const [challenges, setChallenges] = useState([]);
const [userChallenges, setUserChallenges] = useState([]);
const [rewards, setRewards] = useState([]);
const [userRewards, setUserRewards] = useState([]);
const [showLevelUpAnimation, setShowLevelUpAnimation] = useState(null);
const [showAchievementUnlock, setShowAchievementUnlock] = useState(null);
const [auditLog, setAuditLog] = useState([]);
```

#### 2. Add Helper Functions (Inside component, after state variables)

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
        icon: '✨',
      });

      return { ...u, xp: newXP, level: newLevel.level };
    }
    return u;
  });

  setUsers(updatedUsers);
  await storage.set('users', updatedUsers);

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

// Check and unlock achievements
const checkAchievements = useCallback(async (userId) => {
  const user = users.find(u => u.id === userId);
  if (!user) return;

  const userAchievements = user.achievements || [];

  // Check all achievement criteria
  for (const achievement of achievements) {
    if (userAchievements.includes(achievement.id)) continue;

    const criteria = achievement.criteria;
    let unlocked = false;

    switch (criteria.type) {
      case 'goal_completed':
        // Count total goals completed
        const totalGoalsCompleted = Object.values(dailyLogs).reduce((sum, dayLogs) => {
          const userLogs = dayLogs[userId] || {};
          return sum + Object.keys(userLogs).length;
        }, 0);
        unlocked = totalGoalsCompleted >= criteria.count;
        break;

      case 'streak':
        unlocked = (user.currentStreak || 0) >= criteria.count;
        break;

      case 'feed_posts':
        const userPosts = feed.filter(p => p.userId === userId);
        unlocked = userPosts.length >= criteria.count;
        break;

      case 'appointments':
        const userAppointments = appointments.filter(a => a.userId === userId);
        unlocked = userAppointments.length >= criteria.count;
        break;

      case 'sales':
        unlocked = (user.totalSales || 0) >= criteria.count;
        break;

      case 'likes_received':
        const totalLikes = feed
          .filter(p => p.userId === userId)
          .reduce((sum, p) => sum + (p.likes?.length || 0), 0);
        unlocked = totalLikes >= criteria.count;
        break;

      default:
        break;
    }

    if (unlocked) {
      // Unlock achievement
      const updatedUsers = users.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            achievements: [...(u.achievements || []), achievement.id],
          };
        }
        return u;
      });

      setUsers(updatedUsers);
      await storage.set('users', updatedUsers);

      // Award XP for achievement
      await awardXP(userId, achievement.xp_reward, `Achievement: ${achievement.name}`);

      // Show achievement unlock animation
      setShowAchievementUnlock({ achievement, user });
      setTimeout(() => setShowAchievementUnlock(null), 5000);

      // Sync to Supabase
      const updatedUser = updatedUsers.find(u => u.id === userId);
      if (updatedUser && isSupabaseConfigured()) {
        await queueSyncOperation({
          type: 'update',
          table: 'users',
          id: userId,
          data: { achievements: updatedUser.achievements },
        });
      }
    }
  }
}, [users, achievements, dailyLogs, feed, appointments, awardXP]);

// Log audit event
const logAuditEvent = useCallback(async (action, entityType, entityId, details) => {
  const auditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: currentUser?.id || null,
    userName: currentUser?.name || 'System',
    action,
    entityType,
    entityId,
    details,
    timestamp: new Date().toISOString(),
  };

  const updatedLog = [auditEntry, ...auditLog].slice(0, 1000);
  setAuditLog(updatedLog);
  await storage.set('auditLog', updatedLog);

  if (isSupabaseConfigured()) {
    await queueSyncOperation({
      type: 'insert',
      table: 'audit_log',
      data: {
        id: auditEntry.id,
        user_id: auditEntry.userId,
        user_name: auditEntry.userName,
        action: auditEntry.action,
        entity_type: auditEntry.entityType,
        entity_id: auditEntry.entityId,
        details: auditEntry.details,
        timestamp: auditEntry.timestamp,
      },
    });
  }
}, [currentUser, auditLog]);
```

#### 3. Create XP Bar Component (New component function)

```javascript
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
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

#### 4. Create Achievements Page Component

```javascript
function AchievementsPage({ currentUser, users, achievements, theme }) {
  const THEME = theme;
  const user = users.find(u => u.id === currentUser?.id);
  const unlockedAchievements = user?.achievements || [];

  const groupedAchievements = {
    bronze: achievements.filter(a => a.category === 'bronze'),
    silver: achievements.filter(a => a.category === 'silver'),
    gold: achievements.filter(a => a.category === 'gold'),
    diamond: achievements.filter(a => a.category === 'diamond'),
    platinum: achievements.filter(a => a.category === 'platinum'),
    legendary: achievements.filter(a => a.category === 'legendary'),
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: THEME.text, marginBottom: '8px' }}>
          Achievements
        </h2>
        <div style={{ fontSize: '14px', color: THEME.textLight }}>
          {unlockedAchievements.length} of {achievements.length} unlocked
        </div>
      </div>

      {Object.entries(groupedAchievements).map(([tier, tierAchievements]) => (
        <div key={tier} style={{ marginBottom: '32px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
            padding: '12px',
            background: ACHIEVEMENT_TIERS[tier].gradient,
            borderRadius: '10px',
            color: THEME.white,
          }}>
            <div style={{ fontSize: '20px', fontWeight: '700', textTransform: 'capitalize' }}>
              {tier} Achievements
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '14px' }}>
              {tierAchievements.filter(a => unlockedAchievements.includes(a.id)).length} / {tierAchievements.length}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
          }}>
            {tierAchievements.map(achievement => {
              const isUnlocked = unlockedAchievements.includes(achievement.id);

              return (
                <div
                  key={achievement.id}
                  style={{
                    background: isUnlocked ? THEME.white : THEME.secondary,
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: isUnlocked ? '0 4px 12px rgba(0,0,0,0.12)' : '0 2px 6px rgba(0,0,0,0.08)',
                    opacity: isUnlocked ? 1 : 0.6,
                    border: isUnlocked ? `2px solid ${ACHIEVEMENT_TIERS[tier].color}` : 'none',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ fontSize: '40px', textAlign: 'center', marginBottom: '12px', filter: isUnlocked ? 'none' : 'grayscale(100%)' }}>
                    {achievement.icon}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: THEME.text, textAlign: 'center', marginBottom: '6px' }}>
                    {achievement.name}
                  </div>
                  <div style={{ fontSize: '13px', color: THEME.textLight, textAlign: 'center', marginBottom: '12px' }}>
                    {achievement.description}
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    background: ACHIEVEMENT_TIERS[tier].gradient,
                    borderRadius: '6px',
                    color: THEME.white,
                    fontSize: '12px',
                    fontWeight: '600',
                  }}>
                    ✨ +{achievement.xp_reward} XP
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Part 2: Admin Panel Enhancements

#### 5. Enhanced Admin Panel with Bulk Operations

The enhanced admin panel should include:

- **Bulk Goal Setting**: Modal to set goals for multiple users
- **Bulk Import**: CSV upload for creating multiple users
- **Bulk Delete**: Multi-select with checkboxes
- **Clone User**: Copy user settings to create similar users
- **Audit Log Viewer**: Table showing all admin actions
- **System Health Dashboard**: Sync status, storage stats, error log
- **Data Management**: Import/export, restore, archive users

#### 6. User Roles & Permissions

Add role dropdown with options:
- Employee
- Team Lead (can view team stats, no edit)
- Manager (can edit goals, view reports)
- Observer (read-only)
- Admin (full access)

Implement permission checks throughout the app:
```javascript
const hasPermission = (user, action) => {
  const permissions = {
    employee: ['view_own', 'edit_own', 'post_feed'],
    team_lead: ['view_own', 'edit_own', 'post_feed', 'view_team'],
    manager: ['view_all', 'edit_goals', 'view_reports', 'admin_panel'],
    observer: ['view_all'],
    admin: ['view_all', 'edit_goals', 'view_reports', 'admin_panel', 'manage_users', 'system_settings'],
  };
  return permissions[user.role]?.includes(action);
};
```

### Part 3: Enhanced Team View

#### 7. Team View with Sorting & Filtering

```javascript
function EnhancedTeamView({ users, dailyLogs, currentUser, theme }) {
  const [sortBy, setSortBy] = useState('progress');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const employees = users
    .filter(u => u.role === 'employee' && !u.archived)
    .filter(u => {
      if (searchTerm) {
        return u.name.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    })
    .filter(u => {
      if (filterStatus === 'all') return true;

      const today = getToday();
      const todayLog = dailyLogs[today]?.[u.id] || {};
      const progress = calculateDailyProgress(todayLog, u.goals);

      if (filterStatus === 'behind') return progress < 50;
      if (filterStatus === 'ontrack') return progress >= 50 && progress < 100;
      if (filterStatus === 'ahead') return progress >= 100 && progress < 150;
      if (filterStatus === 'crushing') return progress >= 150;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'progress') {
        const today = getToday();
        const progressA = calculateDailyProgress(dailyLogs[today]?.[a.id] || {}, a.goals);
        const progressB = calculateDailyProgress(dailyLogs[today]?.[b.id] || {}, b.goals);
        return progressB - progressA;
      }
      return 0;
    });

  // Rest of component implementation...
}
```

## Integration Points

### Update Data Loading (in useEffect)

Add to initial data load:
```javascript
const [loadedAchievements, loadedChallenges, loadedUserChallenges, loadedRewards, loadedUserRewards, loadedAuditLog] = await Promise.all([
  storage.get('achievements', []),
  storage.get('challenges', []),
  storage.get('userChallenges', []),
  storage.get('rewards', []),
  storage.get('userRewards', []),
  storage.get('auditLog', []),
]);

setAchievements(loadedAchievements);
setChallenges(loadedChallenges);
setUserChallenges(loadedUserChallenges);
setRewards(loadedRewards);
setUserRewards(loadedUserRewards);
setAuditLog(loadedAuditLog);
```

### Update Goal Completion Handler

When user completes a goal, add:
```javascript
// Award XP for completing goal
await awardXP(userId, XP_SOURCES.COMPLETE_GOAL_CATEGORY, `Completed ${category} goal`);

// Check if all goals completed
const allGoalsComplete = CATEGORIES.every(cat =>
  (todayLog[cat.id] || 0) >= user.goals[cat.id]
);

if (allGoalsComplete) {
  await awardXP(userId, XP_SOURCES.ALL_GOALS_BONUS, 'All goals completed!');
}

// Check achievements
await checkAchievements(userId);
```

### Update Navigation

Add new navigation items:
```javascript
{ id: 'achievements', name: 'Achievements', icon: Award, badge: null },
{ id: 'challenges', name: 'Challenges', icon: Target, badge: activeChallenges },
{ id: 'rewards', name: 'Rewards', icon: Gift, badge: unclaimedRewards },
```

## Testing Checklist

- [ ] XP is awarded for all actions
- [ ] Achievements unlock correctly
- [ ] Level-up animations work
- [ ] Challenges track progress
- [ ] Admin panel bulk operations work
- [ ] Audit log records all actions
- [ ] User roles restrict access properly
- [ ] Team view filters work
- [ ] Data syncs to Supabase
- [ ] Offline mode works

## Performance Considerations

- Cache level calculations
- Debounce achievement checks
- Lazy load achievement page
- Limit audit log to 1000 entries
- Index database queries properly

## File Summary

- ✅ `supabase/migrations/006_gamification.sql` - Complete gamification schema
- ✅ `supabase/migrations/007_audit_log.sql` - Complete audit system
- ✅ `src/lib/sync.js` - Sync functions for all new tables
- ⚠️ `src/App.jsx` - Requires ~3000+ lines of additions (see guide above)

## Next Steps

1. Add state variables to App.jsx
2. Implement helper functions
3. Create all UI components
4. Integrate XP system into existing actions
5. Test thoroughly
6. Deploy migrations to Supabase

---

**Total Estimated Lines of Code**: ~4000+ lines across all files
**Estimated Implementation Time**: 20-30 hours for full implementation
