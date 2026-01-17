import { supabase, isSupabaseConfigured } from './supabase';

let presenceChannel = null;
let currentUserId = null;

export const initializePresence = async (userId, userName, userRole) => {
  if (!isSupabaseConfigured || !supabase || !userId) {
    console.warn('Presence: Supabase not configured or userId missing');
    return null;
  }
  
  // Cleanup existing presence if any
  if (presenceChannel) {
    await cleanupPresence();
  }
  
  currentUserId = userId;
  
  // Create presence channel
  presenceChannel = supabase.channel('presence:app', {
    config: {
      presence: {
        key: userId, // Unique key per user
      },
    },
  });

  // Track user presence
  await presenceChannel.track({
    userId,
    userName,
    userRole,
    onlineAt: new Date().toISOString(),
    currentView: 'dashboard', // Track what page they're on
  });

  // Subscribe to presence events
  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      console.log('Presence sync');
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', newPresences);
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', leftPresences);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Presence channel subscribed');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error('❌ Presence subscription failed:', status);
      }
    });

  return presenceChannel;
};

export const updatePresence = async (updates) => {
  if (presenceChannel && currentUserId) {
    await presenceChannel.track({
      userId: currentUserId,
      ...updates,
    });
  }
};

export const cleanupPresence = async () => {
  if (presenceChannel) {
    try {
      await presenceChannel.untrack();
      await presenceChannel.unsubscribe();
    } catch (error) {
      console.error('Error cleaning up presence:', error);
    }
    presenceChannel = null;
    currentUserId = null;
  }
};

export const getPresenceState = () => {
  if (!presenceChannel) return [];
  try {
    const state = presenceChannel.presenceState();
    // Transform presence state to array of active users
    // State structure: { [userId]: [{ userId, userName, userRole, ... }] }
    const activeUsers = [];
    Object.entries(state).forEach(([userId, presences]) => {
      if (presences && presences.length > 0) {
        // Get the most recent presence for this user
        activeUsers.push(presences[presences.length - 1]);
      }
    });
    return activeUsers;
  } catch (error) {
    console.error('Error getting presence state:', error);
    return [];
  }
};
