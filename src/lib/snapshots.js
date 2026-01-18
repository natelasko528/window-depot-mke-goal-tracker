import { supabase } from './supabase';
import storage from '../storage';

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
const getYesterdayDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
};

/**
 * Get a specific date in YYYY-MM-DD format
 */
const formatDateString = (date) => {
  if (typeof date === 'string') return date;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/**
 * Determine if goals were met for a given day
 */
const checkGoalsMet = (categories, logs) => {
  return categories.every(cat => {
    const count = logs[cat.id] || 0;
    const goal = cat.goal || 0;
    return count >= goal;
  });
};

/**
 * Create a daily snapshot for a specific date and user
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} userId - User ID
 * @param {object} dailyLogs - App format: { date: { userId: { category: count } } }
 * @param {array} users - Array of user objects with id, name, role, goals
 * @returns {object} Snapshot object in app format (camelCase)
 */
export const createDailySnapshot = (date, userId, dailyLogs, users) => {
  // Get user's goals
  const user = users.find(u => u.id === userId);
  if (!user) {
    console.warn(`User ${userId} not found`);
    return null;
  }

  // Get logs for this user on this date
  const userLogs = dailyLogs[date]?.[userId] || {};

  const reviewsCount = userLogs.reviews || 0;
  const demosCount = userLogs.demos || 0;
  const callbacksCount = userLogs.callbacks || 0;

  const reviewsGoal = user.goals?.reviews || 0;
  const demosGoal = user.goals?.demos || 0;
  const callbacksGoal = user.goals?.callbacks || 0;

  // Check if all goals were met
  const goalsMet =
    reviewsCount >= reviewsGoal &&
    demosCount >= demosGoal &&
    callbacksCount >= callbacksGoal;

  return {
    userId,
    date,
    reviewsCount,
    demosCount,
    callbacksCount,
    reviewsGoal,
    demosGoal,
    callbacksGoal,
    goalsMet,
  };
};

/**
 * Transform snapshot from app format (camelCase) to Supabase format (snake_case)
 */
const transformToDatabase = (snapshot) => {
  return {
    user_id: snapshot.userId,
    date: snapshot.date,
    reviews_count: snapshot.reviewsCount,
    demos_count: snapshot.demosCount,
    callbacks_count: snapshot.callbacksCount,
    reviews_goal: snapshot.reviewsGoal,
    demos_goal: snapshot.demosGoal,
    callbacks_goal: snapshot.callbacksGoal,
    goals_met: snapshot.goalsMet,
  };
};

/**
 * Transform snapshot from Supabase format (snake_case) to app format (camelCase)
 */
const transformFromDatabase = (snapshot) => {
  return {
    id: snapshot.id,
    userId: snapshot.user_id,
    date: snapshot.date,
    reviewsCount: snapshot.reviews_count,
    demosCount: snapshot.demos_count,
    callbacksCount: snapshot.callbacks_count,
    reviewsGoal: snapshot.reviews_goal,
    demosGoal: snapshot.demos_goal,
    callbacksGoal: snapshot.callbacks_goal,
    goalsMet: snapshot.goals_met,
    createdAt: snapshot.created_at,
    updatedAt: snapshot.updated_at,
  };
};

/**
 * Check if snapshot exists for a given date and user
 */
const snapshotExists = async (date, userId) => {
  try {
    const { data, error } = await supabase
      .from('daily_snapshots')
      .select('id')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is expected
      console.error('Error checking snapshot existence:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking snapshot existence:', error);
    return false;
  }
};

/**
 * Create missing snapshots for yesterday for all users
 * This should be called on app initialization or daily
 * @param {array} users - Array of user objects
 * @param {object} dailyLogs - Daily logs in app format
 */
export const ensureDailySnapshots = async (users, dailyLogs) => {
  if (!users || users.length === 0 || !dailyLogs) {
    return;
  }

  const yesterday = getYesterdayDate();

  for (const user of users) {
    try {
      // Check if snapshot already exists
      const exists = await snapshotExists(yesterday, user.id);

      if (!exists) {
        // Create snapshot
        const snapshot = createDailySnapshot(yesterday, user.id, dailyLogs, users);

        if (snapshot) {
          // Transform to database format
          const dbSnapshot = transformToDatabase(snapshot);

          // Upsert to database
          const { error } = await supabase
            .from('daily_snapshots')
            .upsert(dbSnapshot, {
              onConflict: 'user_id,date'
            })
            .select();

          if (error) {
            console.error(`Failed to create snapshot for user ${user.id}:`, error);
          } else {
            console.log(`Created snapshot for ${user.name} on ${yesterday}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error ensuring snapshot for user ${user.id}:`, error);
    }
  }
};

/**
 * Query snapshots for a date range and user
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {string} userId - Optional: filter by user ID
 * @returns {array} Array of snapshots in app format
 */
export const getSnapshotsForDateRange = async (startDate, endDate, userId = null) => {
  try {
    let query = supabase
      .from('daily_snapshots')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching snapshots:', error);
      return [];
    }

    return (data || []).map(transformFromDatabase);
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    return [];
  }
};

/**
 * Sync snapshots from Supabase to IndexedDB
 * @returns {object} Object mapping userId to array of snapshots
 */
export const syncSnapshotsFromSupabase = async () => {
  try {
    // Fetch all snapshots from the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const startDate = formatDateString(ninetyDaysAgo);

    const { data, error } = await supabase
      .from('daily_snapshots')
      .select('*')
      .gte('date', startDate)
      .order('date', { ascending: false });

    if (error) {
      console.error('Failed to sync snapshots from Supabase:', error);
      return null;
    }

    // Transform and organize by user and date
    const snapshots = {};

    (data || []).forEach(snapshot => {
      const transformed = transformFromDatabase(snapshot);
      const userId = transformed.userId;

      if (!snapshots[userId]) {
        snapshots[userId] = [];
      }

      snapshots[userId].push(transformed);
    });

    // Save to IndexedDB
    await storage.set('dailySnapshots', snapshots);

    return snapshots;
  } catch (error) {
    console.error('Failed to sync snapshots from Supabase:', error);
    return null;
  }
};

/**
 * Get snapshots from local storage
 * @returns {object} Object mapping userId to array of snapshots
 */
export const getLocalSnapshots = async () => {
  try {
    const snapshots = await storage.get('dailySnapshots', {});
    return snapshots;
  } catch (error) {
    console.error('Error loading local snapshots:', error);
    return {};
  }
};

/**
 * Initialize snapshots by syncing from Supabase
 * @returns {boolean} Success status
 */
export const initializeSnapshots = async () => {
  try {
    // Try to sync from Supabase
    const result = await syncSnapshotsFromSupabase();

    if (result) {
      console.log('Snapshots initialized successfully');
      return true;
    }

    console.log('Using local snapshots');
    return true;
  } catch (error) {
    console.error('Error initializing snapshots:', error);
    return false;
  }
};
