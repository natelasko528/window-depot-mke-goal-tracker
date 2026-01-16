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

// Sync all data from Supabase
export const syncAllFromSupabase = async () => {
  if (!navigator.onLine) {
    console.log('Offline - skipping Supabase sync');
    return null;
  }

  try {
    const [users, dailyLogs, appointments, feed] = await Promise.all([
      syncUsersFromSupabase(),
      syncDailyLogsFromSupabase(),
      syncAppointmentsFromSupabase(),
      syncFeedFromSupabase(),
    ]);

    return { users, dailyLogs, appointments, feed };
  } catch (error) {
    console.error('Failed to sync all data from Supabase:', error);
    return null;
  }
};
