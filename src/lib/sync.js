import { supabase } from './supabase';
import storage from '../storage';

// Sync queue for offline operations
const syncQueue = [];
let isSyncing = false;
let syncInterval = null;

// Initialize sync queue from IndexedDB
export const initSyncQueue = async () => {
  try {
    const queue = await storage.get('syncQueue', []);
    syncQueue.push(...queue);
    if (syncQueue.length > 0 && navigator.onLine) {
      processSyncQueue();
    }
  } catch (error) {
    console.error('Failed to load sync queue:', error);
  }
};

// Add operation to sync queue
export const queueSyncOperation = async (operation) => {
  syncQueue.push({
    ...operation,
    timestamp: Date.now(),
    retries: 0,
  });
  await storage.set('syncQueue', syncQueue);
  
  if (navigator.onLine && !isSyncing) {
    processSyncQueue();
  }
};

// Process sync queue
const processSyncQueue = async () => {
  if (isSyncing || syncQueue.length === 0 || !navigator.onLine) {
    return;
  }

  isSyncing = true;

  while (syncQueue.length > 0 && navigator.onLine) {
    const operation = syncQueue[0];
    
    try {
      await executeSyncOperation(operation);
      syncQueue.shift();
      await storage.set('syncQueue', syncQueue);
    } catch (error) {
      console.error('Sync operation failed:', error);
      operation.retries++;
      
      if (operation.retries >= 3) {
        // Remove failed operation after 3 retries
        syncQueue.shift();
        await storage.set('syncQueue', syncQueue);
        console.error('Operation failed after 3 retries:', operation);
      } else {
        // Move to end of queue for retry
        syncQueue.push(syncQueue.shift());
        await storage.set('syncQueue', syncQueue);
        break; // Wait before retrying
      }
    }
  }

  isSyncing = false;
};

// Execute a sync operation
const executeSyncOperation = async (operation) => {
  const { type, table, data, id } = operation;

  switch (type) {
    case 'insert':
      const { data: insertData, error: insertError } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single();
      if (insertError) throw insertError;
      return insertData;

    case 'update':
      const { data: updateData, error: updateError } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (updateError) throw updateError;
      return updateData;

    case 'upsert':
      const { data: upsertData, error: upsertError } = await supabase
        .from(table)
        .upsert(data, { onConflict: operation.conflictKey })
        .select()
        .single();
      if (upsertError) throw upsertError;
      return upsertData;

    case 'delete':
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;
      return true;

    default:
      throw new Error(`Unknown operation type: ${type}`);
  }
};

// Start periodic sync
export const startSyncInterval = () => {
  if (syncInterval) return;
  
  syncInterval = setInterval(() => {
    if (navigator.onLine && syncQueue.length > 0) {
      processSyncQueue();
    }
  }, 5000); // Sync every 5 seconds
};

// Stop periodic sync
export const stopSyncInterval = () => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
};

// Sync users from Supabase to IndexedDB
export const syncUsersFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Transform Supabase format to app format
    const users = (data || []).map(user => ({
      id: user.id,
      name: user.name,
      role: user.role,
      goals: user.goals,
      createdAt: user.created_at,
      // Gamification fields
      xp: user.xp || 0,
      level: user.level || 1,
      achievements: user.achievements || [],
      achievementProgress: user.achievement_progress || {},
      currentStreak: user.current_streak || 0,
      longestStreak: user.longest_streak || 0,
      lastActivityDate: user.last_activity_date,
      totalSales: user.total_sales || 0,
      // Admin fields
      archived: user.archived || false,
      archivedAt: user.archived_at,
      archivedBy: user.archived_by,
    }));

    await storage.set('users', users);
    return users;
  } catch (error) {
    console.error('Failed to sync users from Supabase:', error);
    return null;
  }
};

// Sync daily logs from Supabase to IndexedDB
export const syncDailyLogsFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;

    // Transform to app format: { date: { userId: { category: count } } }
    const dailyLogs = {};
    (data || []).forEach(log => {
      if (!dailyLogs[log.date]) {
        dailyLogs[log.date] = {};
      }
      if (!dailyLogs[log.date][log.user_id]) {
        dailyLogs[log.date][log.user_id] = {};
      }
      dailyLogs[log.date][log.user_id][log.category] = log.count;
    });

    await storage.set('dailyLogs', dailyLogs);
    return dailyLogs;
  } catch (error) {
    console.error('Failed to sync daily logs from Supabase:', error);
    return null;
  }
};

// Sync appointments from Supabase to IndexedDB
export const syncAppointmentsFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to app format
    const appointments = (data || []).map(apt => ({
      id: apt.id,
      userId: apt.user_id,
      customerName: apt.customer_name,
      date: apt.date,
      time: apt.time,
      products: apt.products || [],
      notes: apt.notes || '',
      countsAsDemo: apt.counts_as_demo,
      timestamp: new Date(apt.created_at).getTime(),
    }));

    await storage.set('appointments', appointments);
    return appointments;
  } catch (error) {
    console.error('Failed to sync appointments from Supabase:', error);
    return null;
  }
};

