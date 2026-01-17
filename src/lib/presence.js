import { supabase, isSupabaseConfigured } from './supabase';

let presenceChannel = null;
let currentUserId = null;
let initialPresenceData = null;
let isSubscribed = false;

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
  isSubscribed = false;
  
  // Store initial presence data for tracking after subscription
  initialPresenceData = {
    userId,
    userName,
    userRole,
    onlineAt: new Date().toISOString(),
    currentView: 'dashboard', // Track what page they're on
  };
  
  // Create presence channel
  presenceChannel = supabase.channel('presence:app', {
    config: {
      presence: {
        key: userId, // Unique key per user
      },
    },
  });

  // Set up presence event listeners BEFORE subscribing
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
        isSubscribed = true;
        console.log('✅ Presence channel subscribed');
        
        // NOW track user presence AFTER subscription is established
        if (initialPresenceData) {
          try {
            await presenceChannel.track(initialPresenceData);
            console.log('✅ Presence tracking started');
          } catch (error) {
            console.error('Error tracking presence:', error);
          }
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        isSubscribed = false;
        console.error('❌ Presence subscription failed:', status);
      } else {
        isSubscribed = false;
      }
    });

  return presenceChannel;
};

export const updatePresence = async (updates) => {
  if (!presenceChannel || !currentUserId) {
    return;
  }
  
  // Wait for subscription if not ready yet
  if (!isSubscribed) {
    // Wait up to 5 seconds for subscription
    const maxWait = 5000;
    const startTime = Date.now();
    while (!isSubscribed && (Date.now() - startTime) < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!isSubscribed) {
      console.warn('Presence update skipped: subscription not ready');
      return;
    }
  }
  
  try {
    await presenceChannel.track({
      userId: currentUserId,
      ...updates,
    });
  } catch (error) {
    console.error('Error updating presence:', error);
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
    initialPresenceData = null;
    isSubscribed = false;
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
