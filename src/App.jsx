import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Star, Calendar, Phone, Users, Target, Award, TrendingUp, Settings, Plus, Minus, Trash2, Edit2, Check, X, MessageSquare, ThumbsUp, Search, Download, Wifi, WifiOff, Bot, Send } from 'lucide-react';
import './storage'; // Initialize IndexedDB storage adapter
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { 
  syncAllFromSupabase, 
  queueSyncOperation, 
  initSyncQueue, 
  startSyncInterval, 
  stopSyncInterval 
} from './lib/sync';
import {
  initializePresence,
  updatePresence,
  cleanupPresence,
  getPresenceState
} from './lib/presence';
import {
  getAIResponse,
  isAIConfigured,
  getRemainingRequests
} from './lib/ai';

// ========================================
// THEME & CONSTANTS
// ========================================

const THEME = {
  primary: '#0056A4',
  primaryDark: '#003D73',
  primaryLight: '#4A90D9',
  secondary: '#F5F7FA',
  accent: '#E8F4FD',
  success: '#28A745',
  warning: '#FFC107',
  danger: '#DC3545',
  white: '#FFFFFF',
  text: '#1A1A2E',
  textLight: '#6B7280',
  border: '#E5E7EB',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
};

const CATEGORIES = [
  { id: 'reviews', name: 'Reviews', icon: Star, color: THEME.warning, defaultGoal: 5 },
  { id: 'demos', name: 'Demos', icon: Calendar, color: THEME.success, defaultGoal: 3 },
  { id: 'callbacks', name: 'Callbacks', icon: Phone, color: THEME.primary, defaultGoal: 10 },
];

const PRODUCT_INTERESTS = [
  { id: 'windows', label: 'Windows', color: '#0056A4' },
  { id: 'doors', label: 'Doors', color: '#28A745' },
  { id: 'siding', label: 'Siding', color: '#6B7280' },
  { id: 'roof', label: 'Roof', color: '#DC3545' },
  { id: 'gutters', label: 'Gutters', color: '#17A2B8' },
  { id: 'flooring', label: 'Flooring', color: '#8B4513' },
  { id: 'bathroom', label: 'Bathroom', color: '#9333EA' },
  { id: 'solar', label: 'Solar', color: '#F59E0B' },
];

// ========================================
// VALIDATION UTILITIES
// ========================================