// Sync feed from Supabase to IndexedDB
export const syncFeedFromSupabase = async () => {
  try {
    // Fetch posts with likes and comments
    const { data: posts, error: postsError } = await supabase
      .from('feed_posts')
      .select(`
        *,
        user:users(name)
      `)
      .order('created_at', { ascending: false });

    if (postsError) throw postsError;

    // Fetch all likes
    const { data: likes, error: likesError } = await supabase
      .from('feed_likes')
      .select('*');

    if (likesError) throw likesError;

    // Fetch all comments
    const { data: comments, error: commentsError } = await supabase
      .from('feed_comments')
      .select(`
        *,
        user:users(name)
      `)
      .order('created_at', { ascending: true });

    if (commentsError) throw commentsError;

    // Transform to app format
    const feed = (posts || []).map(post => {
      const postLikes = (likes || []).filter(like => like.post_id === post.id);
      const postComments = (comments || []).filter(comment => comment.post_id === post.id);

      return {
        id: post.id,
        userId: post.user_id,
        userName: post.user?.name || 'Unknown',
        content: post.content,
        timestamp: new Date(post.created_at).getTime(),
        likes: postLikes.map(like => like.user_id),
        comments: postComments.map(comment => ({
          id: comment.id,
          userId: comment.user_id,
          userName: comment.user?.name || 'Unknown',
          content: comment.content,
          timestamp: new Date(comment.created_at).getTime(),
        })),
        isAuto: post.type === 'auto',
      };
    });

    await storage.set('feed', feed);
    return feed;
  } catch (error) {
    console.error('Failed to sync feed from Supabase:', error);
    return null;
  }
};

// Sync achievements from Supabase to IndexedDB
export const syncAchievementsFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    await storage.set('achievements', data || []);
    return data || [];
  } catch (error) {
    console.error('Failed to sync achievements from Supabase:', error);
    return null;
  }
};

// Sync challenges from Supabase to IndexedDB
export const syncChallengesFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to app format
    const challenges = (data || []).map(challenge => ({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      challengeType: challenge.challenge_type,
      goalType: challenge.goal_type,
      goalValue: challenge.goal_value,
      xpReward: challenge.xp_reward,
      startDate: challenge.start_date,
      endDate: challenge.end_date,
      isActive: challenge.is_active,
      createdBy: challenge.created_by,
      targetUsers: challenge.target_users || [],
    }));

    await storage.set('challenges', challenges);
    return challenges;
  } catch (error) {
    console.error('Failed to sync challenges from Supabase:', error);
    return null;
  }
};

// Sync user challenges from Supabase to IndexedDB
export const syncUserChallengesFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('user_challenges')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform to app format
    const userChallenges = (data || []).map(uc => ({
      id: uc.id,
      userId: uc.user_id,
      challengeId: uc.challenge_id,
      progress: uc.progress,
      completed: uc.completed,
      completedAt: uc.completed_at,
    }));

    await storage.set('userChallenges', userChallenges);
    return userChallenges;
  } catch (error) {
    console.error('Failed to sync user challenges from Supabase:', error);
    return null;
  }
};

// Sync rewards from Supabase to IndexedDB
export const syncRewardsFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Transform to app format
    const rewards = (data || []).map(reward => ({
      id: reward.id,
      name: reward.name,
      description: reward.description,
      rewardType: reward.reward_type,
      rewardCategory: reward.reward_category,
      requiredLevel: reward.required_level,
      requiredAchievements: reward.required_achievements || [],
      icon: reward.icon,
    }));

    await storage.set('rewards', rewards);
    return rewards;
  } catch (error) {
    console.error('Failed to sync rewards from Supabase:', error);
    return null;
  }
};

// Sync user rewards from Supabase to IndexedDB
export const syncUserRewardsFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('user_rewards')
      .select('*')
      .order('earned_at', { ascending: false });

    if (error) throw error;

    // Transform to app format
    const userRewards = (data || []).map(ur => ({
      id: ur.id,
      userId: ur.user_id,
      rewardId: ur.reward_id,
      earnedAt: ur.earned_at,
      claimed: ur.claimed,
      claimedAt: ur.claimed_at,
    }));

    await storage.set('userRewards', userRewards);
    return userRewards;
  } catch (error) {
    console.error('Failed to sync user rewards from Supabase:', error);
    return null;
  }
};

// Sync audit log from Supabase to IndexedDB
export const syncAuditLogFromSupabase = async () => {
  try {
    // Only fetch last 1000 entries
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1000);

    if (error) throw error;

    // Transform to app format
    const auditLog = (data || []).map(log => ({
      id: log.id,
      userId: log.user_id,
      userName: log.user_name,
      action: log.action,
      entityType: log.entity_type,
      entityId: log.entity_id,
      details: log.details,
      timestamp: log.timestamp,
    }));

    await storage.set('auditLog', auditLog);
    return auditLog;
  } catch (error) {
    console.error('Failed to sync audit log from Supabase:', error);
    return null;
  }
};

// Sync all data from Supabase
export const syncAllFromSupabase = async () => {
  if (!navigator.onLine) {
    console.log('Offline - skipping Supabase sync');
    return null;
  }

  try {
    const [
      users,
      dailyLogs,
      appointments,
      feed,
      achievements,
      challenges,
      userChallenges,
      rewards,
      userRewards,
      auditLog,
    ] = await Promise.all([
      syncUsersFromSupabase(),
      syncDailyLogsFromSupabase(),
      syncAppointmentsFromSupabase(),
      syncFeedFromSupabase(),
      syncAchievementsFromSupabase(),
      syncChallengesFromSupabase(),
      syncUserChallengesFromSupabase(),
      syncRewardsFromSupabase(),
      syncUserRewardsFromSupabase(),
      syncAuditLogFromSupabase(),
    ]);

    return {
      users,
      dailyLogs,
      appointments,
      feed,
      achievements,
      challenges,
      userChallenges,
      rewards,
      userRewards,
      auditLog,
    };
  } catch (error) {
    console.error('Failed to sync all data from Supabase:', error);
    return null;
  }
};