const VALIDATIONS = {
  userName: (name) => {
    if (!name || typeof name !== 'string') return 'Name is required';
    const trimmed = name.trim();
    if (trimmed.length === 0) return 'Name cannot be empty';
    if (trimmed.length > 50) return 'Name must be under 50 characters';
    if (!/^[a-zA-Z0-9\s\-']+$/.test(trimmed)) return 'Name contains invalid characters';
    return null;
  },
  
  goalValue: (value) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return 'Must be a valid number';
    if (num < 0) return 'Must be positive';
    if (num > 100) return 'Maximum goal is 100';
    return null;
  },
  
  date: (dateString) => {
    if (!dateString) return null; // Optional
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    if (date > new Date()) return 'Date cannot be in the future';
    const minDate = new Date('2020-01-01');
    if (date < minDate) return 'Date too far in the past';
    return null;
  },
  
  customerName: (name) => {
    if (!name || typeof name !== 'string') return 'Customer name is required';
    const trimmed = name.trim();
    if (trimmed.length === 0) return 'Customer name cannot be empty';
    if (trimmed.length > 100) return 'Customer name too long';
    return null;
  },
  
  notes: (notes) => {
    if (!notes) return null; // Optional
    if (typeof notes !== 'string') return 'Notes must be text';
    if (notes.length > 500) return 'Notes must be under 500 characters';
    return null;
  },
  
  postContent: (content) => {
    if (!content || typeof content !== 'string') return 'Post content is required';
    const trimmed = content.trim();
    if (trimmed.length === 0) return 'Post cannot be empty';
    if (trimmed.length > 500) return 'Post must be under 500 characters';
    return null;
  },
  
  comment: (content) => {
    if (!content || typeof content !== 'string') return 'Comment is required';
    const trimmed = content.trim();
    if (trimmed.length === 0) return 'Comment cannot be empty';
    if (trimmed.length > 300) return 'Comment must be under 300 characters';
    return null;
  },
};

const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

// ========================================
// STORAGE UTILITIES WITH HARDENING
// ========================================

// Storage wrapper - uses window.storage (IndexedDB adapter)
const storage = {
  async get(key, defaultValue = null) {
    try {
      if (!window.storage) {
        console.warn('Storage not initialized, using default value');
        return defaultValue;
      }
      const result = await window.storage.get(key, defaultValue);
      // IndexedDB adapter already returns parsed JSON
      return result !== null && result !== undefined ? result : defaultValue;
    } catch (error) {
      console.error(`Storage get error for ${key}:`, error);
      return defaultValue;
    }
  },
  
  async set(key, value, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (!window.storage) {
          console.warn('Storage not initialized, cannot save');
          return false;
        }
        await window.storage.set(key, value, retries);
        return true;
      } catch (error) {
        console.error(`Storage set error for ${key} (attempt ${attempt}):`, error);
        if (attempt === retries) {
          throw new Error(`Failed to save ${key} after ${retries} attempts`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    return false;
  },
  
  async delete(key) {
    try {
      if (!window.storage) {
        console.warn('Storage not initialized, cannot delete');
        return false;
      }
      await window.storage.delete(key);
      return true;
    } catch (error) {
      console.error(`Storage delete error for ${key}:`, error);
      return false;
    }
  },
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

const getToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  const weekStart = new Date(now.setDate(diff));
  return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
};

const getMonthStart = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};


// ========================================
// MAIN COMPONENT
// ========================================

export default function WindowDepotTracker() {
  // ========================================
  // STATE MANAGEMENT
  // ========================================
  
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [dailyLogs, setDailyLogs] = useState({});
  const [appointments, setAppointments] = useState([]);
  const [feed, setFeed] = useState([]);
  const [activeView, setActiveView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [toast, setToast] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rememberUser, setRememberUser] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  
  // Refs for initialization tracking
  const hasInitialized = useRef(false);
  const initAttempts = useRef(0);
  const subscriptionsRef = useRef([]);
  const presenceChannelRef = useRef(null);
  
  // ========================================
  // INITIALIZATION & DATA LOADING
  // ========================================
  
  useEffect(() => {
    const initializeApp = async () => {
      if (hasInitialized.current) return;
      
      try {
        setIsLoading(true);
        
        // Initialize sync queue
        await initSyncQueue();
        startSyncInterval();
        
        // Try to sync from Supabase first (if online and configured)
        let syncedData = null;
        if (navigator.onLine && isSupabaseConfigured) {
          try {
            syncedData = await syncAllFromSupabase();
          } catch (error) {
            console.error('Supabase sync failed, using local data:', error);
          }
        }
        
        // Load all data with timeout protection (from IndexedDB, which may have been updated by sync)
        const loadPromises = [
          storage.get('users', []),
          storage.get('dailyLogs', {}),
          storage.get('appointments', []),
          storage.get('feed', []),
          storage.get('currentUser', null),
          storage.get('rememberUser', false),
        ];
        
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Load timeout')), 10000)
        );
        
        const results = await Promise.race([
          Promise.all(loadPromises),
          timeout
        ]);
        
        const [loadedUsers, loadedLogs, loadedAppts, loadedFeed, savedUser, shouldRemember] = results;
        
        // Use synced data if available, otherwise use local
        const finalUsers = syncedData?.users || loadedUsers || [];
        setUsers(finalUsers);
        setDailyLogs(syncedData?.dailyLogs || loadedLogs || {});
        setAppointments(syncedData?.appointments || loadedAppts || []);
        setFeed(syncedData?.feed || loadedFeed || []);
        setRememberUser(shouldRemember || false);
        
        // Restore current user from synced users if remembered
        if (shouldRemember && savedUser) {
          // Find the user in the synced users array by ID to ensure we have the latest data
          const foundUser = finalUsers.find(u => u.id === savedUser.id);
          if (foundUser) {
            setCurrentUser(foundUser);
          } else if (savedUser) {
            // If user not found in synced data, use saved user (might be local-only)
            setCurrentUser(savedUser);
          }
        }
        
        // Initialization complete - wait a bit before allowing saves
        await new Promise(resolve => setTimeout(resolve, 500));
        hasInitialized.current = true;
        setIsInitialized(true); // Trigger real-time subscriptions
        
        showToast('App loaded successfully', 'success');
      } catch (error) {
        console.error('Initialization error:', error);
        initAttempts.current++;
        
        if (initAttempts.current < 3) {
          showToast('Retrying initialization...', 'warning');
          setTimeout(initializeApp, 2000);
        } else {
          showToast('Failed to load data. Starting fresh.', 'error');
          hasInitialized.current = true;
          setIsInitialized(true);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeApp();
    
    // Cleanup on unmount
    return () => {
      stopSyncInterval();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // ========================================
  // ONLINE/OFFLINE DETECTION
  // ========================================
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Back online', 'success');
      // Process sync queue when coming back online
      import('./lib/sync').then(({ processSyncQueue }) => {
        processSyncQueue();
      });
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      showToast('You are offline. Changes may not save.', 'warning');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // ========================================
  // REAL-TIME SUBSCRIPTIONS
  // ========================================
  
  useEffect(() => {
    if (!isInitialized || !isOnline || !isSupabaseConfigured) {
      console.log('Real-time subscriptions: waiting for initialization, online status, or Supabase config', { 
        isInitialized, 
        isOnline, 
        isSupabaseConfigured 
      });
      return;
    }
    
    console.log('Setting up real-time subscriptions...');
    
    // Clear any existing subscriptions
    subscriptionsRef.current.forEach(sub => {
      if (sub && typeof sub.unsubscribe === 'function') {
        sub.unsubscribe();
      }
    });
    subscriptionsRef.current = [];
    
    // Subscribe to feed_posts changes
    const feedSubscription = supabase
      .channel('feed_posts_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'feed_posts' },
        async (payload) => {
          console.log('Feed post change received!', payload);
          // Reload feed from Supabase
          const { syncFeedFromSupabase } = await import('./lib/sync');
          const updatedFeed = await syncFeedFromSupabase();
          if (updatedFeed) {
            setFeed(updatedFeed);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Feed posts subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Feed posts subscription active');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Feed posts subscription failed:', err);
        }
      });
    subscriptionsRef.current.push(feedSubscription);
    
    // Subscribe to feed_likes changes
    const likesSubscription = supabase
      .channel('feed_likes_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'feed_likes' },
        async (payload) => {
          console.log('Feed like change received!', payload);
          // Reload feed to get updated likes
          const { syncFeedFromSupabase } = await import('./lib/sync');
          const updatedFeed = await syncFeedFromSupabase();
          if (updatedFeed) {
            setFeed(updatedFeed);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Feed likes subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Feed likes subscription active');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Feed likes subscription failed:', err);
        }
      });
    subscriptionsRef.current.push(likesSubscription);
    
    // Subscribe to feed_comments changes
    const commentsSubscription = supabase
      .channel('feed_comments_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'feed_comments' },
        async (payload) => {
          console.log('Feed comment change received!', payload);
          // Reload feed to get updated comments
          const { syncFeedFromSupabase } = await import('./lib/sync');
          const updatedFeed = await syncFeedFromSupabase();
          if (updatedFeed) {
            setFeed(updatedFeed);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Feed comments subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Feed comments subscription active');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Feed comments subscription failed:', err);
        }
      });
    subscriptionsRef.current.push(commentsSubscription);
    
    // Subscribe to daily_logs changes
    const dailyLogsSubscription = supabase
      .channel('daily_logs_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'daily_logs' },
        async (payload) => {
          console.log('Daily log change received!', payload);
          // Reload daily logs from Supabase
          const { syncDailyLogsFromSupabase } = await import('./lib/sync');
          const updatedLogs = await syncDailyLogsFromSupabase();
          if (updatedLogs) {
            setDailyLogs(updatedLogs);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Daily logs subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Daily logs subscription active');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Daily logs subscription failed:', err);
        }
      });
    subscriptionsRef.current.push(dailyLogsSubscription);
    
    // Subscribe to appointments changes
    const appointmentsSubscription = supabase
      .channel('appointments_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        async (payload) => {
          console.log('Appointment change received!', payload);
          // Reload appointments from Supabase
          const { syncAppointmentsFromSupabase } = await import('./lib/sync');
          const updatedAppts = await syncAppointmentsFromSupabase();
          if (updatedAppts) {
            setAppointments(updatedAppts);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Appointments subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Appointments subscription active');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Appointments subscription failed:', err);
        }
      });
    subscriptionsRef.current.push(appointmentsSubscription);
    
    // Subscribe to users changes
    const usersSubscription = supabase
      .channel('users_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        async (payload) => {
          console.log('User change received!', payload);
          // Reload users from Supabase
          const { syncUsersFromSupabase } = await import('./lib/sync');
          const updatedUsers = await syncUsersFromSupabase();
          if (updatedUsers) {
            setUsers(updatedUsers);
            // If current user was updated, update it too
            if (currentUser) {
              const updatedCurrentUser = updatedUsers.find(u => u.id === currentUser.id);
              if (updatedCurrentUser) {
                setCurrentUser(updatedCurrentUser);
              }
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log('Users subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Users subscription active');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('❌ Users subscription failed:', err);
        }
      });
    subscriptionsRef.current.push(usersSubscription);
    
    console.log('Real-time subscriptions set up successfully');
    
    // Cleanup subscriptions on unmount
    return () => {
      console.log('Cleaning up real-time subscriptions');
      subscriptionsRef.current.forEach(sub => {
        if (sub && typeof sub.unsubscribe === 'function') {
          sub.unsubscribe();
        }
      });
      subscriptionsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, isOnline, isSupabaseConfigured]);
  
  // ========================================
  // PRESENCE TRACKING
  // ========================================
  
  useEffect(() => {
    if (!currentUser || !isInitialized || !isOnline || !isSupabaseConfigured) {
      return;
    }
    
    // Initialize presence when user is set
    const setupPresence = async () => {
      try {
        const channel = await initializePresence(
          currentUser.id,
          currentUser.name,
          currentUser.role
        );
        presenceChannelRef.current = channel;
        
        if (channel) {
          // Set up presence event listeners
          channel
            .on('presence', { event: 'sync' }, () => {
              const activeUsersList = getPresenceState();
              setActiveUsers(activeUsersList);
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
              console.log('User joined:', newPresences);
              const activeUsersList = getPresenceState();
              setActiveUsers(activeUsersList);
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
              console.log('User left:', leftPresences);
              const activeUsersList = getPresenceState();
              setActiveUsers(activeUsersList);
            });
        }
      } catch (error) {
        console.error('Failed to initialize presence:', error);
      }
    };
    
    setupPresence();
    
    // Cleanup on unmount or user change
    return () => {
      cleanupPresence();
      presenceChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, isInitialized, isOnline, isSupabaseConfigured]);
  
  // Update presence when view changes
  useEffect(() => {
    if (currentUser && presenceChannelRef.current) {
      updatePresence({ currentView: activeView });
    }
  }, [activeView, currentUser]);
  
  // ========================================
  // AUTO-SAVE WITH DEBOUNCING
  // ========================================
  
  useEffect(() => {
    if (!hasInitialized.current || !isOnline) return;
    
    const saveTimeout = setTimeout(async () => {
      try {
        await storage.set('users', users);
      } catch (error) {
        console.error('Auto-save users failed:', error);
      }
    }, 1000);
    
    return () => clearTimeout(saveTimeout);
  }, [users, isOnline]);
  
  useEffect(() => {
    if (!hasInitialized.current || !isOnline) return;
    
    const saveTimeout = setTimeout(async () => {
      try {
        await storage.set('dailyLogs', dailyLogs);
      } catch (error) {
        console.error('Auto-save logs failed:', error);
      }
    }, 1000);
    
    return () => clearTimeout(saveTimeout);
  }, [dailyLogs, isOnline]);
  
  useEffect(() => {
    if (!hasInitialized.current || !isOnline) return;
    
    const saveTimeout = setTimeout(async () => {
      try {
        await storage.set('appointments', appointments);
      } catch (error) {
        console.error('Auto-save appointments failed:', error);
      }
    }, 1000);
    
    return () => clearTimeout(saveTimeout);
  }, [appointments, isOnline]);
  
  useEffect(() => {
    if (!hasInitialized.current || !isOnline) return;
    
    const saveTimeout = setTimeout(async () => {
      try {
        await storage.set('feed', feed);
      } catch (error) {
        console.error('Auto-save feed failed:', error);
      }
    }, 1000);
    
    return () => clearTimeout(saveTimeout);
  }, [feed, isOnline]);
  
  useEffect(() => {
    if (!hasInitialized.current) return;
    
    const saveTimeout = setTimeout(async () => {
      try {
        if (rememberUser) {
          await storage.set('currentUser', currentUser);
        }
        await storage.set('rememberUser', rememberUser);
      } catch (error) {
        console.error('Auto-save user preference failed:', error);
      }
    }, 500);
    
    return () => clearTimeout(saveTimeout);
  }, [currentUser, rememberUser]);
  
  // ========================================
  // TOAST NOTIFICATION SYSTEM
  // ========================================
  
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  
  // ========================================
  // USER MANAGEMENT
  // ========================================
  
  const createUser = useCallback(async (name, role) => {
    const validationError = VALIDATIONS.userName(name);
    if (validationError) {
      showToast(validationError, 'error');
      return false;
    }
    
    const sanitizedName = sanitizeInput(name);
    
    if (users.some(u => u.name.toLowerCase() === sanitizedName.toLowerCase())) {
      showToast('User with this name already exists', 'error');
      return false;
    }
    
    const goals = {
      reviews: 5,
      demos: 3,
      callbacks: 10,
    };
    
    try {
      // Insert into Supabase if configured and online
      if (navigator.onLine && isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('users')
          .insert({
            name: sanitizedName,
            role: role || 'employee',
            goals: goals,
          })
          .select()
          .single();

        if (error) throw error;

        const newUser = {
          id: data.id,
          name: data.name,
          role: data.role,
          goals: data.goals,
          createdAt: data.created_at,
        };

        const updatedUsers = [...users, newUser];
        setUsers(updatedUsers);
        setCurrentUser(newUser);
        await storage.set('users', updatedUsers);
        showToast(`Welcome, ${sanitizedName}!`, 'success');
        return true;
      } else {
        // Offline or Supabase not configured: create with temporary ID, queue for sync
        const tempId = `temp_${Date.now()}`;
        const newUser = {
          id: tempId,
          name: sanitizedName,
          role: role || 'employee',
          goals: goals,
          createdAt: new Date().toISOString(),
        };

        const updatedUsers = [...users, newUser];
        setUsers(updatedUsers);
        setCurrentUser(newUser);
        await storage.set('users', updatedUsers);

        // Queue for sync when both online and configured
        if (isSupabaseConfigured) {
          await queueSyncOperation({
            type: 'insert',
            table: 'users',
            data: {
              name: sanitizedName,
              role: role || 'employee',
              goals: goals,
            },
          });
        }

        showToast(`Welcome, ${sanitizedName}!`, 'success');
        return true;
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      showToast('Failed to create user. Please try again.', 'error');
      return false;
    }
  }, [users, showToast]);
  
  const deleteUser = useCallback(async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? All their data will be lost.')) {
      return;
    }
    
    try {
      // Delete from Supabase (cascade will handle related data)
      if (navigator.onLine && isSupabaseConfigured && !userId.startsWith('temp_')) {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId);

        if (error) throw error;
      } else if (isSupabaseConfigured && !userId.startsWith('temp_')) {
        // Queue for sync if offline
        await queueSyncOperation({
          type: 'delete',
          table: 'users',
          id: userId,
        });
      }
      
      // Compute updated data first
      const updatedUsers = users.filter(u => u.id !== userId);
      const updatedDailyLogs = { ...dailyLogs };
      Object.keys(updatedDailyLogs).forEach(date => {
        if (updatedDailyLogs[date][userId]) {
          delete updatedDailyLogs[date][userId];
        }
      });
      const updatedAppointments = appointments.filter(a => a.userId !== userId);
      const updatedFeed = feed.filter(p => p.userId !== userId);

      // Update state
      setUsers(updatedUsers);
      setDailyLogs(updatedDailyLogs);
      setAppointments(updatedAppointments);
      setFeed(updatedFeed);

      // Update storage with the same computed values
      await storage.set('users', updatedUsers);
      await storage.set('dailyLogs', updatedDailyLogs);
      await storage.set('appointments', updatedAppointments);
      await storage.set('feed', updatedFeed);
      
      if (currentUser?.id === userId) {
        setCurrentUser(null);
      }
      
      showToast('User deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete user:', error);
      showToast('Failed to delete user', 'error');
    }
  }, [currentUser, showToast, users, dailyLogs, appointments, feed]);
  
  const updateUserGoals = useCallback(async (userId, goals) => {
    const errors = [];
    
    Object.entries(goals).forEach(([key, value]) => {
      const error = VALIDATIONS.goalValue(value);
      if (error) errors.push(`${key}: ${error}`);
    });
    
    if (errors.length > 0) {
      showToast(errors[0], 'error');
      return;
    }
    
    try {
      const updatedUsers = users.map(u => 
        u.id === userId ? { ...u, goals: { ...u.goals, ...goals } } : u
      );
      const updatedUser = updatedUsers.find(u => u.id === userId);
      
      setUsers(updatedUsers);
      await storage.set('users', updatedUsers);
      
      // Update in Supabase
      if (navigator.onLine && isSupabaseConfigured && !userId.startsWith('temp_')) {
        const { error } = await supabase
          .from('users')
          .update({ goals: updatedUser.goals })
          .eq('id', userId);
        
        if (error) throw error;
      } else if (isSupabaseConfigured && !userId.startsWith('temp_')) {
        // Queue for sync if offline
        await queueSyncOperation({
          type: 'update',
          table: 'users',
          id: userId,
          data: { goals: updatedUser.goals },
        });
      }
      
      showToast('Goals updated successfully', 'success');
    } catch (error) {
      console.error('Failed to update goals:', error);
      showToast('Failed to update goals', 'error');
    }
  }, [showToast, users]);
  
  // ========================================
  // TRACKING FUNCTIONS
  // ========================================
  
  const handleIncrement = useCallback(async (category) => {
    if (!currentUser) return;
    
    const today = getToday();
    const currentCount = dailyLogs[today]?.[currentUser.id]?.[category] || 0;
    const goal = currentUser.goals[category];
    const newCount = currentCount + 1;
    
    // Update local state immediately
    const updatedLogs = {
      ...dailyLogs,
      [today]: {
        ...dailyLogs[today],
        [currentUser.id]: {
          ...dailyLogs[today]?.[currentUser.id],
          [category]: newCount,
        },
      },
    };
    
    setDailyLogs(updatedLogs);
    await storage.set('dailyLogs', updatedLogs);
    
    // Sync to Supabase
    try {
      if (navigator.onLine && isSupabaseConfigured && !currentUser.id.startsWith('temp_')) {
        const { error } = await supabase
          .from('daily_logs')
          .upsert({
            user_id: currentUser.id,
            date: today,
            category: category,
            count: newCount,
          }, {
            onConflict: 'user_id,date,category',
          });
        
        if (error) throw error;
      } else if (isSupabaseConfigured && !currentUser.id.startsWith('temp_')) {
        // Queue for sync if offline
        await queueSyncOperation({
          type: 'upsert',
          table: 'daily_logs',
          conflictKey: 'user_id,date,category',
          data: {
            user_id: currentUser.id,
            date: today,
            category: category,
            count: newCount,
          },
        });
      }
    } catch (error) {
      console.error('Failed to sync daily log:', error);
    }
    
    // Auto-post to feed for reviews and callbacks
    if (category === 'reviews' || category === 'callbacks') {
      const messages = {
        reviews: [
          `🌟 ${currentUser.name} got a review!`,
          `⭐ ${currentUser.name} secured another review!`,
          `✨ ${currentUser.name} is collecting reviews!`,
        ],
        callbacks: [
          `📞 ${currentUser.name} made a callback!`,
          `☎️ ${currentUser.name} completed a callback!`,
          `💬 ${currentUser.name} is reaching out!`,
        ],
      };
      
      const messageList = messages[category];
      const message = messageList[Math.floor(Math.random() * messageList.length)];
      
      // Create post in Supabase
      try {
        if (navigator.onLine && isSupabaseConfigured && !currentUser.id.startsWith('temp_')) {
          const { data: postData, error: postError } = await supabase
            .from('feed_posts')
            .insert({
              user_id: currentUser.id,
              content: sanitizeInput(message),
              type: 'auto',
            })
            .select(`
              *,
              user:users(name)
            `)
            .single();
          
          if (!postError && postData) {
            const newPost = {
              id: postData.id,
              userId: postData.user_id,
              userName: postData.user?.name || currentUser.name,
              content: postData.content,
              timestamp: new Date(postData.created_at).getTime(),
              likes: [],
              comments: [],
              isAuto: true,
            };
            const updatedFeed = [newPost, ...feed];
            setFeed(updatedFeed);
            await storage.set('feed', updatedFeed);
          }
        } else {
          // Offline: create local post, queue for sync
          const tempPostId = `temp_${Date.now()}`;
          const newPost = {
            id: tempPostId,
            userId: currentUser.id,
            userName: currentUser.name,
            content: sanitizeInput(message),
            timestamp: Date.now(),
            likes: [],
            comments: [],
            isAuto: true,
          };
          const updatedFeed = [newPost, ...feed];
          setFeed(updatedFeed);
          await storage.set('feed', updatedFeed);
          
          if (!currentUser.id.startsWith('temp_')) {
            await queueSyncOperation({
              type: 'insert',
              table: 'feed_posts',
              data: {
                user_id: currentUser.id,
                content: sanitizeInput(message),
                type: 'auto',
              },
            });
          }
        }
      } catch (error) {
        console.error('Failed to create feed post:', error);
      }
    }
    
    // Check for goal completion
    if (newCount === goal) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
      showToast(`🎉 ${category} goal complete!`, 'success');
    }
  }, [currentUser, dailyLogs, showToast, feed]);
  
  const handleDecrement = useCallback(async (category) => {
    if (!currentUser) return;
    
    const today = getToday();
    const currentCount = dailyLogs[today]?.[currentUser.id]?.[category] || 0;
    
    if (currentCount === 0) return;
    
    // Confirmation for large decrements
    if (currentCount > 5) {
      if (!window.confirm(`Are you sure you want to decrease ${category} from ${currentCount} to ${currentCount - 1}?`)) {
        return;
      }
    }
    
    const newCount = Math.max(0, currentCount - 1);
    
    // Update local state immediately
    const updatedLogs = {
      ...dailyLogs,
      [today]: {
        ...dailyLogs[today],
        [currentUser.id]: {
          ...dailyLogs[today]?.[currentUser.id],
          [category]: newCount,
        },
      },
    };
    
    setDailyLogs(updatedLogs);
    await storage.set('dailyLogs', updatedLogs);
    
    // Sync to Supabase
    try {
      if (navigator.onLine && isSupabaseConfigured && !currentUser.id.startsWith('temp_')) {
        const { error } = await supabase
          .from('daily_logs')
          .upsert({
            user_id: currentUser.id,
            date: today,
            category: category,
            count: newCount,
          }, {
            onConflict: 'user_id,date,category',
          });
        
        if (error) throw error;
      } else if (isSupabaseConfigured && !currentUser.id.startsWith('temp_')) {
        // Queue for sync if offline
        await queueSyncOperation({
          type: 'upsert',
          table: 'daily_logs',
          conflictKey: 'user_id,date,category',
          data: {
            user_id: currentUser.id,
            date: today,
            category: category,
            count: newCount,
          },
        });
      }
    } catch (error) {
      console.error('Failed to sync daily log:', error);
    }
  }, [currentUser, dailyLogs]);
  
  // ========================================
  // APPOINTMENT MANAGEMENT
  // ========================================
  
  const addAppointment = useCallback(async (appointmentData) => {
    const validationError = VALIDATIONS.customerName(appointmentData.customerName);
    if (validationError) {
      showToast(validationError, 'error');
      return false;
    }
    
    const dateError = VALIDATIONS.date(appointmentData.date);
    if (dateError) {
      showToast(dateError, 'error');
      return false;
    }
    
    const notesError = VALIDATIONS.notes(appointmentData.notes);
    if (notesError) {
      showToast(notesError, 'error');
      return false;
    }
    
    try {
      const appointmentDate = appointmentData.date || getToday();
      const appointmentDataForDB = {
        user_id: currentUser.id,
        customer_name: sanitizeInput(appointmentData.customerName),
        products: appointmentData.products || [],
        notes: sanitizeInput(appointmentData.notes || ''),
        date: appointmentDate,
        time: appointmentData.time || null,
        counts_as_demo: appointmentData.countsAsDemo !== false,
      };
      
      let newAppt;
      
      // Insert into Supabase
      if (navigator.onLine && isSupabaseConfigured && !currentUser.id.startsWith('temp_')) {
        const { data, error } = await supabase
          .from('appointments')
          .insert(appointmentDataForDB)
          .select()
          .single();
        
        if (error) throw error;
        
        newAppt = {
          id: data.id,
          userId: data.user_id,
          userName: currentUser.name,
          customerName: data.customer_name,
          products: data.products || [],
          notes: data.notes || '',
          date: data.date,
          time: data.time,
          timestamp: new Date(data.created_at).getTime(),
          countsAsDemo: data.counts_as_demo,
        };
      } else {
        // Offline: create with temporary ID
        const tempId = `temp_${Date.now()}`;
        newAppt = {
          id: tempId,
          userId: currentUser.id,
          userName: currentUser.name,
          customerName: sanitizeInput(appointmentData.customerName),
          products: appointmentData.products || [],
          notes: sanitizeInput(appointmentData.notes || ''),
          date: appointmentDate,
          time: appointmentData.time,
          timestamp: Date.now(),
          countsAsDemo: appointmentData.countsAsDemo !== false,
        };
        
        // Queue for sync
        if (!currentUser.id.startsWith('temp_')) {
          await queueSyncOperation({
            type: 'insert',
            table: 'appointments',
            data: appointmentDataForDB,
          });
        }
      }
      
      const updatedAppointments = [newAppt, ...appointments];
      setAppointments(updatedAppointments);
      await storage.set('appointments', updatedAppointments);
      
      // If counts as demo, increment demo count
      if (newAppt.countsAsDemo) {
        await handleIncrement('demos');
      }
      
      showToast('Appointment logged successfully', 'success');
      return true;
    } catch (error) {
      console.error('Failed to add appointment:', error);
      showToast('Failed to add appointment', 'error');
      return false;
    }
  }, [currentUser, showToast, handleIncrement, appointments]);
  
  const deleteAppointment = useCallback(async (apptId) => {
    if (!window.confirm('Delete this appointment?')) return;
    
    try {
      // Delete from Supabase
      if (navigator.onLine && isSupabaseConfigured && !apptId.startsWith('temp_')) {
        const { error } = await supabase
          .from('appointments')
          .delete()
          .eq('id', apptId);
        
        if (error) throw error;
      } else if (isSupabaseConfigured && !apptId.startsWith('temp_')) {
        // Queue for sync if offline
        await queueSyncOperation({
          type: 'delete',
          table: 'appointments',
          id: apptId,
        });
      }
      
      const updatedAppointments = appointments.filter(a => a.id !== apptId);
      setAppointments(updatedAppointments);
      await storage.set('appointments', updatedAppointments);
      showToast('Appointment deleted', 'success');
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      showToast('Failed to delete appointment', 'error');
    }
  }, [showToast, appointments]);
  
  // ========================================
  // FEED MANAGEMENT
  // ========================================
  
  const addPost = useCallback(async (content) => {
    const validationError = VALIDATIONS.postContent(content);
    if (validationError) {
      showToast(validationError, 'error');
      return false;
    }
    
    try {
      const sanitizedContent = sanitizeInput(content);
      let newPost;
      
      // Insert into Supabase
      if (navigator.onLine && isSupabaseConfigured && !currentUser.id.startsWith('temp_')) {
        const { data, error } = await supabase
          .from('feed_posts')
          .insert({
            user_id: currentUser.id,
            content: sanitizedContent,
            type: 'manual',
          })
          .select(`
            *,
            user:users(name)
          `)
          .single();
        
        if (error) throw error;
        
        newPost = {
          id: data.id,
          userId: data.user_id,
          userName: data.user?.name || currentUser.name,
          content: data.content,
          timestamp: new Date(data.created_at).getTime(),
          likes: [],
          comments: [],
          isAuto: false,
        };
      } else {
        // Offline: create with temporary ID
        const tempId = `temp_${Date.now()}`;
        newPost = {
          id: tempId,
          userId: currentUser.id,
          userName: currentUser.name,
          content: sanitizedContent,
          timestamp: Date.now(),
          likes: [],
          comments: [],
          isAuto: false,
        };
        
        // Queue for sync
        if (!currentUser.id.startsWith('temp_')) {
          await queueSyncOperation({
            type: 'insert',
            table: 'feed_posts',
            data: {
              user_id: currentUser.id,
              content: sanitizedContent,
              type: 'manual',
            },
          });
        }
      }
      
      const updatedFeed = [newPost, ...feed];
      setFeed(updatedFeed);
      await storage.set('feed', updatedFeed);
      showToast('Post created', 'success');
      return true;
    } catch (error) {
      console.error('Failed to add post:', error);
      showToast('Failed to create post', 'error');
      return false;
    }
  }, [currentUser, showToast, feed]);
  
  const toggleLike = useCallback(async (postId) => {
    if (!currentUser) return;
    
    const post = feed.find(p => p.id === postId);
    if (!post) return;
    
    const likes = post.likes || [];
    const hasLiked = likes.includes(currentUser.id);
    
    try {
      if (navigator.onLine && !postId.startsWith('temp_') && !currentUser.id.startsWith('temp_')) {
        if (hasLiked) {
          // Remove like
          const { error } = await supabase
            .from('feed_likes')
            .delete()
            .eq('post_id', postId)
            .eq('user_id', currentUser.id);
          
          if (error) throw error;
        } else {
          // Add like
          const { error } = await supabase
            .from('feed_likes')
            .upsert({
              post_id: postId,
              user_id: currentUser.id,
            }, {
              onConflict: 'post_id,user_id',
            });
          
          if (error) throw error;
        }
      } else if (!postId.startsWith('temp_') && !currentUser.id.startsWith('temp_')) {
        // Queue for sync if offline
        await queueSyncOperation({
          type: hasLiked ? 'delete' : 'upsert',
          table: 'feed_likes',
          id: hasLiked ? postId : undefined,
          conflictKey: 'post_id,user_id',
          data: hasLiked ? undefined : {
            post_id: postId,
            user_id: currentUser.id,
          },
        });
      }
      
      // Update local state
      const updatedFeed = feed.map(p => {
        if (p.id !== postId) return p;
        return {
          ...p,
          likes: hasLiked 
            ? likes.filter(id => id !== currentUser.id)
            : [...likes, currentUser.id],
        };
      });
      
      setFeed(updatedFeed);
      await storage.set('feed', updatedFeed);
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  }, [currentUser, feed]);
  
  const addComment = useCallback(async (postId, content) => {
    const validationError = VALIDATIONS.comment(content);
    if (validationError) {
      showToast(validationError, 'error');
      return false;
    }
    
    try {
      const sanitizedContent = sanitizeInput(content);
      let newComment;
      
      // Insert into Supabase
      if (navigator.onLine && !postId.startsWith('temp_') && !currentUser.id.startsWith('temp_')) {
        const { data, error } = await supabase
          .from('feed_comments')
          .insert({
            post_id: postId,
            user_id: currentUser.id,
            content: sanitizedContent,
          })
          .select(`
            *,
            user:users(name)
          `)
          .single();
        
        if (error) throw error;
        
        newComment = {
          id: data.id,
          userId: data.user_id,
          userName: data.user?.name || currentUser.name,
          content: data.content,
          timestamp: new Date(data.created_at).getTime(),
        };
      } else {
        // Offline: create with temporary ID
        const tempId = `temp_${Date.now()}`;
        newComment = {
          id: tempId,
          userId: currentUser.id,
          userName: currentUser.name,
          content: sanitizedContent,
          timestamp: Date.now(),
        };
        
        // Queue for sync
        if (!postId.startsWith('temp_') && !currentUser.id.startsWith('temp_')) {
          await queueSyncOperation({
            type: 'insert',
            table: 'feed_comments',
            data: {
              post_id: postId,
              user_id: currentUser.id,
              content: sanitizedContent,
            },
          });
        }
      }
      
      const updatedFeed = feed.map(post => 
        post.id === postId 
          ? { ...post, comments: [...(post.comments || []), newComment] }
          : post
      );
      
      setFeed(updatedFeed);
      await storage.set('feed', updatedFeed);
      return true;
    } catch (error) {
      console.error('Failed to add comment:', error);
      showToast('Failed to add comment', 'error');
      return false;
    }
  }, [currentUser, showToast, feed]);
  
  const editPost = useCallback(async (postId, newContent) => {
    const validationError = VALIDATIONS.postContent(newContent);
    if (validationError) {
      showToast(validationError, 'error');
      return false;
    }

    const sanitizedContent = sanitizeInput(newContent);

    try {
      // Update in Supabase
      if (navigator.onLine && isSupabaseConfigured && !postId.startsWith('temp_')) {
        const { error } = await supabase
          .from('feed_posts')
          .update({ content: sanitizedContent })
          .eq('id', postId);

        if (error) throw error;
      } else if (isSupabaseConfigured && !postId.startsWith('temp_')) {
        // Queue for sync if offline
        await queueSyncOperation({
          type: 'update',
          table: 'feed_posts',
          id: postId,
          data: { content: sanitizedContent },
        });
      }

      // Update local state
      const updatedFeed = feed.map(post =>
        post.id === postId
          ? {
              ...post,
              content: sanitizedContent,
              edited: true,
              editedAt: Date.now(),
            }
          : post
      );

      setFeed(updatedFeed);
      await storage.set('feed', updatedFeed);

      showToast('Post updated', 'success');
      return true;
    } catch (error) {
      console.error('Failed to edit post:', error);
      showToast('Failed to update post', 'error');
      return false;
    }
  }, [showToast, feed]);
  
  const deletePost = useCallback(async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    
    try {
      // Delete from Supabase (cascade will handle likes and comments)
      if (navigator.onLine && isSupabaseConfigured && !postId.startsWith('temp_')) {
        const { error } = await supabase
          .from('feed_posts')
          .delete()
          .eq('id', postId);
        
        if (error) throw error;
      } else if (isSupabaseConfigured && !postId.startsWith('temp_')) {
        // Queue for sync if offline
        await queueSyncOperation({
          type: 'delete',
          table: 'feed_posts',
          id: postId,
        });
      }
      
      const updatedFeed = feed.filter(p => p.id !== postId);
      setFeed(updatedFeed);
      await storage.set('feed', updatedFeed);
      showToast('Post deleted', 'success');
    } catch (error) {
      console.error('Failed to delete post:', error);
      showToast('Failed to delete post', 'error');
    }
  }, [showToast, feed]);
  
  // ========================================
  // CALCULATED DATA
  // ========================================
  
  const todayStats = useMemo(() => {
    if (!currentUser) return { reviews: 0, demos: 0, callbacks: 0 };
    const today = getToday();
    return dailyLogs[today]?.[currentUser.id] || { reviews: 0, demos: 0, callbacks: 0 };
  }, [currentUser, dailyLogs]);
  
  const weekStats = useMemo(() => {
    if (!currentUser) return { reviews: 0, demos: 0, callbacks: 0 };
    
    const stats = { reviews: 0, demos: 0, callbacks: 0 };
    const weekStart = getWeekStart();
    
    Object.entries(dailyLogs).forEach(([date, users]) => {
      if (date >= weekStart && users[currentUser.id]) {
        stats.reviews += users[currentUser.id].reviews || 0;
        stats.demos += users[currentUser.id].demos || 0;
        stats.callbacks += users[currentUser.id].callbacks || 0;
      }
    });
    
    return stats;
  }, [currentUser, dailyLogs]);
  
  const leaderboard = useMemo(() => {
    const weekStart = getWeekStart();
    
    const scores = users.map(user => {
      let total = 0;
      
      Object.entries(dailyLogs).forEach(([date, usersData]) => {
        if (date >= weekStart && usersData[user.id]) {
          total += (usersData[user.id].reviews || 0);
          total += (usersData[user.id].demos || 0);
          total += (usersData[user.id].callbacks || 0);
        }
      });
      
      return { ...user, weeklyTotal: total };
    });
    
    return scores.sort((a, b) => b.weeklyTotal - a.weeklyTotal);
  }, [users, dailyLogs]);
  
  // ========================================
  // EXPORT FUNCTIONALITY
  // ========================================
  
  const exportData = useCallback(() => {
    try {
      const data = {
        users,
        dailyLogs,
        appointments,
        feed,
        exportDate: new Date().toISOString(),
        version: '1.0',
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `window-depot-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast('Data exported successfully', 'success');
    } catch (error) {
      showToast('Failed to export data', 'error');
    }
  }, [users, dailyLogs, appointments, feed, showToast]);
  
  // ========================================
  // RENDER: LOADING STATE
  // ========================================
  
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: THEME.secondary,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: `4px solid ${THEME.accent}`,
            borderTop: `4px solid ${THEME.primary}`,
            borderRadius: '50%',
            margin: '0 auto 20px',
            animation: 'spin 1s linear infinite',
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <div style={{ color: THEME.text, fontSize: '18px', fontWeight: '600' }}>
            Loading Window Depot Tracker...
          </div>
        </div>
      </div>
    );
  }
  
  // ========================================
  // RENDER: USER SELECTION
  // ========================================
  
  if (!currentUser) {
    return <UserSelection 
      users={users}
      onSelectUser={setCurrentUser}
      onCreateUser={createUser}
      rememberUser={rememberUser}
      onRememberChange={setRememberUser}
    />;
  }
  
  // ========================================
  // RENDER: MAIN APP
  // ========================================
  
  return (
    <div style={{
      minHeight: '100vh',
      background: THEME.secondary,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      paddingBottom: '80px',
    }}>
      {/* Offline Banner */}
      {!isOnline && (
        <div style={{
          background: THEME.warning,
          color: THEME.text,
          padding: '12px',
          textAlign: 'center',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}>
          <WifiOff size={20} />
          You're offline. Changes may not save.
        </div>
      )}
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          background: toast.type === 'success' ? THEME.success :
                     toast.type === 'error' ? THEME.danger :
                     toast.type === 'warning' ? THEME.warning :
                     THEME.primary,
          color: THEME.white,
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          maxWidth: '90vw',
          animation: 'slideIn 0.3s ease-out',
        }}>
          <style>{`
            @keyframes slideIn {
              from {
                transform: translateX(100%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
          `}</style>
          {toast.message}
        </div>
      )}
      
      {/* Celebration Animation */}
      {showCelebration && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <div style={{
            background: THEME.white,
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center',
            animation: 'scaleIn 0.3s ease-out',
          }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎉</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: THEME.primary }}>
              Goal Complete!
            </div>
          </div>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes scaleIn {
              from { transform: scale(0.5); }
              to { transform: scale(1); }
            }
          `}</style>
        </div>
      )}
      
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${THEME.primaryDark} 0%, ${THEME.primary} 100%)`,
        color: THEME.white,
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
            Window Depot Milwaukee
          </h1>
          {isOnline ? (
            <Wifi size={20} style={{ opacity: 0.8 }} />
          ) : (
            <WifiOff size={20} />
          )}
        </div>
        <div style={{ fontSize: '14px', opacity: 0.9 }}>
          Welcome, {currentUser.name}
        </div>
        <button
          onClick={() => {
            if (window.confirm('Switch user?')) {
              setCurrentUser(null);
            }
          }}
          style={{
            marginTop: '8px',
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '6px',
            color: THEME.white,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Switch User
        </button>
      </div>
      
      {/* Main Content */}
      <div style={{ padding: '20px' }}>
        {activeView === 'dashboard' && (
          <div style={{ display: 'grid', gap: '20px' }}>
            <Dashboard 
              currentUser={currentUser}
              todayStats={todayStats}
              weekStats={weekStats}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
            />
            <ActiveUsersList activeUsers={activeUsers} currentUser={currentUser} />
          </div>
        )}
        
        {activeView === 'goals' && (
          <Goals
            currentUser={currentUser}
            onUpdateGoals={(goals) => updateUserGoals(currentUser.id, goals)}
          />
        )}
        
        {activeView === 'appointments' && (
          <Appointments
            appointments={appointments.filter(a => a.userId === currentUser.id)}
            onAdd={addAppointment}
            onDelete={deleteAppointment}
          />
        )}
        
        {activeView === 'feed' && (
          <Feed
            feed={feed}
            currentUser={currentUser}
            onAddPost={addPost}
            onToggleLike={toggleLike}
            onAddComment={addComment}
            onEditPost={editPost}
            onDeletePost={deletePost}
          />
        )}
        
        {activeView === 'leaderboard' && (
          <Leaderboard leaderboard={leaderboard} currentUser={currentUser} />
        )}
        
        {activeView === 'team' && currentUser.role === 'manager' && (
          <TeamView users={users} dailyLogs={dailyLogs} />
        )}
        
        {activeView === 'admin' && currentUser.role === 'manager' && (
          <AdminPanel
            users={users}
            onCreateUser={createUser}
            onDeleteUser={deleteUser}
            onUpdateGoals={updateUserGoals}
            onExport={exportData}
          />
        )}
        
        {activeView === 'reports' && currentUser.role === 'manager' && (
          <Reports
            users={users}
            dailyLogs={dailyLogs}
            appointments={appointments}
          />
        )}
        
        {activeView === 'chatbot' && (
          <Chatbot
            currentUser={currentUser}
            todayStats={todayStats}
            weekStats={weekStats}
            onIncrement={handleIncrement}
          />
        )}
      </div>
      
      {/* Bottom Navigation */}
      <BottomNav
        activeView={activeView}
        onViewChange={setActiveView}
        isManager={currentUser.role === 'manager'}
      />
    </div>
  );
}

// ========================================
// USER SELECTION COMPONENT
// ========================================

function UserSelection({ users, onSelectUser, onCreateUser, rememberUser, onRememberChange }) {
  const [mode, setMode] = useState(users.length === 0 ? 'create' : 'select');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('employee');
  
  const handleCreate = () => {
    if (onCreateUser(newName, newRole)) {
      setNewName('');
    }
  };
  
  return (
    <div style={{
      minHeight: '100vh',
      background: THEME.secondary,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        background: THEME.white,
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '400px',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '32px',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: THEME.primary,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Target size={40} color={THEME.white} />
          </div>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: THEME.text,
          }}>
            Window Depot
          </h1>
          <p style={{
            margin: 0,
            fontSize: '16px',
            color: THEME.textLight,
          }}>
            Goal Tracker
          </p>
        </div>
        
        {users.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            background: THEME.secondary,
            padding: '4px',
            borderRadius: '8px',
          }}>
            <button
              onClick={() => setMode('select')}
              style={{
                flex: 1,
                padding: '12px',
                background: mode === 'select' ? THEME.white : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: mode === 'select' ? THEME.primary : THEME.textLight,
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Select User
            </button>
            <button
              onClick={() => setMode('create')}
              style={{
                flex: 1,
                padding: '12px',
                background: mode === 'create' ? THEME.white : 'transparent',
                border: 'none',
                borderRadius: '6px',
                color: mode === 'create' ? THEME.primary : THEME.textLight,
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Create New
            </button>
          </div>
        )}
        
        {mode === 'select' ? (
          <div>
            <div style={{ marginBottom: '16px' }}>
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => onSelectUser(user)}
                  style={{
                    width: '100%',
                    padding: '16px',
                    marginBottom: '8px',
                    background: THEME.secondary,
                    border: 'none',
                    borderRadius: '8px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={(e) => e.target.style.background = THEME.accent}
                  onMouseOut={(e) => e.target.style.background = THEME.secondary}
                >
                  <div style={{ fontWeight: '600', color: THEME.text, marginBottom: '4px' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: '14px', color: THEME.textLight }}>
                    {user.role === 'manager' ? '👔 Manager' : '👤 Employee'}
                  </div>
                </button>
              ))}
            </div>
            
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: THEME.textLight,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={rememberUser}
                onChange={(e) => onRememberChange(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              Remember my selection
            </label>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: THEME.text,
              }}>
                Your Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter your name"
                maxLength={50}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${THEME.border}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '600',
                color: THEME.text,
              }}>
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${THEME.border}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </div>
            
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              style={{
                width: '100%',
                padding: '16px',
                background: newName.trim() ? THEME.primary : THEME.border,
                border: 'none',
                borderRadius: '8px',
                color: THEME.white,
                fontSize: '16px',
                fontWeight: '600',
                cursor: newName.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              Get Started
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// DASHBOARD COMPONENT
// ========================================

function Dashboard({ currentUser, todayStats, weekStats, onIncrement, onDecrement }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700', color: THEME.text }}>
        Today's Progress
      </h2>
      
      <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
        {CATEGORIES.map(category => {
          const count = todayStats[category.id] || 0;
          const goal = currentUser.goals[category.id];
          const progress = (count / goal) * 100;
          const Icon = category.icon;
          
          return (
            <div
              key={category.id}
              style={{
                background: THEME.white,
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: category.color,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={24} color={THEME.white} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: THEME.text }}>
                    {category.name}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: category.color }}>
                    {count} / {goal}
                  </div>
                </div>
              </div>
              
              <div style={{
                height: '12px',
                background: THEME.secondary,
                borderRadius: '6px',
                overflow: 'hidden',
                marginBottom: '16px',
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(progress, 100)}%`,
                  background: category.color,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => onDecrement(category.id)}
                  disabled={count === 0}
                  style={{
                    flex: 1,
                    padding: '18px',
                    background: count === 0 ? THEME.border : THEME.danger,
                    border: 'none',
                    borderRadius: '8px',
                    color: THEME.white,
                    fontSize: '24px',
                    fontWeight: '700',
                    cursor: count === 0 ? 'not-allowed' : 'pointer',
                    minHeight: '72px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <Minus size={28} />
                </button>
                <button
                  onClick={() => onIncrement(category.id)}
                  style={{
                    flex: 1,
                    padding: '18px',
                    background: category.color,
                    border: 'none',
                    borderRadius: '8px',
                    color: THEME.white,
                    fontSize: '24px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    minHeight: '72px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <Plus size={28} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: THEME.text }}>
        This Week
      </h3>
      
      <div style={{
        background: THEME.white,
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        {CATEGORIES.map(category => {
          const count = weekStats[category.id] || 0;
          const Icon = category.icon;
          
          return (
            <div
              key={category.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 0',
                borderBottom: `1px solid ${THEME.border}`,
              }}
            >
              <Icon size={20} color={category.color} />
              <div style={{ flex: 1, fontSize: '14px', color: THEME.text }}>
                {category.name}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: category.color }}>
                {count}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========================================
// GOALS COMPONENT
// ========================================

function Goals({ currentUser, onUpdateGoals }) {
  const [goals, setGoals] = useState(currentUser.goals);
  
  const handleSave = () => {
    onUpdateGoals(goals);
  };
  
  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700', color: THEME.text }}>
        Daily Goals
      </h2>
      
      <div style={{
        background: THEME.white,
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        {CATEGORIES.map(category => {
          const Icon = category.icon;
          
          return (
            <div
              key={category.id}
              style={{
                marginBottom: '20px',
                paddingBottom: '20px',
                borderBottom: `1px solid ${THEME.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <Icon size={24} color={category.color} />
                <div style={{ flex: 1, fontSize: '16px', fontWeight: '600', color: THEME.text }}>
                  {category.name}
                </div>
              </div>
              
              <input
                type="number"
                min="0"
                max="100"
                value={goals[category.id] || 0}
                onChange={(e) => setGoals({ ...goals, [category.id]: parseInt(e.target.value) || 0 })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${THEME.border}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          );
        })}
        
        <button
          onClick={handleSave}
          style={{
            width: '100%',
            padding: '16px',
            background: THEME.primary,
            border: 'none',
            borderRadius: '8px',
            color: THEME.white,
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Save Goals
        </button>
      </div>
    </div>
  );
}

// ========================================
// APPOINTMENTS COMPONENT
// ========================================

function Appointments({ appointments, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    products: [],
    notes: '',
    date: getToday(),
    countsAsDemo: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  const handleSubmit = () => {
    if (onAdd(formData)) {
      setFormData({
        customerName: '',
        products: [],
        notes: '',
        date: getToday(),
        countsAsDemo: true,
      });
      setShowForm(false);
    }
  };
  
  const toggleProduct = (productId) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.includes(productId)
        ? prev.products.filter(p => p !== productId)
        : [...prev.products, productId],
    }));
  };
  
  const filteredAppointments = appointments.filter(appt =>
    appt.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: THEME.text }}>
          Appointments
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '12px 20px',
            background: THEME.primary,
            border: 'none',
            borderRadius: '8px',
            color: THEME.white,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Plus size={20} />
          Add Appointment
        </button>
      </div>
      
      {showForm && (
        <div style={{
          background: THEME.white,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: THEME.text }}>
              Customer Name
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              placeholder="Enter customer name"
              maxLength={100}
              style={{
                width: '100%',
                padding: '12px',
                border: `2px solid ${THEME.border}`,
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: THEME.text }}>
              Date
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              max={getToday()}
              style={{
                width: '100%',
                padding: '12px',
                border: `2px solid ${THEME.border}`,
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: THEME.text }}>
              Product Interests
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {PRODUCT_INTERESTS.map(product => (
                <button
                  key={product.id}
                  onClick={() => toggleProduct(product.id)}
                  style={{
                    padding: '12px',
                    background: formData.products.includes(product.id) ? product.color : THEME.secondary,
                    border: 'none',
                    borderRadius: '8px',
                    color: formData.products.includes(product.id) ? THEME.white : THEME.text,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {product.label}
                </button>
              ))}
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: THEME.text }}>
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any notes..."
              maxLength={500}
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                border: `2px solid ${THEME.border}`,
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>
          
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            fontSize: '14px',
            color: THEME.text,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={formData.countsAsDemo}
              onChange={(e) => setFormData({ ...formData, countsAsDemo: e.target.checked })}
              style={{ cursor: 'pointer' }}
            />
            Count as Demo
          </label>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSubmit}
              disabled={!formData.customerName.trim()}
              style={{
                flex: 1,
                padding: '16px',
                background: formData.customerName.trim() ? THEME.success : THEME.border,
                border: 'none',
                borderRadius: '8px',
                color: THEME.white,
                fontSize: '16px',
                fontWeight: '600',
                cursor: formData.customerName.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Save Appointment
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                flex: 1,
                padding: '16px',
                background: THEME.secondary,
                border: 'none',
                borderRadius: '8px',
                color: THEME.text,
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <div style={{ marginBottom: '16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={20} color={THEME.textLight} style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
          }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search appointments..."
            style={{
              width: '100%',
              padding: '12px 12px 12px 44px',
              border: `2px solid ${THEME.border}`,
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
      
      <div style={{ display: 'grid', gap: '12px' }}>
        {filteredAppointments.length === 0 ? (
          <div style={{
            background: THEME.white,
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            color: THEME.textLight,
          }}>
            {searchTerm ? 'No appointments match your search' : 'No appointments logged yet'}
          </div>
        ) : (
          filteredAppointments.map(appt => (
            <div
              key={appt.id}
              style={{
                background: THEME.white,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: THEME.text, marginBottom: '4px' }}>
                    {appt.customerName}
                  </div>
                  <div style={{ fontSize: '14px', color: THEME.textLight }}>
                    {formatDate(appt.date)}
                  </div>
                </div>
                <button
                  onClick={() => onDelete(appt.id)}
                  style={{
                    padding: '8px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={18} color={THEME.danger} />
                </button>
              </div>
              
              {appt.products && appt.products.length > 0 && (
                <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {appt.products.map(productId => {
                    const product = PRODUCT_INTERESTS.find(p => p.id === productId);
                    return product ? (
                      <span
                        key={productId}
                        style={{
                          padding: '4px 12px',
                          background: product.color,
                          color: THEME.white,
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {product.label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
              
              {appt.notes && (
                <div style={{
                  padding: '12px',
                  background: THEME.secondary,
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: THEME.text,
                  marginBottom: '8px',
                }}>
                  {appt.notes}
                </div>
              )}
              
              {appt.countsAsDemo && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  background: THEME.success,
                  color: THEME.white,
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}>
                  <Calendar size={14} />
                  Counted as Demo
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ========================================
// FEED COMPONENT
// ========================================

function Feed({ feed, currentUser, onAddPost, onToggleLike, onAddComment, onEditPost, onDeletePost }) {
  const [newPost, setNewPost] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [commentingId, setCommentingId] = useState(null);
  const [newComment, setNewComment] = useState('');
  
  const handlePost = () => {
    if (onAddPost(newPost)) {
      setNewPost('');
    }
  };
  
  const handleEdit = (postId) => {
    if (onEditPost(postId, editContent)) {
      setEditingId(null);
      setEditContent('');
    }
  };
  
  const handleComment = (postId) => {
    if (onAddComment(postId, newComment)) {
      setNewComment('');
      setCommentingId(null);
    }
  };
  
  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700', color: THEME.text }}>
        Team Feed
      </h2>
      
      <div style={{
        background: THEME.white,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Share an update with the team..."
          maxLength={500}
          rows={3}
          style={{
            width: '100%',
            padding: '12px',
            border: `2px solid ${THEME.border}`,
            borderRadius: '8px',
            fontSize: '16px',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            resize: 'vertical',
            marginBottom: '12px',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: THEME.textLight }}>
            {newPost.length}/500
          </span>
          <button
            onClick={handlePost}
            disabled={!newPost.trim()}
            style={{
              padding: '12px 24px',
              background: newPost.trim() ? THEME.primary : THEME.border,
              border: 'none',
              borderRadius: '8px',
              color: THEME.white,
              fontSize: '14px',
              fontWeight: '600',
              cursor: newPost.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Post
          </button>
        </div>
      </div>
      
      <div style={{ display: 'grid', gap: '16px' }}>
        {feed.length === 0 ? (
          <div style={{
            background: THEME.white,
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            color: THEME.textLight,
          }}>
            No posts yet. Be the first to share!
          </div>
        ) : (
          feed.map(post => (
            <div
              key={post.id}
              style={{
                background: THEME.white,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>
                    {post.userName}
                  </div>
                  <div style={{ fontSize: '12px', color: THEME.textLight }}>
                    {new Date(post.timestamp).toLocaleString()}
                    {post.edited && ' (edited)'}
                  </div>
                </div>
                {post.userId === currentUser.id && !post.isAuto && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        setEditingId(post.id);
                        setEditContent(post.content);
                      }}
                      style={{
                        padding: '4px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Edit2 size={16} color={THEME.textLight} />
                    </button>
                    <button
                      onClick={() => onDeletePost(post.id)}
                      style={{
                        padding: '4px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={16} color={THEME.danger} />
                    </button>
                  </div>
                )}
              </div>
              
              {editingId === post.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    maxLength={500}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: `2px solid ${THEME.border}`,
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      marginBottom: '8px',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEdit(post.id)}
                      style={{
                        padding: '8px 16px',
                        background: THEME.success,
                        border: 'none',
                        borderRadius: '6px',
                        color: THEME.white,
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setEditContent('');
                      }}
                      style={{
                        padding: '8px 16px',
                        background: THEME.secondary,
                        border: 'none',
                        borderRadius: '6px',
                        color: THEME.text,
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{
                  fontSize: '14px',
                  color: THEME.text,
                  marginBottom: '12px',
                  lineHeight: '1.5',
                }}>
                  {post.content}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '16px', paddingTop: '12px', borderTop: `1px solid ${THEME.border}` }}>
                <button
                  onClick={() => onToggleLike(post.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: (post.likes || []).includes(currentUser.id) ? THEME.accent : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: (post.likes || []).includes(currentUser.id) ? THEME.primary : THEME.textLight,
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  <ThumbsUp size={14} />
                  {(post.likes || []).length}
                </button>
                <button
                  onClick={() => setCommentingId(commentingId === post.id ? null : post.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: THEME.textLight,
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  <MessageSquare size={14} />
                  {(post.comments || []).length}
                </button>
              </div>
              
              {(post.comments || []).length > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${THEME.border}` }}>
                  {post.comments.map(comment => (
                    <div key={comment.id} style={{
                      padding: '8px 12px',
                      background: THEME.secondary,
                      borderRadius: '8px',
                      marginBottom: '8px',
                    }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: THEME.text, marginBottom: '4px' }}>
                        {comment.userName}
                      </div>
                      <div style={{ fontSize: '12px', color: THEME.text }}>
                        {comment.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {commentingId === post.id && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${THEME.border}` }}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    maxLength={300}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: `2px solid ${THEME.border}`,
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                      marginBottom: '8px',
                    }}
                  />
                  <button
                    onClick={() => handleComment(post.id)}
                    disabled={!newComment.trim()}
                    style={{
                      padding: '8px 16px',
                      background: newComment.trim() ? THEME.primary : THEME.border,
                      border: 'none',
                      borderRadius: '6px',
                      color: THEME.white,
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Comment
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ========================================
// LEADERBOARD COMPONENT
// ========================================

function Leaderboard({ leaderboard, currentUser }) {
  const medals = [THEME.gold, THEME.silver, THEME.bronze];
  
  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700', color: THEME.text }}>
        Weekly Leaderboard
      </h2>
      
      <div style={{ display: 'grid', gap: '12px' }}>
        {leaderboard.length === 0 ? (
          <div style={{
            background: THEME.white,
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            color: THEME.textLight,
          }}>
            No activity this week yet
          </div>
        ) : (
          leaderboard.map((user, index) => (
            <div
              key={user.id}
              style={{
                background: user.id === currentUser.id ? THEME.accent : THEME.white,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: user.id === currentUser.id ? `2px solid ${THEME.primary}` : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: index < 3 ? medals[index] : THEME.secondary,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: index < 3 ? THEME.white : THEME.textLight,
                }}>
                  {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: THEME.text }}>
                    {user.name}
                    {user.id === currentUser.id && ' (You)'}
                  </div>
                  <div style={{ fontSize: '14px', color: THEME.textLight }}>
                    {user.role === 'manager' ? 'Manager' : 'Employee'}
                  </div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: THEME.primary }}>
                  {user.weeklyTotal}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ========================================
// ACTIVE USERS LIST COMPONENT
// ========================================

function ActiveUsersList({ activeUsers, currentUser }) {
  return (
    <div style={{
      background: THEME.white,
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        marginBottom: '12px' 
      }}>
        <Users size={20} color={THEME.primary} />
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: THEME.text }}>
          Active Users ({activeUsers.length})
        </h3>
      </div>
      {activeUsers.length === 0 ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: THEME.textLight,
          fontSize: '14px',
        }}>
          No other users online
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          {activeUsers.map(user => (
            <div key={user.userId} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px',
              background: user.userId === currentUser?.id ? THEME.accent : THEME.secondary,
              borderRadius: '8px',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: THEME.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: THEME.white,
                fontSize: '12px',
                fontWeight: '600',
              }}>
                {user.userName?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>
                  {user.userName}
                  {user.userId === currentUser?.id && ' (You)'}
                </div>
                <div style={{ fontSize: '12px', color: THEME.textLight }}>
                  {user.userRole === 'manager' ? '👔 Manager' : '👤 Employee'}
                </div>
              </div>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: THEME.success,
              }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ========================================
// CHATBOT COMPONENT
// ========================================

function Chatbot({ currentUser, todayStats, weekStats, onIncrement }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: isAIConfigured() 
        ? "Hi! I'm your AI coach. I can help you with your goals, answer questions about the app, and provide motivation. What would you like to know?"
        : "AI chatbot is not configured. Please add REACT_APP_GEMINI_API_KEY to enable AI features.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remainingRequests, setRemainingRequests] = useState(getRemainingRequests());
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Update remaining requests every second
    const interval = setInterval(() => {
      setRemainingRequests(getRemainingRequests());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !isAIConfigured()) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const context = {
        currentUser,
        todayStats,
        weekStats,
        userGoals: currentUser?.goals,
      };

      const response = await getAIResponse(userMessage.content, context);
      
      const aiMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setRemainingRequests(getRemainingRequests());
    } catch (error) {
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: Date.now(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: THEME.text }}>
          AI Coach
        </h2>
        {isAIConfigured() && (
          <div style={{ fontSize: '12px', color: THEME.textLight }}>
            {remainingRequests} requests/min remaining
          </div>
        )}
      </div>

      <div style={{
        background: THEME.white,
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 300px)',
        minHeight: '500px',
        maxHeight: '700px',
      }}>
        {/* Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          marginBottom: '16px',
          paddingRight: '8px',
        }}>
          {messages.map((message) => (
            <div
              key={message.id}
              style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '16px',
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: message.role === 'user' ? THEME.primary : THEME.secondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {message.role === 'user' ? (
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: THEME.white,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: '600',
                    color: THEME.primary,
                  }}>
                    {currentUser?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                ) : (
                  <Bot size={18} color={THEME.primary} />
                )}
              </div>
              <div style={{
                flex: 1,
                background: message.role === 'user' ? THEME.primary : THEME.secondary,
                color: message.role === 'user' ? THEME.white : THEME.text,
                padding: '12px 16px',
                borderRadius: '12px',
                maxWidth: '80%',
                wordWrap: 'break-word',
              }}>
                <div style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                  {message.content}
                </div>
                {message.isError && (
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '4px' }}>
                    ⚠️ Error occurred
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: THEME.secondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Bot size={18} color={THEME.primary} />
              </div>
              <div style={{
                background: THEME.secondary,
                padding: '12px 16px',
                borderRadius: '12px',
              }}>
                <div style={{ fontSize: '14px', color: THEME.textLight }}>
                  Thinking...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isAIConfigured() ? "Ask me anything about your goals or the app..." : "AI not configured"}
            disabled={isLoading || !isAIConfigured()}
            maxLength={500}
            rows={2}
            style={{
              flex: 1,
              padding: '12px',
              border: `2px solid ${THEME.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              resize: 'vertical',
              minHeight: '50px',
              maxHeight: '120px',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !isAIConfigured()}
            style={{
              padding: '12px 20px',
              background: (input.trim() && !isLoading && isAIConfigured()) ? THEME.primary : THEME.border,
              border: 'none',
              borderRadius: '8px',
              color: THEME.white,
              fontSize: '14px',
              fontWeight: '600',
              cursor: (input.trim() && !isLoading && isAIConfigured()) ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: 'fit-content',
            }}
          >
            <Send size={18} />
          </button>
        </div>
        {!isAIConfigured() && (
          <div style={{
            marginTop: '8px',
            padding: '8px',
            background: THEME.warning,
            borderRadius: '6px',
            fontSize: '12px',
            color: THEME.text,
          }}>
            ⚠️ Add REACT_APP_GEMINI_API_KEY to enable AI features
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// TEAM VIEW COMPONENT (Manager Only)
// ========================================

function TeamView({ users, dailyLogs }) {
  const today = getToday();
  
  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700', color: THEME.text }}>
        Team Overview
      </h2>
      
      <div style={{ display: 'grid', gap: '16px' }}>
        {users.filter(u => u.role === 'employee').map(user => {
          const stats = dailyLogs[today]?.[user.id] || { reviews: 0, demos: 0, callbacks: 0 };
          const total = (stats.reviews || 0) + (stats.demos || 0) + (stats.callbacks || 0);
          const goalTotal = user.goals.reviews + user.goals.demos + user.goals.callbacks;
          const progress = (total / goalTotal) * 100;
          
          return (
            <div
              key={user.id}
              style={{
                background: THEME.white,
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: THEME.text, marginBottom: '4px' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '14px', color: THEME.textLight }}>
                  {total} / {goalTotal} activities today
                </div>
              </div>
              
              <div style={{
                height: '8px',
                background: THEME.secondary,
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '12px',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(progress, 100)}%`,
                  background: progress >= 100 ? THEME.success : 
                             progress >= 50 ? THEME.warning : 
                             THEME.primary,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {CATEGORIES.map(category => {
                  const count = stats[category.id] || 0;
                  const goal = user.goals[category.id];
                  const Icon = category.icon;
                  
                  return (
                    <div
                      key={category.id}
                      style={{
                        padding: '8px',
                        background: THEME.secondary,
                        borderRadius: '8px',
                        textAlign: 'center',
                      }}
                    >
                      <Icon size={16} color={category.color} style={{ marginBottom: '4px' }} />
                      <div style={{ fontSize: '12px', fontWeight: '600', color: category.color }}>
                        {count}/{goal}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========================================
// ADMIN PANEL COMPONENT (Manager Only)
// ========================================

function AdminPanel({ users, onCreateUser, onDeleteUser, onUpdateGoals, onExport }) {
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('employee');
  const [editingGoals, setEditingGoals] = useState(null);
  const [goals, setGoals] = useState({});
  
  const handleCreate = () => {
    if (onCreateUser(newName, newRole)) {
      setNewName('');
      setShowForm(false);
    }
  };
  
  const handleSaveGoals = (userId) => {
    onUpdateGoals(userId, goals);
    setEditingGoals(null);
    setGoals({});
  };
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: THEME.text }}>
          Admin Panel
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={onExport}
            style={{
              padding: '12px 20px',
              background: THEME.success,
              border: 'none',
              borderRadius: '8px',
              color: THEME.white,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Download size={20} />
            Export
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: '12px 20px',
              background: THEME.primary,
              border: 'none',
              borderRadius: '8px',
              color: THEME.white,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Plus size={20} />
            Add User
          </button>
        </div>
      </div>
      
      {showForm && (
        <div style={{
          background: THEME.white,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: THEME.text }}>
              Name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter name"
              maxLength={50}
              style={{
                width: '100%',
                padding: '12px',
                border: `2px solid ${THEME.border}`,
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
              }}
            />
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: THEME.text }}>
              Role
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: `2px solid ${THEME.border}`,
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
                cursor: 'pointer',
              }}
            >
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              style={{
                flex: 1,
                padding: '16px',
                background: newName.trim() ? THEME.success : THEME.border,
                border: 'none',
                borderRadius: '8px',
                color: THEME.white,
                fontSize: '16px',
                fontWeight: '600',
                cursor: newName.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Create User
            </button>
            <button
              onClick={() => setShowForm(false)}
              style={{
                flex: 1,
                padding: '16px',
                background: THEME.secondary,
                border: 'none',
                borderRadius: '8px',
                color: THEME.text,
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <div style={{ display: 'grid', gap: '12px' }}>
        {users.map(user => (
          <div
            key={user.id}
            style={{
              background: THEME.white,
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: THEME.text, marginBottom: '4px' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '14px', color: THEME.textLight }}>
                  {user.role === 'manager' ? '👔 Manager' : '👤 Employee'}
                </div>
              </div>
              <button
                onClick={() => onDeleteUser(user.id)}
                style={{
                  padding: '8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={18} color={THEME.danger} />
              </button>
            </div>
            
            {editingGoals === user.id ? (
              <div>
                <div style={{ marginBottom: '12px' }}>
                  {CATEGORIES.map(category => (
                    <div key={category.id} style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: THEME.text }}>
                        {category.name} Goal
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={goals[category.id] !== undefined ? goals[category.id] : user.goals[category.id]}
                        onChange={(e) => setGoals({ ...goals, [category.id]: parseInt(e.target.value) || 0 })}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: `2px solid ${THEME.border}`,
                          borderRadius: '6px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleSaveGoals(user.id)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: THEME.success,
                      border: 'none',
                      borderRadius: '6px',
                      color: THEME.white,
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingGoals(null);
                      setGoals({});
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: THEME.secondary,
                      border: 'none',
                      borderRadius: '6px',
                      color: THEME.text,
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                  {CATEGORIES.map(category => {
                    const goal = user.goals[category.id];
                    const Icon = category.icon;
                    
                    return (
                      <div
                        key={category.id}
                        style={{
                          padding: '8px',
                          background: THEME.secondary,
                          borderRadius: '8px',
                          textAlign: 'center',
                        }}
                      >
                        <Icon size={16} color={category.color} style={{ marginBottom: '4px' }} />
                        <div style={{ fontSize: '12px', fontWeight: '600', color: THEME.text }}>
                          Goal: {goal}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => {
                    setEditingGoals(user.id);
                    setGoals({});
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    background: THEME.primary,
                    border: 'none',
                    borderRadius: '6px',
                    color: THEME.white,
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Settings size={14} />
                  Edit Goals
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ========================================
// REPORTS COMPONENT (Manager Only)
// ========================================

function Reports({ users, dailyLogs, appointments }) {
  const [timeRange, setTimeRange] = useState('week');
  
  const chartData = useMemo(() => {
    const data = users.filter(u => u.role === 'employee').map(user => {
      let total = 0;
      const startDate = timeRange === 'week' ? getWeekStart() : getMonthStart();
      
      Object.entries(dailyLogs).forEach(([date, usersData]) => {
        if (date >= startDate && usersData[user.id]) {
          total += (usersData[user.id].reviews || 0);
          total += (usersData[user.id].demos || 0);
          total += (usersData[user.id].callbacks || 0);
        }
      });
      
      return {
        name: user.name,
        total,
      };
    });
    
    return data.sort((a, b) => b.total - a.total);
  }, [users, dailyLogs, timeRange]);
  
  const categoryData = useMemo(() => {
    const data = { reviews: 0, demos: 0, callbacks: 0 };
    const startDate = timeRange === 'week' ? getWeekStart() : getMonthStart();
    
    Object.entries(dailyLogs).forEach(([date, usersData]) => {
      if (date >= startDate) {
        Object.values(usersData).forEach(stats => {
          data.reviews += stats.reviews || 0;
          data.demos += stats.demos || 0;
          data.callbacks += stats.callbacks || 0;
        });
      }
    });
    
    return [
      { name: 'Reviews', value: data.reviews, color: THEME.warning },
      { name: 'Demos', value: data.demos, color: THEME.success },
      { name: 'Callbacks', value: data.callbacks, color: THEME.primary },
    ];
  }, [dailyLogs, timeRange]);
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: THEME.text }}>
          Reports
        </h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          style={{
            padding: '8px 16px',
            border: `2px solid ${THEME.border}`,
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>
      
      <div style={{
        background: THEME.white,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: THEME.text }}>
          Team Performance
        </h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" fill={THEME.primary} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: THEME.textLight }}>
            No data available
          </div>
        )}
      </div>
      
      <div style={{
        background: THEME.white,
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: THEME.text }}>
          Activity Breakdown
        </h3>
        {categoryData.some(d => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: THEME.textLight }}>
            No activity data
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// BOTTOM NAVIGATION
// ========================================

function BottomNav({ activeView, onViewChange, isManager }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Target, roles: ['employee', 'manager'] },
    { id: 'goals', label: 'Goals', icon: Target, roles: ['employee', 'manager'] },
    { id: 'appointments', label: 'Appointments', icon: Calendar, roles: ['employee', 'manager'] },
    { id: 'feed', label: 'Feed', icon: MessageSquare, roles: ['employee', 'manager'] },
    { id: 'leaderboard', label: 'Leaderboard', icon: Award, roles: ['employee', 'manager'] },
    { id: 'chatbot', label: 'AI Coach', icon: Bot, roles: ['employee', 'manager'] },
    { id: 'team', label: 'Team', icon: Users, roles: ['manager'] },
    { id: 'admin', label: 'Admin', icon: Settings, roles: ['manager'] },
    { id: 'reports', label: 'Reports', icon: TrendingUp, roles: ['manager'] },
  ];
  
  const visibleItems = navItems.filter(item => 
    isManager ? item.roles.includes('manager') : item.roles.includes('employee')
  );
  
  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: THEME.white,
      borderTop: `1px solid ${THEME.border}`,
      display: 'grid',
      gridTemplateColumns: `repeat(${visibleItems.length}, 1fr)`,
      boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
      zIndex: 1000,
    }}>
      {visibleItems.map(item => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            style={{
              padding: '12px 8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              color: isActive ? THEME.primary : THEME.textLight,
              transition: 'all 0.2s',
            }}
          >
            <Icon size={20} />
            <span style={{ fontSize: '10px', fontWeight: '600' }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
