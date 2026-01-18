import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ComposedChart } from 'recharts';
import { Star, Calendar, Phone, Users, Target, Award, TrendingUp, Settings, Plus, Minus, Trash2, Edit2, Check, X, MessageSquare, ThumbsUp, Search, Download, Wifi, WifiOff, Bot, Send, Mic, MicOff, Volume2, Key, Sliders, Eye, EyeOff, Square, Sun } from 'lucide-react';
import './storage'; // Initialize IndexedDB storage adapter
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { getTheme, listenToSystemThemeChanges } from './lib/theme';
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
  getRemainingRequests,
  configureAI,
  getAPIKey,
  validateAPIKey,
  fetchAvailableModels,
  clearModelsCache,
  TEXT_MODELS,
  LIVE_MODELS_FALLBACK,
  AVAILABLE_MODELS,
  DEFAULT_MODEL
} from './lib/ai';
import {
  createVoiceChatSession,
  isVoiceChatSupported,
  VOICE_OPTIONS
} from './lib/voiceChat';
import {
  ensureDailySnapshots,
  initializeSnapshots,
  getLocalSnapshots,
} from './lib/snapshots';
import DebugLogger from './components/DebugLogger';
import OnboardingFlow from './components/OnboardingFlow';
import {
  debounce,
  throttle,
  VirtualScroller,
  memoize,
  scheduleIdleTask
} from './lib/performance';
import {
  ariaLabels,
  accessibilityAnnouncer,
  prefersReducedMotion,
  focusManagement,
  keyboardNav,
  createSkipLink
} from './lib/accessibility';

// ========================================
// CONSTANTS
// ========================================

const CATEGORIES = [
  { id: 'reviews', name: 'Reviews', icon: Star, color: '#FFC107', defaultGoal: 5 },
  { id: 'demos', name: 'Demos', icon: Calendar, color: '#28A745', defaultGoal: 3 },
  { id: 'callbacks', name: 'Callbacks', icon: Phone, color: '#0056A4', defaultGoal: 10 },
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

const APPOINTMENT_STATUS = [
  { id: 'scheduled', label: 'Scheduled', color: '#0056A4', icon: Calendar },
  { id: 'confirmed', label: 'Confirmed', color: '#28A745', icon: CheckCircle },
  { id: 'in_progress', label: 'In Progress', color: '#FFC107', icon: Clock },
  { id: 'completed', label: 'Completed', color: '#FFD700', icon: Check },
  { id: 'cancelled', label: 'Cancelled', color: '#DC3545', icon: XCircle },
  { id: 'no_show', label: 'No Show', color: '#6B7280', icon: AlertCircle },
  { id: 'rescheduled', label: 'Rescheduled', color: '#17A2B8', icon: RefreshCw },
  { id: 'followup_needed', label: 'Follow-up Needed', color: '#FF8C00', icon: Phone },
];

const APPOINTMENT_OUTCOMES = [
  { id: 'sale', label: 'Sale', color: '#28A745' },
  { id: 'no_sale', label: 'No Sale', color: '#6B7280' },
  { id: 'callback_needed', label: 'Callback Needed', color: '#FF8C00' },
  { id: 'proposal_sent', label: 'Proposal Sent', color: '#17A2B8' },
  { id: 'thinking_it_over', label: 'Thinking It Over', color: '#9333EA' },
];

const TIME_SLOTS = Array.from({ length: 20 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8;
  const minute = i % 2 === 0 ? '00' : '30';
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute} ${period}`;
});

const DURATIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
];

const MOTIVATIONAL_QUOTES = [
  "Success is the sum of small efforts repeated day in and day out.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Don't watch the clock; do what it does. Keep going.",
  "Believe in yourself and all that you are.",
  "Great things never come from comfort zones.",
  "The only way to do great work is to love what you do.",
  "Success doesn't just find you. You have to go out and get it.",
  "Dream it. Wish it. Do it.",
  "Little things make big days.",
  "It's going to be hard, but hard does not mean impossible.",
  "Don't stop when you're tired. Stop when you're done.",
  "Wake up with determination. Go to bed with satisfaction.",
  "Do something today that your future self will thank you for.",
  "The key to success is to focus on goals, not obstacles.",
  "You don't have to be great to start, but you have to start to be great.",
  "Your limitation—it's only your imagination.",
  "Sometimes later becomes never. Do it now.",
  "Push yourself, because no one else is going to do it for you.",
  "Make each day your masterpiece.",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
  "Opportunities don't happen. You create them.",
  "Success is what comes after you stop making excuses.",
  "Winners make a habit of manufacturing their own positive expectations.",
  "The secret of getting ahead is getting started.",
  "Go the extra mile. It's never crowded there.",
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

// Human-readable relative time formatting
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} ${Math.floor(days / 7) === 1 ? 'week' : 'weeks'} ago`;
  
  // Fall back to formatted date for older posts
  const date = new Date(timestamp);
  const isThisYear = date.getFullYear() === new Date().getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
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
  const [feedReactions, setFeedReactions] = useState({});
  const [feedFilters, setFeedFilters] = useState({
    type: 'all',
    sortBy: 'recent',
    userId: null,
    search: '',
    showOnlyLiked: false,
    showOnlyMine: false,
  });
  const [pinnedPosts, setPinnedPosts] = useState({});
  const [unreadPosts, setUnreadPosts] = useState(new Set());
  const [activeView, setActiveView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [toast, setToast] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [rememberUser, setRememberUser] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [appSettings, setAppSettings] = useState({
    ai: {
      apiKey: '',
      textModel: 'gemini-2.0-flash',
      voiceModel: 'gemini-2.5-flash-native-audio-preview-12-2025',
      voiceName: 'Puck',
      rateLimit: 15,
      voiceChatEnabled: true,
      voiceChatSettings: {
        startOfSpeechSensitivity: 'START_SENSITIVITY_UNSPECIFIED',
        endOfSpeechSensitivity: 'END_SENSITIVITY_UNSPECIFIED',
        silenceDurationMs: 500,
        prefixPaddingMs: 100,
      },
      generationConfig: {
        temperature: 1.0,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        candidateCount: 1,
        presencePenalty: 0.0,
        frequencyPenalty: 0.0,
      },
    },
    appearance: {
      compactMode: false,
      showAnimations: true,
    },
    notifications: {
      goalReminders: true,
      achievementAlerts: true,
    },
  });
  const [themeMode, setThemeMode] = useState('system');
  const [dailySnapshots, setDailySnapshots] = useState({});

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
          storage.get('appSettings', null),
          storage.get('themeMode', 'system'),
          storage.get('dailySnapshots', {}),
        ];

        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Load timeout')), 10000)
        );

        const results = await Promise.race([
          Promise.all(loadPromises),
          timeout
        ]);

        const [loadedUsers, loadedLogs, loadedAppts, loadedFeed, savedUser, shouldRemember, savedSettings, savedThemeMode, loadedSnapshots] = results;

        // Use synced data if available, otherwise use local
        const finalUsers = syncedData?.users || loadedUsers || [];
        setUsers(finalUsers);
        setDailyLogs(syncedData?.dailyLogs || loadedLogs || {});
        setAppointments(syncedData?.appointments || loadedAppts || []);
        setFeed(syncedData?.feed || loadedFeed || []);
        setRememberUser(shouldRemember || false);
        setDailySnapshots(loadedSnapshots || {});

        // Initialize snapshots from Supabase
        if (navigator.onLine && isSupabaseConfigured) {
          try {
            await initializeSnapshots();
          } catch (error) {
            console.error('Failed to initialize snapshots:', error);
          }
        }

        // Load and apply settings
        if (savedSettings) {
          // Ensure voiceChatSettings exists with defaults if missing
          const mergedSettings = {
            ...savedSettings,
            ai: {
              ...savedSettings.ai,
              voiceChatSettings: {
                startOfSpeechSensitivity: 'START_SENSITIVITY_UNSPECIFIED',
                endOfSpeechSensitivity: 'END_SENSITIVITY_UNSPECIFIED',
                silenceDurationMs: 500,
                prefixPaddingMs: 100,
                ...savedSettings.ai?.voiceChatSettings,
              },
              generationConfig: {
                temperature: 1.0,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
                candidateCount: 1,
                presencePenalty: 0.0,
                frequencyPenalty: 0.0,
                ...savedSettings.ai?.generationConfig,
              },
            },
          };
          setAppSettings(prev => ({ ...prev, ...mergedSettings }));
          // Configure AI with saved settings
          if (mergedSettings.ai?.apiKey) {
            configureAI({
              apiKey: mergedSettings.ai.apiKey,
              model: mergedSettings.ai.textModel || 'gemini-2.5-flash',
              rateLimit: mergedSettings.ai.rateLimit || 15,
            });
          }
        }
        
        // Load and apply theme preference
        if (savedThemeMode) {
          setThemeMode(savedThemeMode);
        }

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
  // SYSTEM THEME PREFERENCE DETECTION
  // ========================================

  useEffect(() => {
    if (themeMode !== 'system') return;

    const unsubscribe = listenToSystemThemeChanges(() => {
      // Trigger a re-render by toggling theme state when system preference changes
      setThemeMode(prev => (prev === 'system' ? 'system' : prev));
    });

    return unsubscribe;
  }, [themeMode]);

  // ========================================
  // COMPUTE CURRENT THEME
  // ========================================

  const currentTheme = useMemo(() => getTheme(themeMode), [themeMode]);
  // ========================================
  // ONBOARDING CHECK
  // ========================================

  useEffect(() => {
    if (!isInitialized || isLoading || currentUser) return;

    const onboardingComplete = localStorage.getItem('onboarding_completed');
    if (!onboardingComplete) {
      setShowOnboarding(true);
    }
  }, [isInitialized, isLoading, currentUser]);

  // ========================================
  // REDUCED MOTION DETECTION
  // ========================================

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e) => {
      setReduceMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // ========================================
  // ACCESSIBILITY & KEYBOARD SHORTCUTS
  // ========================================

  useEffect(() => {
    createSkipLink();

    const handleKeyDown = (e) => {
      // Quick increment shortcuts (when on Dashboard, no modifiers)
      if (activeView === 'dashboard' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        const target = e.target;
        // Don't trigger if user is typing in an input
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

        switch (e.key.toLowerCase()) {
          case 'r':
            e.preventDefault();
            handleIncrement('reviews');
            showToast('Review added! (Press R to add more)', 'success');
            break;
          case 'd':
            e.preventDefault();
            handleIncrement('demos');
            showToast('Demo added! (Press D to add more)', 'success');
            break;
          case 'c':
            e.preventDefault();
            handleIncrement('callbacks');
            showToast('Callback added! (Press C to add more)', 'success');
            break;
          default:
            break;
        }
      }

      // Navigation shortcuts (Ctrl/Cmd + key)
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            setActiveView('dashboard');
            accessibilityAnnouncer.announce('Switched to Dashboard');
            break;
          case 'g':
            e.preventDefault();
            setActiveView('goals');
            accessibilityAnnouncer.announce('Switched to Goals');
            break;
          case 'a':
            e.preventDefault();
            setActiveView('appointments');
            accessibilityAnnouncer.announce('Switched to Appointments');
            break;
          case 'f':
            e.preventDefault();
            setActiveView('feed');
            accessibilityAnnouncer.announce('Switched to Feed');
            break;
          case 'l':
            e.preventDefault();
            setActiveView('leaderboard');
            accessibilityAnnouncer.announce('Switched to Leaderboard');
            break;
          default:
            break;
        }
      } else if (e.key === 'Escape' && showOnboarding) {
        setShowOnboarding(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      accessibilityAnnouncer.cleanup();
    };
  }, [showOnboarding, activeView, handleIncrement, showToast]);

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
  // ENSURE DAILY SNAPSHOTS
  // ========================================

  useEffect(() => {
    if (!isInitialized || !users.length || !Object.keys(dailyLogs).length) {
      return;
    }

    // Create snapshots for yesterday if not already created
    const ensureSnapshots = async () => {
      try {
        await ensureDailySnapshots(users, dailyLogs);
        // Reload snapshots from storage
        const updatedSnapshots = await getLocalSnapshots();
        setDailySnapshots(updatedSnapshots);
      } catch (error) {
        console.error('Failed to ensure daily snapshots:', error);
      }
    };

    ensureSnapshots();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized, users.length, Object.keys(dailyLogs).length]);

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

  useEffect(() => {
    if (!hasInitialized.current) return;

    const saveTimeout = setTimeout(async () => {
      try {
        await storage.set('dailySnapshots', dailySnapshots);
      } catch (error) {
        console.error('Auto-save snapshots failed:', error);
      }
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [dailySnapshots]);

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
  // SETTINGS FUNCTIONS
  // ========================================

  const saveSettings = useCallback(async (newSettings) => {
    try {
      const updatedSettings = { ...appSettings, ...newSettings };
      setAppSettings(updatedSettings);
      await storage.set('appSettings', updatedSettings);

      // Apply AI settings immediately
      if (newSettings.ai) {
        configureAI({
          apiKey: newSettings.ai.apiKey ?? updatedSettings.ai.apiKey,
          model: newSettings.ai.textModel ?? updatedSettings.ai.textModel,
          rateLimit: newSettings.ai.rateLimit ?? updatedSettings.ai.rateLimit,
        });
      }

      // Handle theme mode if included in settings
      if (newSettings.themeMode) {
        setThemeMode(newSettings.themeMode);
        await storage.set('themeMode', newSettings.themeMode);
      }

      showToast('Settings saved', 'success');
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('Failed to save settings', 'error');
      return false;
    }
  }, [appSettings, showToast]);

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

  const addReaction = useCallback(async (postId, emoji) => {
    if (!currentUser || !postId) return;

    try {
      const reactionKey = `${postId}_reactions`;
      const reactions = feedReactions[reactionKey] || {};
      const userReactions = reactions[currentUser.id] || [];
      const hasReacted = userReactions.includes(emoji);

      if (hasReacted) {
        const updatedUserReactions = userReactions.filter(e => e !== emoji);
        const updatedReactions = {
          ...reactions,
          [currentUser.id]: updatedUserReactions.length > 0 ? updatedUserReactions : undefined,
        };
        if (!updatedUserReactions.length) delete updatedReactions[currentUser.id];

        setFeedReactions(prev => ({
          ...prev,
          [reactionKey]: updatedReactions,
        }));
      } else {
        setFeedReactions(prev => ({
          ...prev,
          [reactionKey]: {
            ...reactions,
            [currentUser.id]: [...userReactions, emoji],
          },
        }));
      }

      if (navigator.onLine && isSupabaseConfigured && !postId.startsWith('temp_')) {
        await queueSyncOperation({
          type: hasReacted ? 'delete' : 'upsert',
          table: 'feed_reactions',
          data: {
            post_id: postId,
            user_id: currentUser.id,
            emoji,
          },
        });
      }
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  }, [currentUser, feedReactions]);

  const togglePinPost = useCallback(async (postId) => {
    if (!currentUser || currentUser.role !== 'manager') return;

    try {
      const isPinned = pinnedPosts[postId];

      if (isPinned) {
        const updated = { ...pinnedPosts };
        delete updated[postId];
        setPinnedPosts(updated);
      } else {
        const pinnedCount = Object.values(pinnedPosts).filter(Boolean).length;
        if (pinnedCount < 3) {
          setPinnedPosts(prev => ({ ...prev, [postId]: true }));
        } else {
          showToast('Maximum 3 pinned posts allowed', 'warning');
          return;
        }
      }

      if (navigator.onLine && isSupabaseConfigured) {
        await queueSyncOperation({
          type: 'update',
          table: 'feed_posts',
          id: postId,
          data: { is_pinned: !isPinned },
        });
      }
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  }, [currentUser, pinnedPosts, showToast]);

  const updateFeedFilters = useCallback((newFilters) => {
    setFeedFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const markPostsAsRead = useCallback(() => {
    setUnreadPosts(new Set());
  }, []);

  const getFilteredAndSortedFeed = useCallback(() => {
    let filtered = feed.filter(post => {
      if (feedFilters.type !== 'all' && post.type !== feedFilters.type) return false;
      if (feedFilters.userId && post.userId !== feedFilters.userId) return false;
      if (feedFilters.showOnlyMine && post.userId !== currentUser?.id) return false;
      if (feedFilters.showOnlyLiked && !(post.likes || []).includes(currentUser?.id)) return false;
      if (feedFilters.search) {
        const searchLower = feedFilters.search.toLowerCase();
        return post.content.toLowerCase().includes(searchLower) ||
               post.userName.toLowerCase().includes(searchLower);
      }
      return true;
    });

    const pinned = filtered.filter(p => pinnedPosts[p.id]);
    const unpinned = filtered.filter(p => !pinnedPosts[p.id]);

    unpinned.sort((a, b) => {
      switch (feedFilters.sortBy) {
        case 'popular':
          return (b.likes?.length || 0) - (a.likes?.length || 0);
        case 'commented':
          return (b.comments?.length || 0) - (a.comments?.length || 0);
        case 'trending':
          const scoreB = ((b.likes?.length || 0) * 1.5) + (b.comments?.length || 0);
          const scoreA = ((a.likes?.length || 0) * 1.5) + (a.comments?.length || 0);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return b.timestamp - a.timestamp;
        case 'recent':
        default:
          return b.timestamp - a.timestamp;
      }
    });

    return [...pinned, ...unpinned];
  }, [feed, feedFilters, currentUser, pinnedPosts]);

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
        background: currentTheme.secondary,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: `4px solid ${currentTheme.accent}`,
            borderTop: `4px solid ${currentTheme.primary}`,
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
          <div style={{ color: currentTheme.text, fontSize: '18px', fontWeight: '600' }}>
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
      theme={currentTheme}
    />;
  }

  // ========================================
  // RENDER: ONBOARDING FLOW
  // ========================================

  if (showOnboarding) {
    return (
      <OnboardingFlow
        onComplete={() => {
          setShowOnboarding(false);
          accessibilityAnnouncer.announce('Onboarding completed. Welcome to Goal Tracker!', false);
        }}
        theme={currentTheme}
      />
    );
  }

  // ========================================
  // RENDER: MAIN APP
  // ========================================

  return (
    <div style={{
      minHeight: '100vh',
      background: currentTheme.gradients.background,
      fontFamily: 'var(--font-body)',
      paddingBottom: '80px',
      id: 'main-content',
    }}>
      {/* Offline Banner */}
      {!isOnline && (
        <div style={{
          background: currentTheme.warning,
          color: currentTheme.text,
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
          background: toast.type === 'success' ? currentTheme.success :
                     toast.type === 'error' ? currentTheme.danger :
                     toast.type === 'warning' ? currentTheme.warning :
                     currentTheme.primary,
          color: currentTheme.white,
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
            background: currentTheme.white,
            padding: '40px',
            borderRadius: '20px',
            textAlign: 'center',
            animation: 'scaleIn 0.3s ease-out',
          }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎉</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: currentTheme.primary }}>
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
        background: currentTheme.gradients.primary,
        color: currentTheme.white,
        padding: '24px 20px',
        boxShadow: currentTheme.shadows.layered,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h1 style={{ 
            margin: 0, 
            fontSize: '28px', 
            fontWeight: '700',
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.5px',
          }}>
            Window Depot Milwaukee
          </h1>
          {isOnline ? (
            <Wifi size={20} style={{ opacity: 0.8 }} />
          ) : (
            <WifiOff size={20} />
          )}
        </div>
        <div style={{ 
          fontSize: '15px', 
          opacity: 0.95,
          fontFamily: 'var(--font-body)',
          fontWeight: '500',
        }}>
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
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.25)',
            border: 'none',
            borderRadius: '8px',
            color: currentTheme.white,
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'var(--font-body)',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
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
              dailyLogs={dailyLogs}
              theme={currentTheme}
              showToast={showToast}
            />
            <ActiveUsersList activeUsers={activeUsers} currentUser={currentUser} theme={currentTheme} />
          </div>
        )}

        {activeView === 'goals' && (
          <Goals
            currentUser={currentUser}
            onUpdateGoals={(goals) => updateUserGoals(currentUser.id, goals)}
            theme={currentTheme}
          />
        )}

        {activeView === 'appointments' && (
          <Appointments
            appointments={appointments.filter(a => a.userId === currentUser.id)}
            onAdd={addAppointment}
            onDelete={deleteAppointment}
            theme={currentTheme}
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
            theme={currentTheme}
          />
        )}
        
        {activeView === 'leaderboard' && (
          <Leaderboard users={users} dailyLogs={dailyLogs} currentUser={currentUser} theme={currentTheme} />
        )}

        {activeView === 'history' && (
          <HistoryView
            currentUser={currentUser}
            users={users}
            dailyLogs={dailyLogs}
            theme={currentTheme}
          />
        )}

        {activeView === 'team' && currentUser.role === 'manager' && (
          <TeamView users={users} dailyLogs={dailyLogs} theme={currentTheme} />
        )}

        {activeView === 'admin' && currentUser.role === 'manager' && (
          <AdminPanel
            users={users}
            onCreateUser={createUser}
            onDeleteUser={deleteUser}
            onUpdateGoals={updateUserGoals}
            onExport={exportData}
            theme={currentTheme}
          />
        )}

        {activeView === 'reports' && currentUser.role === 'manager' && (
          <Reports
            users={users}
            dailyLogs={dailyLogs}
            appointments={appointments}
            theme={currentTheme}
          />
        )}

        {activeView === 'chatbot' && (
          <Chatbot
            currentUser={currentUser}
            todayStats={todayStats}
            weekStats={weekStats}
            onIncrement={handleIncrement}
            appSettings={appSettings}
            setAppSettings={setAppSettings}
            theme={currentTheme}
          />
        )}

        {activeView === 'settings' && (
          <SettingsPage
            settings={appSettings}
            onSaveSettings={saveSettings}
            currentThemeMode={themeMode}
            theme={currentTheme}
          />
        )}
      </div>
      
      {/* Bottom Navigation */}
      <BottomNav
        activeView={activeView}
        onViewChange={setActiveView}
        isManager={currentUser.role === 'manager'}
        theme={currentTheme}
      />
      
      {/* Debug Logger */}
      <DebugLogger />
    </div>
  );
}

// ========================================
// USER SELECTION COMPONENT
// ========================================

function UserSelection({ users, onSelectUser, onCreateUser, rememberUser, onRememberChange, theme }) {
  const THEME = theme || { /* fallback to light theme if needed */ primary: '#0056A4', secondary: '#F5F7FA', text: '#1A1A2E', textLight: '#6B7280', border: '#E5E7EB', white: '#FFFFFF', accent: '#E8F4FD', success: '#28A745', warning: '#FFC107', danger: '#DC3545', shadows: { md: '0 2px 8px rgba(0, 0, 0, 0.08)' }, gradients: { primary: 'linear-gradient(135deg, #0056A4 0%, #4A90D9 100%)' } };
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
      background: THEME.gradients.background,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{
        background: THEME.white,
        borderRadius: '20px',
        padding: '48px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: THEME.shadows.xl,
        border: `1px solid ${THEME.border}`,
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '32px',
        }}>
          <div style={{
            width: '90px',
            height: '90px',
            background: THEME.gradients.primary,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: THEME.shadows.layered,
          }}>
            <Target size={44} color={THEME.white} />
          </div>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '32px',
            fontWeight: '700',
            color: THEME.text,
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.5px',
          }}>
            Window Depot
          </h1>
          <p style={{
            margin: 0,
            fontSize: '17px',
            color: THEME.textLight,
            fontFamily: 'var(--font-body)',
            fontWeight: '500',
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
                padding: '14px',
                background: mode === 'select' ? THEME.white : 'transparent',
                border: mode === 'select' ? `2px solid ${THEME.primary}` : 'none',
                borderRadius: '10px',
                color: mode === 'select' ? THEME.primary : THEME.textLight,
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: mode === 'select' ? THEME.shadows.md : 'none',
                fontFamily: 'var(--font-body)',
              }}
            >
              Select User
            </button>
            <button
              onClick={() => setMode('create')}
              style={{
                flex: 1,
                padding: '14px',
                background: mode === 'create' ? THEME.white : 'transparent',
                border: mode === 'create' ? `2px solid ${THEME.primary}` : 'none',
                borderRadius: '10px',
                color: mode === 'create' ? THEME.primary : THEME.textLight,
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: mode === 'create' ? THEME.shadows.md : 'none',
                fontFamily: 'var(--font-body)',
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
                    padding: '20px',
                    marginBottom: '12px',
                    background: THEME.white,
                    border: `2px solid ${THEME.border}`,
                    borderRadius: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: THEME.shadows.sm,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = THEME.gradients.cardHover;
                    e.currentTarget.style.borderColor = THEME.primary;
                    e.currentTarget.style.boxShadow = THEME.shadows.md;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = THEME.white;
                    e.currentTarget.style.borderColor = THEME.border;
                    e.currentTarget.style.boxShadow = THEME.shadows.sm;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ 
                    fontWeight: '700', 
                    color: THEME.text, 
                    marginBottom: '6px',
                    fontSize: '18px',
                    fontFamily: 'var(--font-display)',
                  }}>
                    {user.name}
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: THEME.textLight,
                    fontFamily: 'var(--font-body)',
                  }}>
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

function Dashboard({ currentUser, todayStats, weekStats, onIncrement, onDecrement, dailyLogs, theme, showToast }) {
  const THEME = theme;
  const [celebratingCategory, setCelebratingCategory] = useState(null);
  const [undoHistory, setUndoHistory] = useState([]);

  // ========================================
  // STREAK CALCULATOR
  // ========================================

  const calculateStreaks = useMemo(() => {
    if (!currentUser || !dailyLogs) {
      return { currentStreak: 0, bestStreak: 0 };
    }

    const today = getToday();
    const dates = Object.keys(dailyLogs).filter(date => dailyLogs[date][currentUser.id]).sort().reverse();

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    // Check consecutive days starting from today
    for (let i = 0; i < dates.length; i++) {
      const dateStr = dates[i];
      const dayLogs = dailyLogs[dateStr]?.[currentUser.id];

      if (!dayLogs) continue;

      const allGoalsMet =
        (dayLogs.reviews || 0) >= currentUser.goals.reviews &&
        (dayLogs.demos || 0) >= currentUser.goals.demos &&
        (dayLogs.callbacks || 0) >= currentUser.goals.callbacks;

      if (allGoalsMet) {
        tempStreak++;
        // Check if this is consecutive from today
        if (i === 0 || isConsecutiveDate(dateStr, dates[i - 1])) {
          currentStreak = tempStreak;
        }
        bestStreak = Math.max(bestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    return { currentStreak, bestStreak };
  }, [currentUser, dailyLogs]);

  const isConsecutiveDate = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  };

  // ========================================
  // UNDO HISTORY MANAGEMENT
  // ========================================

  const addToHistory = useCallback((action) => {
    const timestamp = Date.now();
    setUndoHistory(prev => {
      const newHistory = [{ ...action, timestamp }, ...prev];
      return newHistory.slice(0, 5); // Keep only last 5
    });
  }, []);

  const performUndo = useCallback(() => {
    if (undoHistory.length === 0) return;

    const lastAction = undoHistory[0];
    const { categoryId, type } = lastAction;

    if (type === 'increment') {
      onDecrement(categoryId);
    } else if (type === 'decrement') {
      onIncrement(categoryId);
    }

    setUndoHistory(prev => prev.slice(1));
  }, [undoHistory, onIncrement, onDecrement]);

  // ========================================
  // PACE INDICATOR
  // ========================================

  const paceIndicator = useMemo(() => {
    const weekStart = getWeekStart();
    const today = getToday();
    const daysInWeek = Math.ceil((new Date(today) - new Date(weekStart)) / (1000 * 60 * 60 * 24)) + 1;
    const weekProgress = daysInWeek / 7;

    const messages = [];

    CATEGORIES.forEach(category => {
      const weekCount = weekStats[category.id] || 0;
      const weekGoal = currentUser.goals[category.id] * 7;
      const paceGoal = weekGoal * weekProgress;

      if (weekCount >= paceGoal + currentUser.goals[category.id]) {
        messages.push({ category: category.name, status: 'ahead', text: `Ahead of pace on ${category.name}!` });
      } else if (weekCount < paceGoal - currentUser.goals[category.id]) {
        const needed = Math.ceil((weekGoal - weekCount) / (8 - daysInWeek));
        messages.push({ category: category.name, status: 'behind', text: `Need ${needed} more ${category.name.toLowerCase()}/day` });
      } else {
        messages.push({ category: category.name, status: 'on-track', text: `On track with ${category.name}!` });
      }
    });

    return messages;
  }, [currentUser, weekStats]);

  // ========================================
  // WEEK PROGRESS MINI-CHART DATA
  // ========================================

  const last7Days = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dayLogs = dailyLogs[dateStr]?.[currentUser.id];
      const total = (dayLogs?.reviews || 0) + (dayLogs?.demos || 0) + (dayLogs?.callbacks || 0);
      days.push({
        date: dateStr,
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        total: total,
      });
    }
    return days;
  }, [currentUser, dailyLogs]);

  const maxDay = Math.max(...last7Days.map(d => d.total), 1);

  // ========================================
  // GOAL INSIGHTS
  // ========================================

  const goalInsights = useMemo(() => {
    const insights = [];
    const now = new Date();
    const hour = now.getHours();

    // Time of day insights
    if (hour < 12 && weekStats.reviews < currentUser.goals.reviews * 2) {
      insights.push("You're usually more productive in the morning - start strong!");
    } else if (hour >= 14 && hour < 17 && todayStats.reviews === 0) {
      insights.push("Afternoon slump? Time to get some reviews done!");
    }

    // Category performance
    const reviewRatio = todayStats.reviews / currentUser.goals.reviews;
    const demoRatio = todayStats.demos / currentUser.goals.demos;
    const callbackRatio = todayStats.callbacks / currentUser.goals.callbacks;

    if (demoRatio < 0.5 && reviewRatio > 0.8) {
      insights.push("You're crushing reviews! Schedule more demos to follow up.");
    }

    if (callbackRatio < 0.3 && weekStats.callbacks > 0) {
      insights.push("Callbacks are trailing. Consider a callback blitz!");
    }

    if (reviewRatio >= 1 && demoRatio >= 1 && callbackRatio >= 1) {
      insights.push("Excellent balance across all categories today!");
    }

    // Weekly momentum
    if (last7Days.length >= 3) {
      const recentAvg = last7Days.slice(-3).reduce((sum, d) => sum + d.total, 0) / 3;
      const earlierAvg = last7Days.slice(0, 3).reduce((sum, d) => sum + d.total, 0) / 3;

      if (recentAvg > earlierAvg * 1.2) {
        insights.push("Great momentum this week! Keep the energy high!");
      } else if (recentAvg < earlierAvg * 0.8 && earlierAvg > 0) {
        insights.push("Energy is dipping. Time to refocus!");
      }
    }

    return insights.length > 0 ? insights : ["Keep pushing towards your goals!"];
  }, [currentUser, todayStats, weekStats, last7Days, calculateStreaks]);

  // ========================================
  // DAILY MOTIVATIONAL QUOTE
  // ========================================

  const dailyQuote = useMemo(() => {
    // Use today's date to consistently pick the same quote all day
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const quoteIndex = dayOfYear % MOTIVATIONAL_QUOTES.length;
    return MOTIVATIONAL_QUOTES[quoteIndex];
  }, []);

  const handleIncrement = (categoryId) => {
    onIncrement(categoryId);
    addToHistory({ categoryId, type: 'increment' });

    const newCount = (todayStats[categoryId] || 0) + 1;
    const goal = currentUser.goals[categoryId];
    if (newCount >= goal) {
      setCelebratingCategory(categoryId);
      setTimeout(() => setCelebratingCategory(null), 2000);
    }
  };

  const handleDecrement = (categoryId) => {
    onDecrement(categoryId);
    addToHistory({ categoryId, type: 'decrement' });
  };

  return (
    <div>
      <h2 style={{
        margin: '0 0 16px 0',
        fontSize: '24px',
        fontWeight: '700',
        color: THEME.text,
        fontFamily: 'var(--font-display)',
      }}>
        Today's Progress
      </h2>

      {/* Daily Motivational Quote */}
      <div style={{
        background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '20px',
        boxShadow: THEME.shadows.md,
        color: THEME.white,
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: '600',
          opacity: 0.9,
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          Daily Motivation
        </div>
        <div style={{
          fontSize: '15px',
          fontWeight: '500',
          fontStyle: 'italic',
          opacity: 0.95,
          lineHeight: '1.5',
          fontFamily: 'var(--font-body)',
        }}>
          "{dailyQuote}"
        </div>
        <div style={{
          fontSize: '11px',
          marginTop: '8px',
          opacity: 0.75,
          fontFamily: 'var(--font-body)',
        }}>
          Press R/D/C for quick add • {Object.keys(CATEGORIES).map(k => CATEGORIES[k].name[0]).join('/')}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
        {CATEGORIES.map((category, index) => {
          const count = todayStats[category.id] || 0;
          const goal = currentUser.goals[category.id];
          const progress = (count / goal) * 100;
          const Icon = category.icon;
          const isGoalReached = count >= goal;
          const isCelebrating = celebratingCategory === category.id;

          // Determine gradient based on category
          let gradient = category.color;
          if (category.id === 'reviews') gradient = THEME.gradients.warning;
          else if (category.id === 'demos') gradient = THEME.gradients.success;
          else if (category.id === 'callbacks') gradient = THEME.gradients.primary;

          return (
            <div
              key={category.id}
              style={{
                background: THEME.white,
                borderRadius: '16px',
                padding: '24px',
                boxShadow: isGoalReached ? THEME.shadows.layered : THEME.shadows.md,
                border: isGoalReached ? `2px solid ${category.color}` : 'none',
                transform: isCelebrating ? 'scale(1.02)' : 'scale(1)',
                transition: 'all 0.3s ease',
                animation: isCelebrating ? 'bounce 0.6s ease-in-out' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '52px',
                  height: '52px',
                  background: gradient,
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: THEME.shadows.md,
                  transform: isCelebrating ? 'rotate(360deg)' : 'rotate(0deg)',
                  transition: 'transform 0.6s ease',
                }}>
                  <Icon size={26} color={THEME.white} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: THEME.text,
                    fontFamily: 'var(--font-body)',
                  }}>
                    {category.name}
                  </div>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    background: gradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '-0.5px',
                  }}>
                    {count} / {goal}
                  </div>
                </div>
                {isGoalReached && (
                  <div style={{
                    fontSize: '24px',
                    animation: 'pulse 2s infinite',
                  }}>
                    🎉
                  </div>
                )}
              </div>

              <div style={{
                height: '14px',
                background: THEME.secondary,
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '16px',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(progress, 100)}%`,
                  background: gradient,
                  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: '8px',
                  boxShadow: progress >= 100 ? `0 0 12px ${category.color}40` : 'none',
                }} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => handleDecrement(category.id)}
                  disabled={count === 0}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  style={{
                    flex: 1,
                    padding: '18px',
                    background: count === 0 ? THEME.border : THEME.gradients.danger,
                    border: 'none',
                    borderRadius: '10px',
                    color: THEME.white,
                    fontSize: '24px',
                    fontWeight: '700',
                    cursor: count === 0 ? 'not-allowed' : 'pointer',
                    minHeight: '72px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: count === 0 ? 'none' : THEME.shadows.md,
                  }}
                >
                  <Minus size={28} />
                </button>
                <button
                  onClick={() => handleIncrement(category.id)}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  style={{
                    flex: 1,
                    padding: '18px',
                    background: gradient,
                    border: 'none',
                    borderRadius: '10px',
                    color: THEME.white,
                    fontSize: '24px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    minHeight: '72px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: THEME.shadows.md,
                  }}
                >
                  <Plus size={28} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gap: '20px', marginBottom: '32px' }}>
        {/* Streak Counter */}
        <div style={{
          background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E72 100%)',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: THEME.shadows.md,
          color: THEME.white,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            opacity: 0.9,
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Current Streak
          </div>
          <div style={{
            fontSize: '48px',
            fontWeight: '700',
            marginBottom: '12px',
            fontFamily: 'var(--font-mono)',
          }}>
            🔥 {calculateStreaks.currentStreak}
          </div>
          <div style={{
            fontSize: '14px',
            opacity: 0.85,
          }}>
            {calculateStreaks.currentStreak > 0
              ? `${calculateStreaks.currentStreak} days meeting all goals!`
              : 'Start your streak today!'}
          </div>
          {calculateStreaks.bestStreak > calculateStreaks.currentStreak && (
            <div style={{
              fontSize: '13px',
              marginTop: '12px',
              opacity: 0.75,
              fontStyle: 'italic',
            }}>
              Best streak: {calculateStreaks.bestStreak} days
            </div>
          )}
        </div>

        {/* Undo Button & History */}
        {undoHistory.length > 0 && (
          <div style={{
            background: THEME.white,
            borderRadius: '16px',
            padding: '16px 20px',
            boxShadow: THEME.shadows.md,
            border: `2px solid ${THEME.primary}`,
          }}>
            <button
              onClick={performUndo}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: THEME.primary,
                border: 'none',
                borderRadius: '10px',
                color: THEME.white,
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: THEME.shadows.md,
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Undo: {undoHistory[0].type === 'increment' ? '-' : '+'}{undoHistory[0].categoryId === 'reviews' ? 'Review' : undoHistory[0].categoryId === 'demos' ? 'Demo' : 'Callback'} ({formatRelativeTime(undoHistory[0].timestamp)})
            </button>
          </div>
        )}

        {/* Pace Indicator */}
        <div style={{
          background: THEME.white,
          borderRadius: '16px',
          padding: '20px',
          boxShadow: THEME.shadows.md,
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: '700',
            color: THEME.text,
            fontFamily: 'var(--font-display)',
          }}>
            Weekly Pace
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {paceIndicator.map((indicator, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background:
                    indicator.status === 'ahead' ? 'rgba(40, 167, 69, 0.08)' :
                    indicator.status === 'behind' ? 'rgba(220, 53, 69, 0.08)' :
                    'rgba(0, 86, 164, 0.08)',
                  borderLeft: `4px solid ${
                    indicator.status === 'ahead' ? THEME.success :
                    indicator.status === 'behind' ? THEME.danger :
                    THEME.primary
                  }`,
                  borderRadius: '8px',
                }}
              >
                <div style={{
                  fontSize: '20px',
                }}>
                  {indicator.status === 'ahead' ? '✨' : indicator.status === 'behind' ? '⚡' : '✓'}
                </div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: THEME.text,
                  fontFamily: 'var(--font-body)',
                }}>
                  {indicator.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '20px',
        fontWeight: '600',
        color: THEME.text,
        fontFamily: 'var(--font-display)',
      }}>
        This Week
      </h3>

      <div style={{
        background: THEME.white,
        borderRadius: '16px',
        padding: '20px',
        boxShadow: THEME.shadows.md,
        marginBottom: '20px',
      }}>
        {CATEGORIES.map((category, index) => {
          const count = weekStats[category.id] || 0;
          const Icon = category.icon;

          let gradient = category.color;
          if (category.id === 'reviews') gradient = THEME.gradients.warning;
          else if (category.id === 'demos') gradient = THEME.gradients.success;
          else if (category.id === 'callbacks') gradient = THEME.gradients.primary;

          return (
            <div
              key={category.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 0',
                borderBottom: index < CATEGORIES.length - 1 ? `1px solid ${THEME.border}` : 'none',
                animation: `fadeInUp 0.3s ease-out ${index * 0.1}s both`,
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon size={20} color={THEME.white} />
              </div>
              <div style={{
                flex: 1,
                fontSize: '15px',
                color: THEME.text,
                fontFamily: 'var(--font-body)',
                fontWeight: '500',
              }}>
                {category.name}
              </div>
              <div style={{
                fontSize: '22px',
                fontWeight: '700',
                background: gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontFamily: 'var(--font-mono)',
              }}>
                {count}
              </div>
            </div>
          );
        })}

        {/* Week Progress Mini-Chart */}
        <div style={{
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: `1px solid ${THEME.border}`,
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: THEME.textLight,
            marginBottom: '12px',
            fontFamily: 'var(--font-body)',
          }}>
            Daily Trend
          </div>
          <div style={{
            height: '80px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '6px',
          }}>
            {last7Days.map((day, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${maxDay > 0 ? (day.total / maxDay) * 60 : 4}px`,
                    background: 'linear-gradient(180deg, #4A90D9 0%, #0056A4 100%)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    minHeight: '4px',
                  }}
                  title={`${day.name}: ${day.total} items`}
                />
                <div
                  style={{
                    fontSize: '11px',
                    color: THEME.textLight,
                    fontWeight: '600',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {day.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Goal Insights */}
      <div style={{
        background: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: THEME.shadows.md,
        color: THEME.white,
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '700',
          fontFamily: 'var(--font-display)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>💡</span> Insights
        </h3>
        <div style={{
          display: 'grid',
          gap: '10px',
        }}>
          {goalInsights.map((insight, idx) => (
            <div
              key={idx}
              style={{
                fontSize: '14px',
                fontWeight: '500',
                opacity: 0.95,
                lineHeight: '1.5',
                fontFamily: 'var(--font-body)',
                paddingLeft: '12px',
                borderLeft: '3px solid rgba(255,255,255,0.3)',
              }}
            >
              {insight}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========================================
// GOALS COMPONENT
// ========================================

function Goals({ currentUser, onUpdateGoals, theme }) {
  const THEME = theme;
  const [goals, setGoals] = useState(currentUser.goals);
  const [showSaved, setShowSaved] = useState(false);
  
  const handleSave = () => {
    onUpdateGoals(goals);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };
  
  return (
    <div>
      <h2 style={{ 
        margin: '0 0 20px 0', 
        fontSize: '24px', 
        fontWeight: '700', 
        color: THEME.text,
        fontFamily: 'var(--font-display)',
      }}>
        Daily Goals
      </h2>
      
      <div style={{
        background: THEME.white,
        borderRadius: '16px',
        padding: '24px',
        boxShadow: THEME.shadows.md,
      }}>
        {CATEGORIES.map((category, index) => {
          const Icon = category.icon;
          
          let gradient = category.color;
          if (category.id === 'reviews') gradient = THEME.gradients.warning;
          else if (category.id === 'demos') gradient = THEME.gradients.success;
          else if (category.id === 'callbacks') gradient = THEME.gradients.primary;
          
          return (
            <div
              key={category.id}
              style={{
                marginBottom: '24px',
                paddingBottom: '24px',
                borderBottom: index < CATEGORIES.length - 1 ? `1px solid ${THEME.border}` : 'none',
                animation: `fadeInUp 0.3s ease-out ${index * 0.1}s both`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={20} color={THEME.white} />
                </div>
                <div style={{ 
                  flex: 1, 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: THEME.text,
                  fontFamily: 'var(--font-body)',
                }}>
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
                  padding: '14px',
                  border: `2px solid ${THEME.border}`,
                  borderRadius: '10px',
                  fontSize: '18px',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: '600',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = category.color;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${category.color}20`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = THEME.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          );
        })}
        
        <button
          onClick={handleSave}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.98)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          style={{
            width: '100%',
            padding: '16px',
            background: showSaved ? THEME.gradients.success : THEME.gradients.primary,
            border: 'none',
            borderRadius: '10px',
            color: THEME.white,
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: THEME.shadows.md,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: 'var(--font-body)',
          }}
        >
          {showSaved ? (
            <>
              <Check size={20} />
              Saved!
            </>
          ) : (
            'Save Goals'
          )}
        </button>
      </div>
    </div>
  );
}

// ========================================
// APPOINTMENTS COMPONENT
// ========================================

function Appointments({ appointments, onAdd, onDelete, theme }) {
  const THEME = theme;
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    products: [],
    notes: '',
    date: getToday(),
    time: '09:00',
    duration: 60,
    status: 'scheduled',
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
        time: '09:00',
        duration: 60,
        status: 'scheduled',
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
        <h2 style={{ 
          margin: 0, 
          fontSize: '24px', 
          fontWeight: '700', 
          color: THEME.text,
          fontFamily: 'var(--font-display)',
        }}>
          Appointments
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          style={{
            padding: '12px 24px',
            background: THEME.gradients.primary,
            border: 'none',
            borderRadius: '10px',
            color: THEME.white,
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: THEME.shadows.md,
            fontFamily: 'var(--font-body)',
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: THEME.text }}>
                Time
              </label>
              <select
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
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
                {TIME_SLOTS.map(time => (
                  <option key={time} value={time.split(' ')[0].padStart(5, '0')}>{time}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: THEME.text }}>
                Duration
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
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
                {DURATIONS.map(dur => (
                  <option key={dur.value} value={dur.value}>{dur.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: THEME.text }}>
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
              {APPOINTMENT_STATUS.map(status => (
                <option key={status.id} value={status.id}>{status.label}</option>
              ))}
            </select>
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
              onMouseDown={(e) => {
                if (formData.customerName.trim()) e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              style={{
                flex: 1,
                padding: '16px',
                background: formData.customerName.trim() ? THEME.gradients.success : THEME.border,
                border: 'none',
                borderRadius: '10px',
                color: THEME.white,
                fontSize: '16px',
                fontWeight: '600',
                cursor: formData.customerName.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                boxShadow: formData.customerName.trim() ? THEME.shadows.md : 'none',
                fontFamily: 'var(--font-body)',
              }}
            >
              Save Appointment
            </button>
            <button
              onClick={() => setShowForm(false)}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              style={{
                flex: 1,
                padding: '16px',
                background: THEME.secondary,
                border: `1px solid ${THEME.border}`,
                borderRadius: '10px',
                color: THEME.text,
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-body)',
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
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}>
              📅
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: THEME.text,
              marginBottom: '8px',
              fontFamily: 'var(--font-display)',
            }}>
              {searchTerm ? 'No appointments found' : 'No appointments yet'}
            </div>
            <div style={{
              fontSize: '14px',
              color: THEME.textLight,
            }}>
              {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first appointment'}
            </div>
          </div>
        ) : (
          filteredAppointments.map((appt, index) => (
            <div
              key={appt.id}
              style={{
                background: THEME.white,
                borderRadius: '16px',
                padding: '20px',
                boxShadow: THEME.shadows.md,
                border: `1px solid ${THEME.border}`,
                animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = THEME.shadows.layered;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = THEME.shadows.md;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: THEME.text,
                    marginBottom: '6px',
                    fontFamily: 'var(--font-display)',
                  }}>
                    {appt.customerName}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: THEME.textLight,
                    fontFamily: 'var(--font-body)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}>
                    <span>📅 {formatDate(appt.date)}</span>
                    {appt.time && <span>🕐 {appt.time}</span>}
                    {appt.duration && <span>⏱️ {appt.duration} min</span>}
                  </div>
                  {appt.status && (
                    <div style={{ marginTop: '6px' }}>
                      <span style={{
                        padding: '4px 10px',
                        background: APPOINTMENT_STATUS.find(s => s.id === appt.status)?.color || THEME.primary,
                        color: THEME.white,
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        {APPOINTMENT_STATUS.find(s => s.id === appt.status)?.label || appt.status}
                      </span>
                    </div>
                  )}
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
                <div style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {appt.products.map(productId => {
                    const product = PRODUCT_INTERESTS.find(p => p.id === productId);
                    return product ? (
                      <span
                        key={productId}
                        style={{
                          padding: '6px 14px',
                          background: product.color,
                          color: THEME.white,
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          boxShadow: THEME.shadows.sm,
                          fontFamily: 'var(--font-body)',
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

function Feed({
  feed,
  currentUser,
  onAddPost,
  onToggleLike,
  onAddComment,
  onEditPost,
  onDeletePost,
  onAddReaction,
  onTogglePinPost,
  onUpdateFilters,
  onMarkAsRead,
  filteredFeed,
  feedReactions,
  feedFilters,
  pinnedPosts,
  unreadCount,
  theme,
  users
}) {
  const THEME = theme;
  const [newPost, setNewPost] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [commentingId, setCommentingId] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [showReactionPicker, setShowReactionPicker] = useState(null);
  const [viewMode, setViewMode] = useState('feed'); // 'feed' or 'achievements'

  const EMOJI_REACTIONS = ['👍', '❤️', '🔥', '💪', '🎉', '🎯'];

  // Backwards compatibility - if new props not provided, use defaults
  const displayFeed = filteredFeed || feed;
  const reactions = feedReactions || {};
  
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

  const handleAddReaction = (postId, emoji) => {
    if (onAddReaction) {
      onAddReaction(postId, emoji);
      setShowReactionPicker(null);
    }
  };

  const getReactionCounts = (postId) => {
    const reactionKey = `${postId}_reactions`;
    const postReactions = reactions[reactionKey] || {};
    const counts = {};

    Object.values(postReactions).forEach(userReactions => {
      userReactions.forEach(emoji => {
        counts[emoji] = (counts[emoji] || 0) + 1;
      });
    });

    return counts;
  };

  const getUserReactions = (postId) => {
    const reactionKey = `${postId}_reactions`;
    const postReactions = reactions[reactionKey] || {};
    return postReactions[currentUser?.id] || [];
  };

  const achievementPosts = feed.filter(p => p.type === 'achievement' || p.isAuto);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{
          margin: 0,
          fontSize: '24px',
          fontWeight: '700',
          color: THEME.text,
          fontFamily: 'var(--font-display)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          Team Feed
          {unreadCount > 0 && (
            <span style={{
              background: THEME.danger,
              color: THEME.white,
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: '700',
            }}>
              {unreadCount}
            </span>
          )}
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setViewMode(viewMode === 'feed' ? 'achievements' : 'feed')}
            style={{
              padding: '8px 16px',
              background: viewMode === 'achievements' ? THEME.gradients.primary : THEME.secondary,
              border: 'none',
              borderRadius: '8px',
              color: viewMode === 'achievements' ? THEME.white : THEME.text,
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {viewMode === 'achievements' ? '🏆 Achievements' : '📰 Feed'}
          </button>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAsRead}
              style={{
                padding: '8px 16px',
                background: THEME.secondary,
                border: 'none',
                borderRadius: '8px',
                color: THEME.text,
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Mark Read
            </button>
          )}
        </div>
      </div>
      
      <div style={{
        background: THEME.white,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: THEME.shadows.layered,
        border: `1px solid ${THEME.border}`,
      }}>
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Share an update with the team..."
          maxLength={500}
          rows={3}
          style={{
            width: '100%',
            padding: '14px',
            border: `2px solid ${THEME.border}`,
            borderRadius: '10px',
            fontSize: '16px',
            fontFamily: 'var(--font-body)',
            boxSizing: 'border-box',
            resize: 'vertical',
            marginBottom: '12px',
            transition: 'all 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = THEME.primary;
            e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.primary}20`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = THEME.border;
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ 
            fontSize: '12px', 
            color: THEME.textLight,
            fontFamily: 'var(--font-body)',
          }}>
            {newPost.length}/500
          </span>
          <button
            onClick={handlePost}
            disabled={!newPost.trim()}
            onMouseDown={(e) => {
              if (newPost.trim()) e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            style={{
              padding: '12px 28px',
              background: newPost.trim() ? THEME.gradients.primary : THEME.border,
              border: 'none',
              borderRadius: '10px',
              color: THEME.white,
              fontSize: '14px',
              fontWeight: '600',
              cursor: newPost.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              boxShadow: newPost.trim() ? THEME.shadows.md : 'none',
              fontFamily: 'var(--font-body)',
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
            borderRadius: '16px',
            padding: '60px 20px',
            textAlign: 'center',
            color: THEME.textLight,
            boxShadow: THEME.shadows.md,
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}>
              💬
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: THEME.text,
              marginBottom: '8px',
              fontFamily: 'var(--font-display)',
            }}>
              No posts yet
            </div>
            <div style={{
              fontSize: '14px',
              color: THEME.textLight,
            }}>
              Be the first to share an update with the team!
            </div>
          </div>
        ) : (
          feed.map((post, index) => (
            <div
              key={post.id}
              style={{
                background: THEME.white,
                borderRadius: '16px',
                padding: '20px',
                boxShadow: THEME.shadows.md,
                borderLeft: post.isAuto ? `4px solid ${THEME.warning}` : `4px solid ${THEME.primary}`,
                animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = THEME.shadows.layered;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = THEME.shadows.md;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    color: THEME.text,
                    fontFamily: 'var(--font-display)',
                    marginBottom: '4px',
                  }}>
                    {post.userName}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: THEME.textLight,
                    fontFamily: 'var(--font-body)',
                  }}>
                    {formatRelativeTime(post.timestamp)}
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
                  fontSize: '15px',
                  color: THEME.text,
                  marginBottom: '12px',
                  lineHeight: '1.6',
                  fontFamily: 'var(--font-body)',
                }}>
                  {post.content}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', paddingTop: '12px', borderTop: `1px solid ${THEME.border}` }}>
                <button
                  onClick={() => onToggleLike(post.id)}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.9)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: (post.likes || []).includes(currentUser.id) 
                      ? THEME.gradients.primary 
                      : 'transparent',
                    border: (post.likes || []).includes(currentUser.id) 
                      ? 'none' 
                      : `1px solid ${THEME.border}`,
                    borderRadius: '8px',
                    color: (post.likes || []).includes(currentUser.id) ? THEME.white : THEME.textLight,
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  <ThumbsUp size={16} />
                  {(post.likes || []).length}
                </button>
                <button
                  onClick={() => setCommentingId(commentingId === post.id ? null : post.id)}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'scale(0.9)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
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
                    onMouseDown={(e) => {
                      if (newComment.trim()) e.currentTarget.style.transform = 'scale(0.95)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    style={{
                      padding: '8px 16px',
                      background: newComment.trim() ? THEME.gradients.primary : THEME.border,
                      border: 'none',
                      borderRadius: '8px',
                      color: THEME.white,
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease',
                      boxShadow: newComment.trim() ? THEME.shadows.sm : 'none',
                      fontFamily: 'var(--font-body)',
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

function Leaderboard({ users, dailyLogs, currentUser, theme }) {
  const THEME = theme;
  const [timeframe, setTimeframe] = useState('week');
  const [category, setCategory] = useState('overall');

  // Calculate leaderboard based on selected timeframe and category
  const leaderboard = useMemo(() => {
    // Determine date range
    let startDate;
    const today = getToday();

    switch (timeframe) {
      case 'today':
        startDate = today;
        break;
      case 'week':
        startDate = getWeekStart();
        break;
      case 'month':
        startDate = getMonthStart();
        break;
      case 'alltime':
        startDate = '2000-01-01'; // Far past date
        break;
      default:
        startDate = getWeekStart();
    }

    // Calculate scores
    const scores = users.map(user => {
      let reviews = 0, demos = 0, callbacks = 0;

      Object.entries(dailyLogs).forEach(([date, usersData]) => {
        if (date >= startDate && usersData[user.id]) {
          reviews += (usersData[user.id].reviews || 0);
          demos += (usersData[user.id].demos || 0);
          callbacks += (usersData[user.id].callbacks || 0);
        }
      });

      let total;
      if (category === 'reviews') total = reviews;
      else if (category === 'demos') total = demos;
      else if (category === 'callbacks') total = callbacks;
      else total = reviews + demos + callbacks;

      return { ...user, total, reviews, demos, callbacks };
    });

    return scores.sort((a, b) => b.total - a.total);
  }, [users, dailyLogs, timeframe, category]);

  const medals = [THEME.gold, THEME.silver, THEME.bronze];
  const medalGradients = [
    THEME.gradients.gold,
    'linear-gradient(135deg, #C0C0C0 0%, #E8E8E8 100%)',
    'linear-gradient(135deg, #CD7F32 0%, #E6A85C 100%)',
  ];

  const currentUserRank = leaderboard.findIndex(u => u.id === currentUser?.id) + 1;
  const leaderTotal = leaderboard[0]?.total || 0;

  return (
    <div>
      <h2 style={{
        margin: '0 0 20px 0',
        fontSize: '24px',
        fontWeight: '700',
        color: THEME.text,
        fontFamily: 'var(--font-display)',
      }}>
        Leaderboard
      </h2>

      {/* Timeframe Selector */}
      <div style={{
        background: THEME.white,
        borderRadius: '12px',
        padding: '6px',
        marginBottom: '16px',
        display: 'flex',
        gap: '6px',
        boxShadow: THEME.shadows.md,
      }}>
        {[
          { id: 'today', label: 'Today' },
          { id: 'week', label: 'This Week' },
          { id: 'month', label: 'This Month' },
          { id: 'alltime', label: 'All Time' },
        ].map(tf => (
          <button
            key={tf.id}
            onClick={() => setTimeframe(tf.id)}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: timeframe === tf.id ? THEME.gradients.primary : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: timeframe === tf.id ? THEME.white : THEME.text,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'var(--font-body)',
            }}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Category Tabs */}
      <div style={{
        background: THEME.white,
        borderRadius: '12px',
        padding: '6px',
        marginBottom: '16px',
        display: 'flex',
        gap: '6px',
        boxShadow: THEME.shadows.md,
      }}>
        {[
          { id: 'overall', label: 'Overall', icon: '🏆' },
          { id: 'reviews', label: 'Reviews', icon: '⭐' },
          { id: 'demos', label: 'Demos', icon: '📅' },
          { id: 'callbacks', label: 'Callbacks', icon: '📞' },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: category === cat.id ? THEME.gradients.success : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: category === cat.id ? THEME.white : THEME.text,
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'var(--font-body)',
            }}
          >
            <div>{cat.icon}</div>
            <div style={{ fontSize: '11px', marginTop: '2px' }}>{cat.label}</div>
          </button>
        ))}
      </div>

      {/* Current User Stats */}
      {currentUser && currentUserRank > 0 && (
        <div style={{
          background: THEME.gradients.primary,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          color: THEME.white,
          boxShadow: THEME.shadows.md,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>Your Rank</div>
              <div style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                #{currentUserRank}
              </div>
            </div>
            {currentUserRank > 1 && leaderboard[0] && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '4px' }}>Behind Leader</div>
                <div style={{ fontSize: '20px', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
                  {leaderTotal - (leaderboard.find(u => u.id === currentUser.id)?.total || 0)}
                </div>
              </div>
            )}
            {currentUserRank === 1 && (
              <div style={{ fontSize: '28px' }}>👑</div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div style={{ display: 'grid', gap: '12px' }}>
        {leaderboard.length === 0 ? (
          <div style={{
            background: THEME.white,
            borderRadius: '16px',
            padding: '60px 20px',
            textAlign: 'center',
            color: THEME.textLight,
            boxShadow: THEME.shadows.md,
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏆</div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: THEME.text,
              marginBottom: '8px',
              fontFamily: 'var(--font-display)',
            }}>
              No activity yet
            </div>
            <div style={{ fontSize: '14px', color: THEME.textLight }}>
              Start tracking to see rankings!
            </div>
          </div>
        ) : (
          leaderboard.map((user, index) => {
            const isTopThree = index < 3;
            const isCurrentUser = user.id === currentUser?.id;
            const prevRank = index; // Could track previous rankings for trend arrows

            return (
              <div
                key={user.id}
                style={{
                  background: isCurrentUser ? THEME.gradients.cardHover : THEME.white,
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: isTopThree ? THEME.shadows.layered : THEME.shadows.md,
                  border: isCurrentUser
                    ? `2px solid ${THEME.primary}`
                    : isTopThree
                      ? `2px solid ${medals[index]}`
                      : `1px solid ${THEME.border}`,
                  animation: `fadeInUp 0.4s ease-out ${index * 0.1}s both`,
                  transform: isTopThree ? 'scale(1.02)' : 'scale(1)',
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: isTopThree ? '56px' : '48px',
                    height: isTopThree ? '56px' : '48px',
                    background: isTopThree ? medalGradients[index] : THEME.secondary,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isTopThree ? '28px' : '20px',
                    fontWeight: '700',
                    color: isTopThree ? THEME.white : THEME.textLight,
                    boxShadow: isTopThree ? THEME.shadows.layered : THEME.shadows.md,
                    animation: isTopThree ? 'pulse 2s infinite' : 'none',
                  }}>
                    {isTopThree ? ['🥇', '🥈', '🥉'][index] : index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '17px',
                      fontWeight: '700',
                      color: THEME.text,
                      fontFamily: 'var(--font-display)',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      {user.name}
                      {isCurrentUser && ' (You)'}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: THEME.textLight,
                      fontFamily: 'var(--font-body)',
                    }}>
                      {user.role === 'manager' ? 'Manager' : 'Employee'}
                    </div>

                    {/* Category Breakdown Mini Chart */}
                    {category === 'overall' && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {user.reviews > 0 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: THEME.textLight,
                          }}>
                            <div style={{
                              width: Math.max(20, (user.reviews / user.total) * 60) + 'px',
                              height: '4px',
                              background: THEME.gradients.warning,
                              borderRadius: '2px',
                            }} />
                            {user.reviews}
                          </div>
                        )}
                        {user.demos > 0 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: THEME.textLight,
                          }}>
                            <div style={{
                              width: Math.max(20, (user.demos / user.total) * 60) + 'px',
                              height: '4px',
                              background: THEME.gradients.success,
                              borderRadius: '2px',
                            }} />
                            {user.demos}
                          </div>
                        )}
                        {user.callbacks > 0 && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            color: THEME.textLight,
                          }}>
                            <div style={{
                              width: Math.max(20, (user.callbacks / user.total) * 60) + 'px',
                              height: '4px',
                              background: THEME.gradients.primary,
                              borderRadius: '2px',
                            }} />
                            {user.callbacks}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '28px',
                      fontWeight: '700',
                      background: THEME.gradients.primary,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {user.total}
                    </div>
                    {index > 0 && leaderboard[index - 1] && (
                      <div style={{
                        fontSize: '11px',
                        color: THEME.textLight,
                        marginTop: '2px',
                      }}>
                        -{leaderboard[index - 1].total - user.total} behind
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ========================================
// HISTORY VIEW COMPONENT
// ========================================

function HistoryView({ currentUser, users, dailyLogs, theme }) {
  const THEME = theme;
  const [timeRange, setTimeRange] = useState('week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(currentUser?.id || '');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const isManager = currentUser?.role === 'manager';

  // Calculate date range based on selected time range
  const getDateRange = useCallback(() => {
    let startDate, endDate;

    switch (timeRange) {
      case 'today':
        startDate = endDate = getToday();
        break;
      case 'week':
        startDate = getWeekStart();
        endDate = getToday();
        break;
      case 'month':
        startDate = getMonthStart();
        endDate = getToday();
        break;
      case 'custom':
        startDate = customStartDate || getToday();
        endDate = customEndDate || getToday();
        break;
      default:
        startDate = getWeekStart();
        endDate = getToday();
    }

    return { startDate, endDate };
  }, [timeRange, customStartDate, customEndDate]);

  // Get data for selected user and date range
  const historyData = useMemo(() => {
    const { startDate, endDate } = getDateRange();
    const userId = isManager && selectedUserId === 'all' ? null : (selectedUserId || currentUser?.id);

    const dateArray = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      dateArray.push(dateStr);
      current.setDate(current.getDate() + 1);
    }

    return dateArray.map(date => {
      let reviews = 0, demos = 0, callbacks = 0;

      if (dailyLogs[date]) {
        if (userId) {
          // Single user
          const userLog = dailyLogs[date][userId];
          if (userLog) {
            reviews = userLog.reviews || 0;
            demos = userLog.demos || 0;
            callbacks = userLog.callbacks || 0;
          }
        } else {
          // All team (managers only)
          Object.values(dailyLogs[date]).forEach(userLog => {
            reviews += userLog.reviews || 0;
            demos += userLog.demos || 0;
            callbacks += userLog.callbacks || 0;
          });
        }
      }

      // Get goals (user's goals or sum of all users' goals)
      let reviewsGoal = 0, demosGoal = 0, callbacksGoal = 0;
      if (userId) {
        const user = users.find(u => u.id === userId);
        if (user?.goals) {
          reviewsGoal = user.goals.reviews || 5;
          demosGoal = user.goals.demos || 3;
          callbacksGoal = user.goals.callbacks || 10;
        }
      } else {
        users.forEach(user => {
          if (user.goals) {
            reviewsGoal += user.goals.reviews || 5;
            demosGoal += user.goals.demos || 3;
            callbacksGoal += user.goals.callbacks || 10;
          }
        });
      }

      return {
        date,
        reviews,
        demos,
        callbacks,
        total: reviews + demos + callbacks,
        goalsReviews: reviewsGoal,
        goalsDemos: demosGoal,
        goalsCallbacks: callbacksGoal,
        goalsTotal: reviewsGoal + demosGoal + callbacksGoal,
        goalsMet: reviews >= reviewsGoal && demos >= demosGoal && callbacks >= callbacksGoal,
      };
    }).reverse(); // Most recent first for the list
  }, [dailyLogs, users, currentUser, selectedUserId, isManager, getDateRange]);

  // Chart data (chronological order for chart)
  const chartData = useMemo(() => {
    return [...historyData].reverse().map(day => ({
      date: formatDate(day.date),
      Reviews: day.reviews,
      Demos: day.demos,
      Callbacks: day.callbacks,
    }));
  }, [historyData]);

  // Period summary statistics
  const periodStats = useMemo(() => {
    const totalReviews = historyData.reduce((sum, day) => sum + day.reviews, 0);
    const totalDemos = historyData.reduce((sum, day) => sum + day.demos, 0);
    const totalCallbacks = historyData.reduce((sum, day) => sum + day.callbacks, 0);
    const totalActivities = totalReviews + totalDemos + totalCallbacks;
    const goalsMetCount = historyData.filter(day => day.goalsMet).length;
    const totalDays = historyData.length;

    let bestDay = null;
    let bestDayTotal = 0;
    historyData.forEach(day => {
      if (day.total > bestDayTotal) {
        bestDayTotal = day.total;
        bestDay = day.date;
      }
    });

    const avgPerDay = totalDays > 0 ? (totalActivities / totalDays).toFixed(1) : 0;

    return {
      totalReviews,
      totalDemos,
      totalCallbacks,
      totalActivities,
      goalsMetCount,
      totalDays,
      bestDay,
      bestDayTotal,
      avgPerDay,
    };
  }, [historyData]);

  // Navigate to previous/next period
  const navigatePeriod = (direction) => {
    const { startDate, endDate } = getDateRange();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (direction === 'prev') {
      start.setDate(start.getDate() - diff);
      end.setDate(end.getDate() - diff);
    } else {
      start.setDate(start.getDate() + diff);
      end.setDate(end.getDate() + diff);
    }

    setCustomStartDate(start.toISOString().split('T')[0]);
    setCustomEndDate(end.toISOString().split('T')[0]);
    setTimeRange('custom');
  };

  return (
    <div>
      <h2 style={{
        margin: '0 0 20px 0',
        fontSize: '24px',
        fontWeight: '700',
        color: THEME.text,
        fontFamily: 'var(--font-display)',
      }}>
        Activity History
      </h2>

      {/* Time Range Selector */}
      <div style={{
        background: THEME.white,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: THEME.shadows.md,
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
            flexWrap: 'wrap',
          }}>
            {['today', 'week', 'month', 'custom'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  flex: range === 'custom' ? '0 0 auto' : 1,
                  padding: '12px 16px',
                  background: timeRange === range ? THEME.gradients.primary : THEME.secondary,
                  border: 'none',
                  borderRadius: '10px',
                  color: timeRange === range ? THEME.white : THEME.text,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: timeRange === range ? THEME.shadows.md : 'none',
                }}
              >
                {range === 'today' && 'Today'}
                {range === 'week' && 'This Week'}
                {range === 'month' && 'This Month'}
                {range === 'custom' && 'Custom'}
              </button>
            ))}
          </div>

          {timeRange === 'custom' && (
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  color: THEME.textLight,
                  marginBottom: '4px',
                  fontWeight: '600',
                }}>
                  From
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={getToday()}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${THEME.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div style={{ flex: 1, minWidth: '120px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  color: THEME.textLight,
                  marginBottom: '4px',
                  fontWeight: '600',
                }}>
                  To
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  max={getToday()}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${THEME.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          )}

          {/* Previous/Next Navigation */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '12px',
          }}>
            <button
              onClick={() => navigatePeriod('prev')}
              style={{
                flex: 1,
                padding: '10px',
                background: THEME.secondary,
                border: 'none',
                borderRadius: '8px',
                color: THEME.text,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              ← Previous
            </button>
            <button
              onClick={() => navigatePeriod('next')}
              disabled={getDateRange().endDate >= getToday()}
              style={{
                flex: 1,
                padding: '10px',
                background: getDateRange().endDate >= getToday() ? THEME.border : THEME.secondary,
                border: 'none',
                borderRadius: '8px',
                color: getDateRange().endDate >= getToday() ? THEME.textLight : THEME.text,
                fontSize: '14px',
                fontWeight: '600',
                cursor: getDateRange().endDate >= getToday() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Next →
            </button>
          </div>
        </div>

        {/* User Filter (Manager only) */}
        {isManager && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: THEME.textLight,
              marginBottom: '8px',
              fontWeight: '600',
            }}>
              View Data For
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: `1px solid ${THEME.border}`,
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                background: THEME.white,
                cursor: 'pointer',
              }}
            >
              <option value="all">All Team</option>
              {users.filter(u => u.role !== 'manager').map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Category Filter */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '12px',
            color: THEME.textLight,
            marginBottom: '8px',
            fontWeight: '600',
          }}>
            Filter by Category
          </label>
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}>
            {['all', 'reviews', 'demos', 'callbacks'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  flex: 1,
                  minWidth: '70px',
                  padding: '10px 12px',
                  background: selectedCategory === cat ? THEME.gradients.primary : THEME.secondary,
                  border: 'none',
                  borderRadius: '8px',
                  color: selectedCategory === cat ? THEME.white : THEME.text,
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedCategory === cat ? THEME.shadows.sm : 'none',
                }}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Period Summary Card */}
      <div style={{
        background: THEME.white,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: THEME.shadows.md,
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '18px',
          fontWeight: '700',
          color: THEME.text,
          fontFamily: 'var(--font-display)',
        }}>
          Period Summary
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px',
        }}>
          <div style={{
            background: THEME.gradients.background,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              background: THEME.gradients.primary,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: 'var(--font-mono)',
              marginBottom: '4px',
            }}>
              {periodStats.totalActivities}
            </div>
            <div style={{ fontSize: '12px', color: THEME.textLight, fontWeight: '600' }}>
              Total Activities
            </div>
          </div>

          <div style={{
            background: THEME.gradients.background,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              background: THEME.gradients.success,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: 'var(--font-mono)',
              marginBottom: '4px',
            }}>
              {periodStats.goalsMetCount}/{periodStats.totalDays}
            </div>
            <div style={{ fontSize: '12px', color: THEME.textLight, fontWeight: '600' }}>
              Goals Met
            </div>
          </div>

          <div style={{
            background: THEME.gradients.background,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              background: THEME.gradients.warning,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: 'var(--font-mono)',
              marginBottom: '4px',
            }}>
              {periodStats.avgPerDay}
            </div>
            <div style={{ fontSize: '12px', color: THEME.textLight, fontWeight: '600' }}>
              Avg per Day
            </div>
          </div>

          <div style={{
            background: THEME.gradients.background,
            borderRadius: '12px',
            padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              background: THEME.gradients.gold,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: 'var(--font-mono)',
              marginBottom: '4px',
            }}>
              {periodStats.bestDayTotal}
            </div>
            <div style={{ fontSize: '12px', color: THEME.textLight, fontWeight: '600' }}>
              Best Day
            </div>
            {periodStats.bestDay && (
              <div style={{ fontSize: '10px', color: THEME.textLight, marginTop: '2px' }}>
                {formatDate(periodStats.bestDay)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div style={{
        background: THEME.white,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: THEME.shadows.md,
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          fontSize: '18px',
          fontWeight: '700',
          color: THEME.text,
          fontFamily: 'var(--font-display)',
        }}>
          Trend Over Time
        </h3>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: THEME.textLight }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12, fill: THEME.textLight }} />
              <Tooltip
                contentStyle={{
                  background: THEME.white,
                  border: `1px solid ${THEME.border}`,
                  borderRadius: '8px',
                  boxShadow: THEME.shadows.md,
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              {(selectedCategory === 'all' || selectedCategory === 'reviews') && (
                <Line
                  type="monotone"
                  dataKey="Reviews"
                  stroke={THEME.warning}
                  strokeWidth={2}
                  dot={{ fill: THEME.warning, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
              {(selectedCategory === 'all' || selectedCategory === 'demos') && (
                <Line
                  type="monotone"
                  dataKey="Demos"
                  stroke={THEME.success}
                  strokeWidth={2}
                  dot={{ fill: THEME.success, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
              {(selectedCategory === 'all' || selectedCategory === 'callbacks') && (
                <Line
                  type="monotone"
                  dataKey="Callbacks"
                  stroke={THEME.primary}
                  strokeWidth={2}
                  dot={{ fill: THEME.primary, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: THEME.textLight,
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: THEME.text }}>
              No data available
            </div>
          </div>
        )}
      </div>

      {/* Day-by-Day List */}
      <div>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '700',
          color: THEME.text,
          fontFamily: 'var(--font-display)',
        }}>
          Day-by-Day Breakdown
        </h3>

        {historyData.length > 0 ? (
          <div style={{ display: 'grid', gap: '12px' }}>
            {historyData.map((day, index) => {
              const dayOfWeek = new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' });
              const hasActivity = day.total > 0;

              return (
                <div
                  key={day.date}
                  style={{
                    background: THEME.white,
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: THEME.shadows.md,
                    border: day.goalsMet ? `2px solid ${THEME.success}` : 'none',
                    animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
                    opacity: hasActivity ? 1 : 0.6,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}>
                    <div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: THEME.text,
                        fontFamily: 'var(--font-display)',
                      }}>
                        {formatDate(day.date)}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: THEME.textLight,
                        fontWeight: '600',
                      }}>
                        {dayOfWeek}
                      </div>
                    </div>

                    {day.goalsMet && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: THEME.gradients.success,
                        borderRadius: '8px',
                        color: THEME.white,
                        fontSize: '12px',
                        fontWeight: '700',
                      }}>
                        <span>★</span>
                        Goals Met
                      </div>
                    )}
                  </div>

                  {/* Category Breakdown */}
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {(selectedCategory === 'all' || selectedCategory === 'reviews') && (
                      <div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: THEME.text,
                          }}>
                            Reviews
                          </span>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            color: day.reviews >= day.goalsReviews ? THEME.success : THEME.danger,
                          }}>
                            {day.reviews} / {day.goalsReviews}
                          </span>
                        </div>
                        <div style={{
                          height: '8px',
                          background: THEME.secondary,
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min((day.reviews / day.goalsReviews) * 100, 100)}%`,
                            background: day.reviews >= day.goalsReviews ? THEME.gradients.success : THEME.gradients.warning,
                            transition: 'width 0.3s ease',
                            borderRadius: '4px',
                          }} />
                        </div>
                      </div>
                    )}

                    {(selectedCategory === 'all' || selectedCategory === 'demos') && (
                      <div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: THEME.text,
                          }}>
                            Demos
                          </span>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            color: day.demos >= day.goalsDemos ? THEME.success : THEME.danger,
                          }}>
                            {day.demos} / {day.goalsDemos}
                          </span>
                        </div>
                        <div style={{
                          height: '8px',
                          background: THEME.secondary,
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min((day.demos / day.goalsDemos) * 100, 100)}%`,
                            background: day.demos >= day.goalsDemos ? THEME.gradients.success : THEME.gradients.success,
                            transition: 'width 0.3s ease',
                            borderRadius: '4px',
                          }} />
                        </div>
                      </div>
                    )}

                    {(selectedCategory === 'all' || selectedCategory === 'callbacks') && (
                      <div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: THEME.text,
                          }}>
                            Callbacks
                          </span>
                          <span style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            color: day.callbacks >= day.goalsCallbacks ? THEME.success : THEME.danger,
                          }}>
                            {day.callbacks} / {day.goalsCallbacks}
                          </span>
                        </div>
                        <div style={{
                          height: '8px',
                          background: THEME.secondary,
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min((day.callbacks / day.goalsCallbacks) * 100, 100)}%`,
                            background: day.callbacks >= day.goalsCallbacks ? THEME.gradients.success : THEME.gradients.primary,
                            transition: 'width 0.3s ease',
                            borderRadius: '4px',
                          }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {!hasActivity && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: THEME.secondary,
                      borderRadius: '8px',
                      textAlign: 'center',
                      fontSize: '12px',
                      color: THEME.textLight,
                      fontStyle: 'italic',
                    }}>
                      No activity recorded
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            background: THEME.white,
            borderRadius: '16px',
            padding: '60px 20px',
            textAlign: 'center',
            color: THEME.textLight,
            boxShadow: THEME.shadows.md,
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: THEME.text,
              marginBottom: '8px',
              fontFamily: 'var(--font-display)',
            }}>
              No activity in this period
            </div>
            <div style={{ fontSize: '14px', color: THEME.textLight }}>
              Try selecting a different time range
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// ACTIVE USERS LIST COMPONENT
// ========================================

function ActiveUsersList({ activeUsers, currentUser, theme }) {
  const THEME = theme;
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
// CHATBOT COMPONENT WITH VOICE CHAT
// ========================================

/**
 * Format markdown text to JSX elements
 * Handles: **bold**, *italic*, `code`, ## headers
 */
const formatMarkdown = (text) => {
  if (!text || typeof text !== 'string') return text;

  // Process line by line to handle headers
  const lines = text.split('\n');
  
  return lines.map((line, lineIndex) => {
    if (!line.trim()) return <br key={`line-${lineIndex}`} />;

    // Check for headers
    if (line.startsWith('### ')) {
      return <h3 key={`line-${lineIndex}`} style={{ fontSize: '16px', fontWeight: '600', marginTop: '8px', marginBottom: '4px' }}>{formatInlineMarkdown(line.substring(4))}</h3>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={`line-${lineIndex}`} style={{ fontSize: '18px', fontWeight: '700', marginTop: '10px', marginBottom: '6px' }}>{formatInlineMarkdown(line.substring(3))}</h2>;
    }
    if (line.startsWith('# ')) {
      return <h1 key={`line-${lineIndex}`} style={{ fontSize: '20px', fontWeight: '700', marginTop: '12px', marginBottom: '8px' }}>{formatInlineMarkdown(line.substring(2))}</h1>;
    }

    // Regular line with inline formatting
    return <div key={`line-${lineIndex}`}>{formatInlineMarkdown(line)}</div>;
  });
};

/**
 * Format inline markdown: **bold**, *italic*, `code`
 */
const formatInlineMarkdown = (text) => {
  if (!text) return text;

  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Find the earliest markdown pattern
    let minIndex = Infinity;
    let match = null;
    let type = null;

    // Check for **bold**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index < minIndex) {
      minIndex = boldMatch.index;
      match = boldMatch;
      type = 'bold';
    }

    // Check for *italic* (not **)
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+?)\*(?!\*)/);
    if (italicMatch && italicMatch.index < minIndex) {
      minIndex = italicMatch.index;
      match = italicMatch;
      type = 'italic';
    }

    // Check for `code`
    const codeMatch = remaining.match(/`([^`]+?)`/);
    if (codeMatch && codeMatch.index < minIndex) {
      minIndex = codeMatch.index;
      match = codeMatch;
      type = 'code';
    }

    if (match && type) {
      // Add text before match
      if (minIndex > 0) {
        parts.push(remaining.substring(0, minIndex));
      }

      // Add formatted match
      if (type === 'bold') {
        parts.push(<strong key={key++}>{match[1]}</strong>);
      } else if (type === 'italic') {
        parts.push(<em key={key++}>{match[1]}</em>);
      } else if (type === 'code') {
        parts.push(<code key={key++} style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.1)', padding: '2px 4px', borderRadius: '3px' }}>{match[1]}</code>);
      }

      // Update remaining
      remaining = remaining.substring(minIndex + match[0].length);
    } else {
      // No more matches, add remaining text
      parts.push(remaining);
      break;
    }
  }

  return parts.length > 0 ? parts : text;
};

function Chatbot({ currentUser, todayStats, weekStats, onIncrement, appSettings, setAppSettings, theme }) {
  const THEME = theme;
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: isAIConfigured()
        ? "Hi! I'm your AI coach. I can help you with your goals, answer questions about the app, and provide motivation. What would you like to know?"
        : "AI chatbot is not configured. Please add your API key in Settings to enable AI features.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remainingRequests, setRemainingRequests] = useState(getRemainingRequests());
  // eslint-disable-next-line no-unused-vars
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [chatSessions, setChatSessions] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [chatMode, setChatMode] = useState('text'); // 'text' or 'voice' - kept for internal state tracking
  const [voiceStatus, setVoiceStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected', 'ready', 'listening', 'processing'
  const [audioLevel, setAudioLevel] = useState(0);
  const [voiceError, setVoiceError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const messagesEndRef = useRef(null);
  const saveDebounceRef = useRef(null);
  const voiceSessionRef = useRef(null);

  // Load saved model preference
  useEffect(() => {
    const loadModelPreference = async () => {
      try {
        const savedModel = await storage.get(`aiModel_${currentUser?.id}`, DEFAULT_MODEL);
        if (AVAILABLE_MODELS.find(m => m.value === savedModel)) {
          setSelectedModel(savedModel);
        }
      } catch (error) {
        console.error('Failed to load model preference:', error);
      }
    };
    if (currentUser) {
      loadModelPreference();
    }
  }, [currentUser]);

  // Chat persistence: Load chat sessions and current session
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!currentUser) return;

      try {
        const userId = currentUser.id;
        
        // Load chat sessions list
        const sessions = await storage.get(`chatSessions_${userId}`, []);
        setChatSessions(sessions);

        // Load current session or create new one
        const currentSession = sessions.length > 0 ? sessions[0] : null;
        
        if (currentSession) {
          // Load messages for current session
          const sessionMessages = await storage.get(`chatMessages_${userId}_${currentSession.id}`, null);
          if (sessionMessages && sessionMessages.length > 0) {
            setMessages(sessionMessages);
            setCurrentSessionId(currentSession.id);
          } else {
            // Create new session if messages are missing
            await createNewSession(userId);
          }
        } else {
          // Create new session if none exist
          await createNewSession(userId);
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
        // On error, create new session
        if (currentUser) {
          await createNewSession(currentUser.id);
        }
      }
    };

    loadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Helper function to create new chat session
  const createNewSession = useCallback(async (userId) => {
    const sessionId = `session_${Date.now()}`;
    const newSession = {
      id: sessionId,
      title: 'New Chat',
      createdAt: Date.now(),
      lastMessageAt: Date.now(),
      messageCount: 1,
      chatMode: 'text'
    };

    const welcomeMessage = {
      id: 'welcome',
      role: 'assistant',
      content: isAIConfigured() 
        ? "Hi! I'm your AI coach. I can help you with your goals, answer questions about the app, and provide motivation. What would you like to know?"
        : "AI chatbot is not configured. Please add REACT_APP_GEMINI_API_KEY to enable AI features.",
      timestamp: Date.now(),
    };

    const sessions = await storage.get(`chatSessions_${userId}`, []);
    const updatedSessions = [newSession, ...sessions];
    await storage.set(`chatSessions_${userId}`, updatedSessions);

    await storage.set(`chatMessages_${userId}_${sessionId}`, [welcomeMessage]);

    setCurrentSessionId(sessionId);
    setChatSessions(updatedSessions);
    setMessages([welcomeMessage]);
  }, []); // React state setters are stable, isAIConfigured is imported function

  // Helper function to save messages to storage
  const saveMessages = useCallback(async (messagesToSave, sessionId, userId) => {
    if (!sessionId || !userId || !messagesToSave || messagesToSave.length === 0) return;

    try {
      // Save messages
      await storage.set(`chatMessages_${userId}_${sessionId}`, messagesToSave);

      // Update session metadata
      const sessions = await storage.get(`chatSessions_${userId}`, []);
      const sessionIndex = sessions.findIndex(s => s.id === sessionId);
      
      if (sessionIndex >= 0) {
        const session = sessions[sessionIndex];
        const firstUserMessage = messagesToSave.find(m => m.role === 'user');
        const title = firstUserMessage 
          ? (firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? '...' : ''))
          : 'New Chat';

        sessions[sessionIndex] = {
          ...session,
          title,
          lastMessageAt: Date.now(),
          messageCount: messagesToSave.length
        };

        // Move updated session to top
        const updatedSession = sessions.splice(sessionIndex, 1)[0];
        sessions.unshift(updatedSession);

        await storage.set(`chatSessions_${userId}`, sessions);
        setChatSessions(sessions);
      }
    } catch (error) {
      console.error('Failed to save messages:', error);
    }
  }, []);

  // Auto-save messages with debouncing for assistant messages
  useEffect(() => {
    if (!currentUser || !currentSessionId || messages.length === 0) return;

    // Clear existing debounce
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }

    // Save immediately for user messages, debounce for assistant messages
    const lastMessage = messages[messages.length - 1];
    const isUserMessage = lastMessage && lastMessage.role === 'user';

    if (isUserMessage) {
      // Save immediately on user message
      saveMessages(messages, currentSessionId, currentUser.id);
    } else {
      // Debounce assistant messages (save after 1s of no new messages)
      saveDebounceRef.current = setTimeout(() => {
        saveMessages(messages, currentSessionId, currentUser.id);
      }, 1000);
    }

    // Cleanup on unmount
    return () => {
      if (saveDebounceRef.current) {
        clearTimeout(saveDebounceRef.current);
      }
    };
  }, [messages, currentSessionId, currentUser, saveMessages]);

  // Delete a specific chat session
  const deleteSession = useCallback(async (sessionId) => {
    if (!currentUser || !sessionId) return;
    
    if (!window.confirm('Delete this conversation? This action cannot be undone.')) {
      return;
    }

    try {
      const userId = currentUser.id;
      
      // Delete messages for this session from IndexedDB
      await storage.delete(`chatMessages_${userId}_${sessionId}`);
      
      // Remove session from sessions list
      const sessions = await storage.get(`chatSessions_${userId}`, []);
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      await storage.set(`chatSessions_${userId}`, updatedSessions);
      
      setChatSessions(updatedSessions);
      
      // If deleted session was current, switch to another or create new
      if (currentSessionId === sessionId) {
        if (updatedSessions.length > 0) {
          // Load the first available session
          const firstSession = updatedSessions[0];
          const sessionMessages = await storage.get(`chatMessages_${userId}_${firstSession.id}`, []);
          setMessages(sessionMessages || []);
          setCurrentSessionId(firstSession.id);
        } else {
          // No sessions left, create a new one
          await createNewSession(userId);
        }
      }
      
      // Show success message if we have a way to show toasts
      // Note: showToast might not be available in Chatbot component scope
      console.log('Session deleted successfully');
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete conversation. Please try again.');
    }
  }, [currentUser, currentSessionId, createNewSession]);

  // Delete all conversations for current user
  const deleteAllConversations = useCallback(async () => {
    if (!currentUser) return;
    
    if (!window.confirm('Delete ALL conversation history? This action cannot be undone.')) {
      return;
    }

    try {
      const userId = currentUser.id;
      
      // Get all sessions to delete their messages
      const sessions = await storage.get(`chatSessions_${userId}`, []);
      
      // Delete all message storage keys
      for (const session of sessions) {
        await storage.delete(`chatMessages_${userId}_${session.id}`);
      }
      
      // Delete sessions list
      await storage.delete(`chatSessions_${userId}`);
      
      // Clear state
      setChatSessions([]);
      setCurrentSessionId(null);
      
      // Create a new session
      await createNewSession(userId);
      
      console.log('All conversations deleted successfully');
    } catch (error) {
      console.error('Failed to delete all conversations:', error);
      alert('Failed to delete conversation history. Please try again.');
    }
  }, [currentUser, createNewSession]);

  // Save model preference
  // eslint-disable-next-line no-unused-vars
  const saveModelPreference = async (model) => {
    try {
      if (currentUser) {
        await storage.set(`aiModel_${currentUser.id}`, model);
      }
    } catch (error) {
      console.error('Failed to save model preference:', error);
    }
  };

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

  // Cleanup voice session on unmount
  useEffect(() => {
    return () => {
      if (voiceSessionRef.current) {
        voiceSessionRef.current.disconnect();
      }
    };
  }, []);

  // Auto-start listening when voice session becomes ready
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (voiceStatus === 'ready' && voiceSessionRef.current && !autoStartedRef.current) {
      // Small delay to ensure connection is fully stable
      const timer = setTimeout(async () => {
        try {
          await voiceSessionRef.current.startListening();
          autoStartedRef.current = true;
        } catch (error) {
          console.error('Auto-start listening failed:', error);
          setVoiceError(error.message || 'Failed to start listening');
        }
      }, 150);
      return () => clearTimeout(timer);
    }
    // Reset auto-start flag when disconnected
    if (voiceStatus === 'disconnected') {
      autoStartedRef.current = false;
    }
  }, [voiceStatus]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !isAIConfigured()) return;

    // If voice session is active, send text via Live API
    if (voiceSessionRef.current && voiceStatus !== 'disconnected') {
      try {
        // If AI is speaking, interrupt it before sending text
        if (voiceStatus === 'processing') {
          voiceSessionRef.current.interrupt();
          setVoiceStatus('ready');
        }
        
        const userMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: input.trim(),
          timestamp: Date.now(),
          isVoice: false, // Text message via voice session
        };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        voiceSessionRef.current.sendText(input.trim());
        return;
      } catch (error) {
        console.error('Failed to send text via voice session:', error);
        // Fall through to text API fallback
      }
    }

    // Default: use text API
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

  // Load a specific chat session
  const loadSession = async (sessionId) => {
    if (!currentUser || !sessionId) return;

    try {
      const userId = currentUser.id;
      const sessionMessages = await storage.get(`chatMessages_${userId}_${sessionId}`, []);
      
      if (sessionMessages && sessionMessages.length > 0) {
        setMessages(sessionMessages);
        setCurrentSessionId(sessionId);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  // Create new chat session
  const handleNewChat = async () => {
    if (!currentUser) return;
    await createNewSession(currentUser.id);
  };

  // Voice chat handlers
  const handleStartVoiceChat = async () => {
    if (!isAIConfigured()) {
      setVoiceError('Please configure your API key in Settings first.');
      return;
    }

    if (!isVoiceChatSupported()) {
      setVoiceError('Voice chat is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const apiKey = getAPIKey();
    if (!apiKey) {
      setVoiceError('API key not found. Please configure it in Settings.');
      return;
    }

    setVoiceError(null);
    setVoiceStatus('connecting');

    try {
      const session = createVoiceChatSession(apiKey, {
        model: appSettings?.ai?.voiceModel || 'gemini-2.5-flash-native-audio-preview-12-2025',
        voice: appSettings?.ai?.voiceName || 'Puck',
        voiceChatSettings: appSettings?.ai?.voiceChatSettings || {
          startOfSpeechSensitivity: 'START_SENSITIVITY_UNSPECIFIED',
          endOfSpeechSensitivity: 'END_SENSITIVITY_UNSPECIFIED',
          silenceDurationMs: 500,
          prefixPaddingMs: 100,
        },
        generationConfig: appSettings?.ai?.generationConfig || {
          temperature: 1.0,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          candidateCount: 1,
          presencePenalty: 0.0,
          frequencyPenalty: 0.0,
        },
        systemInstruction: `You are a helpful AI voice coach for Window Depot Milwaukee's goal tracking app.
The current user is ${currentUser?.name || 'User'} (${currentUser?.role || 'employee'}).
Today's stats: Reviews: ${todayStats?.reviews || 0}, Demos: ${todayStats?.demos || 0}, Callbacks: ${todayStats?.callbacks || 0}.
Goals: Reviews: ${currentUser?.goals?.reviews || 0}, Demos: ${currentUser?.goals?.demos || 0}, Callbacks: ${currentUser?.goals?.callbacks || 0}.

Your role is to:
- Provide motivation and coaching through natural conversation
- Help with role-playing exercises for sales calls and customer interactions
- Give feedback on communication skills
- Be encouraging, professional, and supportive
Keep responses conversational and concise for voice interaction.`,
        onStatusChange: (status) => {
          setVoiceStatus(status);
        },
        onTranscript: (text, role, isStreaming = false) => {
          setMessages(prev => {
            const messageRole = role === 'assistant' ? 'assistant' : 'user';
            
            // Find the last streaming message from the same role (search backwards for efficiency)
            let lastStreamingIndex = -1;
            for (let i = prev.length - 1; i >= 0; i--) {
              const msg = prev[i];
              if (msg.role === messageRole && msg.isStreaming && msg.isVoice) {
                lastStreamingIndex = i;
                break;
              }
            }
            
            // If streaming and we found a matching streaming message, update it (preserve timestamp)
            if (isStreaming && lastStreamingIndex >= 0) {
              return prev.map((msg, idx) => 
                idx === lastStreamingIndex 
                  ? { ...msg, content: text } // Update content only, keep original timestamp
                  : msg
              );
            }
            
            // If not streaming and we found a matching streaming message, finalize it (preserve timestamp and ID)
            if (!isStreaming && lastStreamingIndex >= 0) {
              return prev.map((msg, idx) => 
                idx === lastStreamingIndex 
                  ? { ...msg, content: text, isStreaming: false } // Finalize, keep original timestamp and ID
                  : msg
              );
            }
            
            // Create new message (no matching streaming message found)
            const newMessage = {
              id: `${messageRole}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              role: messageRole,
              content: text,
              timestamp: Date.now(),
              isVoice: true,
              isStreaming: isStreaming,
            };
            
            // Sort messages by timestamp after adding new message
            const updated = [...prev, newMessage];
            return updated.sort((a, b) => a.timestamp - b.timestamp);
          });
        },
        onError: (error) => {
          setVoiceError(error);
          setVoiceStatus('disconnected');
        },
        onAudioLevel: (level) => {
          setAudioLevel(level);
        },
      });

      voiceSessionRef.current = session;
      await session.connect();
      setChatMode('voice');
    } catch (error) {
      console.error('Failed to start voice chat:', error);
      setVoiceError(error.message || 'Failed to connect to voice chat');
      setVoiceStatus('disconnected');
    }
  };

  const handleToggleListening = async () => {
    if (!voiceSessionRef.current) return;

    if (voiceStatus === 'listening') {
      voiceSessionRef.current.stopListening();
    } else if (voiceStatus === 'ready' || voiceStatus === 'connected') {
      try {
        await voiceSessionRef.current.startListening();
      } catch (error) {
        setVoiceError(error.message);
      }
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleEndVoiceChat = () => {
    if (voiceSessionRef.current) {
      voiceSessionRef.current.disconnect();
      voiceSessionRef.current = null;
    }
    setVoiceStatus('disconnected');
    setChatMode('text'); // Keep for internal state tracking
    setAudioLevel(0);
  };

  const voiceChatEnabled = appSettings?.ai?.voiceChatEnabled !== false && isVoiceChatSupported();

  const getStatusText = () => {
    switch (voiceStatus) {
      case 'disconnected': return 'Disconnected';
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Connected, setting up...';
      case 'ready': return 'Ready';
      case 'listening': return 'Listening...';
      case 'processing': return 'AI is responding...';
      default: return 'Disconnected';
    }
  };

  const getStatusColor = () => {
    switch (voiceStatus) {
      case 'listening': return THEME.success;
      case 'processing': return THEME.warning;
      case 'ready': return THEME.primary;
      default: return THEME.textLight;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: THEME.text, letterSpacing: '-0.02em' }}>
          AI Coach
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isAIConfigured() && voiceStatus === 'disconnected' && (
            <div style={{ 
              fontSize: '12px', 
              color: THEME.textLight,
              padding: '6px 12px',
              background: THEME.secondary,
              borderRadius: '6px',
              fontWeight: '500'
            }}>
              {remainingRequests} requests/min
            </div>
          )}
          <div style={{ 
            fontSize: '12px', 
            color: getStatusColor(), 
            fontWeight: '600',
            padding: '6px 12px',
            background: voiceStatus === 'disconnected' ? 'rgba(108, 117, 125, 0.1)' : voiceStatus === 'listening' ? 'rgba(40, 167, 69, 0.1)' : voiceStatus === 'processing' ? 'rgba(255, 193, 7, 0.1)' : 'rgba(0, 123, 255, 0.1)',
            borderRadius: '6px',
            transition: 'all 0.2s ease'
          }}>
            {getStatusText()}
          </div>
          <button
            onClick={() => setShowChatSettings(!showChatSettings)}
            style={{
              padding: '8px 10px',
              background: showChatSettings ? THEME.primary : THEME.secondary,
              color: showChatSettings ? THEME.white : THEME.text,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!showChatSettings) {
                e.currentTarget.style.background = 'rgba(0, 123, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!showChatSettings) {
                e.currentTarget.style.background = THEME.secondary;
              }
            }}
          >
            <Settings size={14} />
            Settings
          </button>
        </div>
      </div>

      {/* Chat Settings Panel */}
      {showChatSettings && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: THEME.white,
          border: `1px solid ${THEME.border}`,
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {/* Voice Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: THEME.text, marginBottom: '6px' }}>
                <Volume2 size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                AI Voice
              </label>
              <select
                value={appSettings?.ai?.voiceName || 'Puck'}
                onChange={(e) => {
                  const newSettings = {
                    ...appSettings,
                    ai: {
                      ...appSettings.ai,
                      voiceName: e.target.value,
                    },
                  };
                  setAppSettings(newSettings);
                  storage.set('appSettings', newSettings);
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${THEME.border}`,
                  background: THEME.white,
                  color: THEME.text,
                  fontSize: '13px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {VOICE_OPTIONS.map(voice => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} - {voice.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Selection (for text/voice model) */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: THEME.text, marginBottom: '6px' }}>
                <Bot size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Voice Model
              </label>
              <select
                value={appSettings?.ai?.voiceModel || 'gemini-2.5-flash-native-audio-preview-12-2025'}
                onChange={(e) => {
                  const newSettings = {
                    ...appSettings,
                    ai: {
                      ...appSettings.ai,
                      voiceModel: e.target.value,
                    },
                  };
                  setAppSettings(newSettings);
                  storage.set('appSettings', newSettings);
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: `1px solid ${THEME.border}`,
                  background: THEME.white,
                  color: THEME.text,
                  fontSize: '13px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {LIVE_MODELS_FALLBACK.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {voiceError && (
        <div style={{
          marginBottom: '16px',
          padding: '14px 16px',
          background: 'linear-gradient(135deg, #fee 0%, #fdd 100%)',
          border: '1px solid rgba(220, 53, 69, 0.3)',
          borderRadius: '10px',
          fontSize: '13px',
          color: '#721C24',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 2px 8px rgba(220, 53, 69, 0.15)',
          animation: 'fadeIn 0.3s ease-in',
        }}>
          <X size={18} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, lineHeight: '1.5' }}>{voiceError}</div>
          <button
            onClick={() => setVoiceError(null)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(220, 53, 69, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            style={{
              marginLeft: 'auto',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: '4px',
              transition: 'background 0.2s ease',
            }}
          >
            <X size={16} color="#721C24" />
          </button>
        </div>
      )}

      <div style={{
        background: THEME.white,
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 240px)',
        minHeight: '600px',
        maxHeight: 'none',
      }}>
        {/* Chat History Dropdown */}
        {currentUser && chatSessions.length > 0 && (
          <div style={{ 
            marginBottom: '16px', 
            display: 'flex', 
            gap: '8px', 
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <select
              value={currentSessionId || ''}
              onChange={(e) => {
                if (e.target.value) {
                  loadSession(e.target.value);
                }
              }}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid ${THEME.border}`,
                background: THEME.white,
                color: THEME.text,
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {chatSessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title} ({new Date(session.lastMessageAt).toLocaleDateString()})
                </option>
              ))}
            </select>
            <button
              onClick={handleNewChat}
              style={{
                padding: '8px 16px',
                background: THEME.primary,
                border: 'none',
                borderRadius: '6px',
                color: THEME.white,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = THEME.primaryDark;
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = THEME.primary;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Plus size={16} />
              New Chat
            </button>
            {currentSessionId && (
              <button
                onClick={() => deleteSession(currentSessionId)}
                style={{
                  padding: '8px 12px',
                  background: 'transparent',
                  border: `1px solid ${THEME.danger}`,
                  borderRadius: '6px',
                  color: THEME.danger,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = THEME.danger;
                  e.currentTarget.style.color = THEME.white;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = THEME.danger;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                title="Delete this conversation"
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
            {chatSessions.length > 1 && (
              <button
                onClick={deleteAllConversations}
                style={{
                  padding: '8px 12px',
                  background: 'transparent',
                  border: `1px solid ${THEME.textLight}`,
                  borderRadius: '6px',
                  color: THEME.textLight,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = THEME.danger;
                  e.currentTarget.style.borderColor = THEME.danger;
                  e.currentTarget.style.color = THEME.white;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = THEME.textLight;
                  e.currentTarget.style.color = THEME.textLight;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                title="Delete all conversations"
              >
                <Trash2 size={16} />
                Clear All
              </button>
            )}
          </div>
        )}

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
                marginBottom: '20px',
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                animation: 'fadeInUp 0.3s ease-out',
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: message.role === 'user' ? THEME.primary : THEME.secondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              }}>
                {message.role === 'user' ? (
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: THEME.white,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: THEME.primary,
                  }}>
                    {currentUser?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                ) : (
                  <Bot size={20} color={THEME.primary} />
                )}
              </div>
              <div style={{
                flex: 1,
                background: message.role === 'user' ? THEME.primary : THEME.secondary,
                color: message.role === 'user' ? THEME.white : THEME.text,
                padding: '14px 18px',
                borderRadius: message.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                maxWidth: '80%',
                wordWrap: 'break-word',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}>
                {message.isVoice && (
                  <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mic size={12} />
                    Voice
                  </div>
                )}
                <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                  {formatMarkdown(message.content)}
                </div>
                {message.isError && (
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '6px', paddingTop: '6px', borderTop: `1px solid ${message.role === 'user' ? 'rgba(255, 255, 255, 0.2)' : THEME.border}` }}>
                    Error occurred
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', animation: 'fadeInUp 0.3s ease-out' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: THEME.secondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
              }}>
                <Bot size={20} color={THEME.primary} />
              </div>
              <div style={{
                background: THEME.secondary,
                padding: '14px 18px',
                borderRadius: '16px 16px 16px 4px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              }}>
                <div style={{ 
                  fontSize: '14px', 
                  color: THEME.textLight,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: THEME.primary,
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}></span>
                  <span style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: THEME.primary,
                    animation: 'pulse 1.5s ease-in-out infinite 0.2s',
                  }}></span>
                  <span style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: THEME.primary,
                    animation: 'pulse 1.5s ease-in-out infinite 0.4s',
                  }}></span>
                  <span style={{ marginLeft: '4px' }}>Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Unified Input Area - Text and Voice */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isAIConfigured() ? "Ask me anything about your goals or the app..." : "AI not configured"}
            disabled={isLoading || !isAIConfigured() || voiceStatus === 'connecting'}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            {/* Microphone Button */}
            {voiceChatEnabled && (
              <button
                onClick={() => {
                  if (voiceStatus === 'disconnected') {
                    handleStartVoiceChat();
                  } else if (voiceStatus === 'listening') {
                    handleToggleListening();
                  } else if (voiceStatus === 'ready') {
                    handleToggleListening();
                  }
                }}
                disabled={voiceStatus === 'connecting' || voiceStatus === 'connected' || voiceStatus === 'processing'}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.background = voiceStatus === 'listening' 
                      ? `linear-gradient(135deg, #c82333 0%, #a02133 100%)`
                      : `linear-gradient(135deg, #0056b3 0%, #004085 100%)`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.background = voiceStatus === 'listening'
                    ? `linear-gradient(135deg, ${THEME.danger} 0%, #c82333 100%)`
                    : voiceStatus !== 'disconnected'
                    ? `linear-gradient(135deg, ${THEME.primary} 0%, #0056b3 100%)`
                    : THEME.primary;
                }}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: voiceStatus === 'listening'
                    ? `linear-gradient(135deg, ${THEME.danger} 0%, #c82333 100%)`
                    : voiceStatus !== 'disconnected'
                    ? `linear-gradient(135deg, ${THEME.primary} 0%, #0056b3 100%)`
                    : THEME.primary,
                  border: 'none',
                  cursor: (voiceStatus === 'disconnected' || voiceStatus === 'ready' || voiceStatus === 'listening') ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: voiceStatus === 'listening'
                    ? `0 0 0 ${4 + audioLevel * 10}px rgba(220,53,69,0.25), 0 4px 12px rgba(220,53,69,0.3)`
                    : voiceStatus !== 'disconnected'
                    ? '0 4px 12px rgba(0, 123, 255, 0.25)'
                    : '0 4px 12px rgba(0, 123, 255, 0.2)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: 'scale(1)',
                  opacity: voiceStatus === 'connecting' || voiceStatus === 'connected' || voiceStatus === 'processing' ? 0.6 : 1,
                }}
                title={
                  voiceStatus === 'disconnected' ? 'Start voice chat' :
                  voiceStatus === 'listening' ? 'Stop listening' :
                  voiceStatus === 'ready' ? 'Start listening' :
                  voiceStatus === 'connecting' ? 'Connecting...' :
                  'Voice chat active'
                }
              >
                {voiceStatus === 'listening' ? (
                  <MicOff size={20} color={THEME.white} />
                ) : (
                  <Mic size={20} color={THEME.white} />
                )}
              </button>
            )}
            {/* Interrupt Button - Show when AI is speaking */}
            {voiceStatus === 'processing' && voiceSessionRef.current && (
              <button
                onClick={() => {
                  if (voiceSessionRef.current) {
                    voiceSessionRef.current.interrupt();
                    setVoiceStatus('ready');
                  }
                }}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: THEME.warning,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(255, 193, 7, 0.25)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e0a800';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = THEME.warning;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Interrupt AI speech"
              >
                <Square size={18} color={THEME.white} />
              </button>
            )}
            {/* Stop Button - Show when voice chat is active */}
            {voiceStatus !== 'disconnected' && (
              <button
                onClick={handleEndVoiceChat}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  background: THEME.danger,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(220, 53, 69, 0.25)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#c82333';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = THEME.danger;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Stop voice chat"
              >
                <X size={18} color={THEME.white} />
              </button>
            )}
            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !isAIConfigured() || voiceStatus === 'connecting'}
              style={{
                padding: '12px',
                minWidth: '48px',
                height: '48px',
                background: (input.trim() && !isLoading && isAIConfigured() && voiceStatus !== 'connecting') ? THEME.primary : THEME.border,
                border: 'none',
                borderRadius: '8px',
                color: THEME.white,
                fontSize: '14px',
                fontWeight: '600',
                cursor: (input.trim() && !isLoading && isAIConfigured() && voiceStatus !== 'connecting') ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: (input.trim() && !isLoading && isAIConfigured() && voiceStatus !== 'connecting') ? '0 2px 8px rgba(0, 123, 255, 0.2)' : 'none',
              }}
            >
              <Send size={18} />
            </button>
          </div>
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
            Configure your Gemini API key in Settings to enable AI features
          </div>
        )}
      </div>

      {/* Role-Playing Prompts */}
      {voiceStatus === 'ready' && (
        <div style={{
          marginTop: '16px',
          background: THEME.accent,
          borderRadius: '12px',
          padding: '16px',
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: THEME.text }}>
            Try these voice role-plays:
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {[
              'Practice a cold call intro',
              'Handle an objection about price',
              'Schedule a follow-up appointment',
              'Close a sale',
            ].map((prompt, index) => (
              <button
                key={index}
                onClick={() => {
                  if (voiceSessionRef.current && voiceStatus === 'ready') {
                    voiceSessionRef.current.sendText(`Let's role-play: ${prompt}`);
                  }
                }}
                style={{
                  padding: '8px 12px',
                  background: THEME.white,
                  border: `1px solid ${THEME.border}`,
                  borderRadius: '16px',
                  fontSize: '12px',
                  color: THEME.text,
                  cursor: 'pointer',
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================
// TEAM VIEW COMPONENT (Manager Only)
// ========================================

function TeamView({ users, dailyLogs, theme }) {
  const THEME = theme;
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
                borderRadius: '16px',
                padding: '24px',
                boxShadow: THEME.shadows.md,
                border: `1px solid ${THEME.border}`,
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = THEME.shadows.layered;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = THEME.shadows.md;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ marginBottom: '16px' }}>
                <div style={{ 
                  fontSize: '20px', 
                  fontWeight: '700', 
                  color: THEME.text, 
                  marginBottom: '6px',
                  fontFamily: 'var(--font-display)',
                }}>
                  {user.name}
                </div>
                <div style={{ 
                  fontSize: '15px', 
                  color: THEME.textLight,
                  fontFamily: 'var(--font-body)',
                }}>
                  {total} / {goalTotal} activities today
                </div>
              </div>
              
              <div style={{
                height: '12px',
                background: THEME.secondary,
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '16px',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(progress, 100)}%`,
                  background: progress >= 100 
                    ? THEME.gradients.success 
                    : progress >= 50 
                      ? THEME.gradients.warning 
                      : THEME.gradients.primary,
                  transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: '8px',
                }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                {CATEGORIES.map((category, index) => {
                  const count = stats[category.id] || 0;
                  const goal = user.goals[category.id];
                  const Icon = category.icon;
                  
                  let gradient = category.color;
                  if (category.id === 'reviews') gradient = THEME.gradients.warning;
                  else if (category.id === 'demos') gradient = THEME.gradients.success;
                  else if (category.id === 'callbacks') gradient = THEME.gradients.primary;
                  
                  return (
                    <div
                      key={category.id}
                      style={{
                        padding: '12px',
                        background: gradient,
                        borderRadius: '12px',
                        textAlign: 'center',
                        boxShadow: THEME.shadows.sm,
                        animation: `fadeInUp 0.3s ease-out ${index * 0.1}s both`,
                      }}
                    >
                      <Icon size={20} color={THEME.white} style={{ marginBottom: '6px' }} />
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '700', 
                        color: THEME.white,
                        fontFamily: 'var(--font-mono)',
                      }}>
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

function AdminPanel({ users, onCreateUser, onDeleteUser, onUpdateGoals, onExport, theme }) {
  const THEME = theme;
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
        <h2 style={{ 
          margin: 0, 
          fontSize: '24px', 
          fontWeight: '700', 
          color: THEME.text,
          fontFamily: 'var(--font-display)',
        }}>
          Admin Panel
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onExport}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            style={{
              padding: '12px 24px',
              background: THEME.gradients.success,
              border: 'none',
              borderRadius: '10px',
              color: THEME.white,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              boxShadow: THEME.shadows.md,
              fontFamily: 'var(--font-body)',
            }}
          >
            <Download size={20} />
            Export
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            style={{
              padding: '12px 24px',
              background: THEME.gradients.primary,
              border: 'none',
              borderRadius: '10px',
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

function Reports({ users, dailyLogs, appointments, theme }) {
  const THEME = theme;
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyLogs, timeRange]);
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '24px', 
          fontWeight: '700', 
          color: THEME.text,
          fontFamily: 'var(--font-display)',
        }}>
          Reports
        </h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          style={{
            padding: '10px 18px',
            border: `2px solid ${THEME.border}`,
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            background: THEME.white,
            fontFamily: 'var(--font-body)',
            transition: 'all 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = THEME.primary;
            e.currentTarget.style.boxShadow = `0 0 0 3px ${THEME.primary}20`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = THEME.border;
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>
      
      <div style={{
        background: THEME.white,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: THEME.shadows.md,
        border: `1px solid ${THEME.border}`,
      }}>
        <h3 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '18px', 
          fontWeight: '700', 
          color: THEME.text,
          fontFamily: 'var(--font-display)',
        }}>
          Team Performance
        </h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="total" fill="url(#gradientBar)" radius={[10, 10, 0, 0]}>
                <defs>
                  <linearGradient id="gradientBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={THEME.primary} />
                    <stop offset="100%" stopColor={THEME.primaryLight} />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px', 
            color: THEME.textLight,
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}>
              📊
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: THEME.text,
              marginBottom: '8px',
              fontFamily: 'var(--font-display)',
            }}>
              No data available
            </div>
            <div style={{
              fontSize: '14px',
              color: THEME.textLight,
            }}>
              Start tracking to see performance reports
            </div>
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
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px', 
            color: THEME.textLight,
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}>
              📈
            </div>
            <div style={{
              fontSize: '18px',
              fontWeight: '600',
              color: THEME.text,
              marginBottom: '8px',
              fontFamily: 'var(--font-display)',
            }}>
              No activity data
            </div>
            <div style={{
              fontSize: '14px',
              color: THEME.textLight,
            }}>
              Activity will appear here once team members start tracking
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================
// SETTINGS COMPONENT
// ========================================

function SettingsPage({ settings, onSaveSettings, currentThemeMode, theme }) {
  const THEME = theme || { /* fallback */ primary: '#0056A4', secondary: '#F5F7FA', text: '#1A1A2E', textLight: '#6B7280', border: '#E5E7EB', white: '#FFFFFF', accent: '#E8F4FD', success: '#28A745', warning: '#FFC107', danger: '#DC3545', shadows: { md: '0 2px 8px rgba(0, 0, 0, 0.08)' }, gradients: { primary: 'linear-gradient(135deg, #0056A4 0%, #4A90D9 100%)' } };
  const [localSettings, setLocalSettings] = useState({ ...settings, themeMode: currentThemeMode });
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [textModels, setTextModels] = useState(TEXT_MODELS);
  const [liveModels, setLiveModels] = useState(LIVE_MODELS_FALLBACK);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState(null);

  // Update local settings when props change
  useEffect(() => {
    setLocalSettings(prev => ({ ...prev, ...settings, themeMode: currentThemeMode }));
  }, [settings, currentThemeMode]);

  // Fetch available models when API key is available
  useEffect(() => {
    const loadModels = async () => {
      const apiKey = localSettings.ai.apiKey || settings.ai.apiKey;
      if (apiKey && apiKey.length >= 10) {
        setIsLoadingModels(true);
        setModelsError(null);
        try {
          const { textModels: fetchedText, liveModels: fetchedLive } = await fetchAvailableModels(apiKey);
          setTextModels(fetchedText);
          setLiveModels(fetchedLive);
          console.log('Loaded models:', { text: fetchedText.length, live: fetchedLive.length });
        } catch (error) {
          console.error('Failed to load models:', error);
          setModelsError('Failed to load models');
        } finally {
          setIsLoadingModels(false);
        }
      }
    };
    loadModels();
  }, [localSettings.ai.apiKey, settings.ai.apiKey]);

  const handleRefreshModels = async () => {
    const apiKey = localSettings.ai.apiKey;
    if (!apiKey || apiKey.length < 10) {
      setModelsError('Enter a valid API key first');
      return;
    }
    setIsLoadingModels(true);
    setModelsError(null);
    clearModelsCache();
    try {
      const { textModels: fetchedText, liveModels: fetchedLive } = await fetchAvailableModels(apiKey);
      setTextModels(fetchedText);
      setLiveModels(fetchedLive);
    } catch (error) {
      setModelsError('Failed to refresh models');
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleAISettingChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      ai: { ...prev.ai, [key]: value }
    }));
    setValidationResult(null);
  };

  const handleGenerationConfigChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        generationConfig: {
          ...prev.ai.generationConfig,
          [key]: value,
        },
      },
    }));
  };

  const handleVoiceChatSettingChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      ai: {
        ...prev.ai,
        voiceChatSettings: {
          ...(prev.ai.voiceChatSettings || {}),
          [key]: value
        }
      }
    }));
  };

  const handleAppearanceChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      appearance: { ...prev.appearance, [key]: value }
    }));
  };

  const handleNotificationChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value }
    }));
  };

  const handleValidateApiKey = async () => {
    const apiKey = localSettings.ai.apiKey;
    if (!apiKey || apiKey.trim().length < 10) {
      setValidationResult({ valid: false, error: 'Please enter a valid API key' });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    const result = await validateAPIKey(apiKey);
    setValidationResult(result);
    setIsValidating(false);
  };

  const handleSave = () => {
    onSaveSettings(localSettings);
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: `2px solid ${THEME.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    background: THEME.white,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: THEME.text,
  };

  const sectionStyle = {
    background: THEME.white,
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  };

  const toggleStyle = (enabled) => ({
    width: '48px',
    height: '24px',
    borderRadius: '12px',
    background: enabled ? THEME.success : THEME.border,
    position: 'relative',
    cursor: 'pointer',
    transition: 'background 0.2s',
    border: 'none',
  });

  const toggleKnobStyle = (enabled) => ({
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: THEME.white,
    position: 'absolute',
    top: '2px',
    left: enabled ? '26px' : '2px',
    transition: 'left 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  });

  return (
    <div style={{ paddingBottom: '80px' }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '700', color: THEME.text }}>
        Settings
      </h2>

      {/* Settings Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '8px',
        WebkitOverflowScrolling: 'touch',
      }}>
        {[
          { id: 'ai', label: 'AI Coach', icon: Bot },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'privacy', label: 'Privacy', icon: Shield },
          { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
          { id: 'appearance', label: 'Appearance', icon: Palette },
          { id: 'integrations', label: 'Integrations', icon: Package },
        ].map(tab => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSettingsTab(tab.id)}
              style={{
                padding: '10px 16px',
                background: activeSettingsTab === tab.id ? THEME.primary : THEME.secondary,
                color: activeSettingsTab === tab.id ? THEME.white : THEME.text,
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: activeSettingsTab === tab.id ? '600' : '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (activeSettingsTab !== tab.id) {
                  e.currentTarget.style.background = 'rgba(0,123,255,0.08)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSettingsTab !== tab.id) {
                  e.currentTarget.style.background = THEME.secondary;
                }
              }}
            >
              <TabIcon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* AI Settings Section */}
      {activeSettingsTab === 'ai' && (
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: THEME.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Bot size={20} color={THEME.primary} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: THEME.text }}>
              AI & LLM Settings
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: THEME.textLight }}>
              Configure your AI assistant
            </p>
          </div>
        </div>

        {/* API Key */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            <Key size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Gemini API Key
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={localSettings.ai.apiKey}
                onChange={(e) => handleAISettingChange('apiKey', e.target.value)}
                placeholder="Enter your Gemini API key"
                style={{ ...inputStyle, paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                {showApiKey ? <EyeOff size={18} color={THEME.textLight} /> : <Eye size={18} color={THEME.textLight} />}
              </button>
            </div>
            <button
              onClick={handleValidateApiKey}
              disabled={isValidating || !localSettings.ai.apiKey}
              style={{
                padding: '12px 16px',
                background: isValidating ? THEME.border : THEME.primary,
                border: 'none',
                borderRadius: '8px',
                color: THEME.white,
                fontSize: '14px',
                fontWeight: '600',
                cursor: isValidating || !localSettings.ai.apiKey ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {isValidating ? 'Testing...' : 'Test'}
            </button>
          </div>
          {validationResult && (
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              background: validationResult.valid ? '#D4EDDA' : '#F8D7DA',
              color: validationResult.valid ? '#155724' : '#721C24',
            }}>
              {validationResult.valid ? 'API key is valid!' : `Error: ${validationResult.error}`}
            </div>
          )}
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: THEME.textLight }}>
            Get your API key from{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={{ color: THEME.primary }}>
              Google AI Studio
            </a>
          </p>
        </div>

        {/* Models Header with Refresh */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', color: THEME.textLight }}>
            {isLoadingModels ? 'Loading models...' : `${textModels.length} text models, ${liveModels.length} live models available`}
          </div>
          <button
            onClick={handleRefreshModels}
            disabled={isLoadingModels || !localSettings.ai.apiKey}
            style={{
              padding: '6px 12px',
              background: THEME.secondary,
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              color: THEME.text,
              cursor: isLoadingModels || !localSettings.ai.apiKey ? 'not-allowed' : 'pointer',
            }}
          >
            {isLoadingModels ? 'Loading...' : 'Refresh Models'}
          </button>
        </div>
        {modelsError && (
          <div style={{
            marginBottom: '12px',
            padding: '8px',
            background: '#F8D7DA',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#721C24',
          }}>
            {modelsError}
          </div>
        )}

        {/* Text Model Selection */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            <Sliders size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Text Chat Model
          </label>
          <select
            value={localSettings.ai.textModel}
            onChange={(e) => handleAISettingChange('textModel', e.target.value)}
            style={selectStyle}
            disabled={isLoadingModels}
          >
            {textModels.map(model => (
              <option key={model.id} value={model.id}>
                {model.name} {model.description ? `- ${model.description}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Voice Model Selection */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            <Mic size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            Voice Chat Model (Live API)
          </label>
          <select
            value={localSettings.ai.voiceModel}
            onChange={(e) => handleAISettingChange('voiceModel', e.target.value)}
            style={selectStyle}
            disabled={isLoadingModels}
          >
            {liveModels.length > 0 ? (
              liveModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name} {model.description ? `- ${model.description}` : ''}
                </option>
              ))
            ) : (
              <option value="">No live models available</option>
            )}
          </select>
          {liveModels.length === 0 && (
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: THEME.warning }}>
              No models with bidiGenerateContent support found. Voice chat may not work.
            </p>
          )}
        </div>

        {/* Voice Selection */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            <Volume2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
            AI Voice
          </label>
          <select
            value={localSettings.ai.voiceName}
            onChange={(e) => handleAISettingChange('voiceName', e.target.value)}
            style={selectStyle}
          >
            {VOICE_OPTIONS.map(voice => (
              <option key={voice.id} value={voice.id}>
                {voice.name} - {voice.description}
              </option>
            ))}
          </select>
        </div>

        {/* Rate Limit */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            Rate Limit (requests/minute)
          </label>
          <input
            type="number"
            min="1"
            max="60"
            value={localSettings.ai.rateLimit}
            onChange={(e) => handleAISettingChange('rateLimit', parseInt(e.target.value) || 15)}
            style={inputStyle}
          />
        </div>

        {/* Voice Chat Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>
              Enable Voice Chat
            </div>
            <div style={{ fontSize: '12px', color: THEME.textLight }}>
              Allow real-time voice conversations with AI
            </div>
          </div>
          <button
            style={toggleStyle(localSettings.ai.voiceChatEnabled)}
            onClick={() => handleAISettingChange('voiceChatEnabled', !localSettings.ai.voiceChatEnabled)}
          >
            <div style={toggleKnobStyle(localSettings.ai.voiceChatEnabled)} />
          </button>
        </div>

        {!isVoiceChatSupported() && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            background: THEME.warning,
            color: THEME.text,
          }}>
            Voice chat is not supported in this browser. Try Chrome or Edge.
          </div>
        )}

        {/* Voice Chat Advanced Settings */}
        {localSettings.ai.voiceChatEnabled && isVoiceChatSupported() && (
          <div style={{
            marginTop: '20px',
            padding: '16px',
            background: THEME.secondary,
            borderRadius: '8px',
            border: `2px solid ${THEME.border}`,
          }}>
            <div style={{ marginBottom: '16px', fontSize: '14px', fontWeight: '600', color: THEME.text }}>
              Voice Chat Settings
            </div>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: THEME.textLight }}>
              Configure voice activity detection and transcription behavior
            </p>

            {/* Start of Speech Sensitivity */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>
                Start of Speech Sensitivity
              </label>
              <select
                value={localSettings.ai.voiceChatSettings?.startOfSpeechSensitivity || 'START_SENSITIVITY_UNSPECIFIED'}
                onChange={(e) => handleVoiceChatSettingChange('startOfSpeechSensitivity', e.target.value)}
                style={selectStyle}
              >
                <option value="START_SENSITIVITY_UNSPECIFIED">Default - Balanced detection</option>
                <option value="START_SENSITIVITY_LOW">Low - More tolerant, needs clear speech</option>
                <option value="START_SENSITIVITY_MEDIUM">Medium - Moderate sensitivity</option>
                <option value="START_SENSITIVITY_HIGH">High - Detects soft speech easily</option>
              </select>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: THEME.textLight }}>
                How easily the system detects when you start speaking
              </p>
            </div>

            {/* End of Speech Sensitivity */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>
                End of Speech Sensitivity
              </label>
              <select
                value={localSettings.ai.voiceChatSettings?.endOfSpeechSensitivity || 'END_SENSITIVITY_UNSPECIFIED'}
                onChange={(e) => handleVoiceChatSettingChange('endOfSpeechSensitivity', e.target.value)}
                style={selectStyle}
              >
                <option value="END_SENSITIVITY_UNSPECIFIED">Default - Balanced detection</option>
                <option value="END_SENSITIVITY_LOW">Low - Waits longer before ending turn</option>
                <option value="END_SENSITIVITY_MEDIUM">Medium - Moderate sensitivity</option>
                <option value="END_SENSITIVITY_HIGH">High - Ends turn quickly after pause</option>
              </select>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: THEME.textLight }}>
                How quickly the system detects when you stop speaking
              </p>
            </div>

            {/* Silence Duration */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>
                Silence Duration (ms)
              </label>
              <input
                type="number"
                min="100"
                max="2000"
                step="50"
                value={localSettings.ai.voiceChatSettings?.silenceDurationMs || 500}
                onChange={(e) => handleVoiceChatSettingChange('silenceDurationMs', parseInt(e.target.value) || 500)}
                style={inputStyle}
              />
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: THEME.textLight }}>
                Milliseconds of silence before turn ends (100-2000ms, default: 500ms)
              </p>
            </div>

            {/* Prefix Padding */}
            <div style={{ marginBottom: '0' }}>
              <label style={labelStyle}>
                Prefix Padding (ms)
              </label>
              <input
                type="number"
                min="0"
                max="500"
                step="10"
                value={localSettings.ai.voiceChatSettings?.prefixPaddingMs || 100}
                onChange={(e) => handleVoiceChatSettingChange('prefixPaddingMs', parseInt(e.target.value) || 100)}
                style={inputStyle}
              />
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: THEME.textLight }}>
                Extra audio before detected speech start to avoid cutting words (0-500ms, default: 100ms)
              </p>
            </div>
          </div>
        )}

        {/* AI Generation Configuration */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: THEME.secondary,
          borderRadius: '8px',
          border: `2px solid ${THEME.border}`,
        }}>
          <div style={{ marginBottom: '16px', fontSize: '14px', fontWeight: '600', color: THEME.text }}>
            AI Generation Settings
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: THEME.textLight }}>
            Configure response generation parameters (affects both text and voice chat)
          </p>

          {/* Temperature */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Temperature: {localSettings.ai.generationConfig?.temperature || 1.0}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={localSettings.ai.generationConfig?.temperature || 1.0}
              onChange={(e) => handleGenerationConfigChange('temperature', parseFloat(e.target.value))}
              style={{ ...inputStyle, width: '100%' }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: THEME.textLight }}>
              Controls randomness (0.0 = deterministic, 2.0 = creative). Default: 1.0
            </p>
          </div>

          {/* Top P */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Top P: {localSettings.ai.generationConfig?.topP || 0.95}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={localSettings.ai.generationConfig?.topP || 0.95}
              onChange={(e) => handleGenerationConfigChange('topP', parseFloat(e.target.value))}
              style={{ ...inputStyle, width: '100%' }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: THEME.textLight }}>
              Nucleus sampling parameter (0.0-1.0). Default: 0.95
            </p>
          </div>

          {/* Top K */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Top K
            </label>
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              value={localSettings.ai.generationConfig?.topK || 40}
              onChange={(e) => handleGenerationConfigChange('topK', parseInt(e.target.value) || 40)}
              style={inputStyle}
            />
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: THEME.textLight }}>
              Top-k sampling. Default: 40
            </p>
          </div>

          {/* Max Output Tokens */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Max Output Tokens
            </label>
            <input
              type="number"
              min="1"
              max="8192"
              step="128"
              value={localSettings.ai.generationConfig?.maxOutputTokens || 8192}
              onChange={(e) => handleGenerationConfigChange('maxOutputTokens', parseInt(e.target.value) || 8192)}
              style={inputStyle}
            />
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: THEME.textLight }}>
              Maximum tokens in response (1-8192, default: 8192)
            </p>
          </div>

          {/* Candidate Count */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Candidate Count
            </label>
            <select
              value={localSettings.ai.generationConfig?.candidateCount || 1}
              onChange={(e) => handleGenerationConfigChange('candidateCount', parseInt(e.target.value) || 1)}
              style={selectStyle}
            >
              <option value="1">1 - Single response</option>
              <option value="2">2 - Two variations</option>
              <option value="3">3 - Three variations</option>
              <option value="4">4 - Four variations</option>
            </select>
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: THEME.textLight }}>
              Number of response variations to generate. Default: 1
            </p>
          </div>

          {/* Presence Penalty */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>
              Presence Penalty: {localSettings.ai.generationConfig?.presencePenalty || 0.0}
            </label>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={localSettings.ai.generationConfig?.presencePenalty || 0.0}
              onChange={(e) => handleGenerationConfigChange('presencePenalty', parseFloat(e.target.value))}
              style={{ ...inputStyle, width: '100%' }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: THEME.textLight }}>
              Penalize new topics (-2.0 to 2.0). Default: 0.0 (no penalty)
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '10px', color: THEME.warning, fontStyle: 'italic' }}>
              Note: Only applies to text chat, not voice chat
            </p>
          </div>

          {/* Frequency Penalty */}
          <div style={{ marginBottom: '0' }}>
            <label style={labelStyle}>
              Frequency Penalty: {localSettings.ai.generationConfig?.frequencyPenalty || 0.0}
            </label>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={localSettings.ai.generationConfig?.frequencyPenalty || 0.0}
              onChange={(e) => handleGenerationConfigChange('frequencyPenalty', parseFloat(e.target.value))}
              style={{ ...inputStyle, width: '100%' }}
            />
            <p style={{ margin: '4px 0 0', fontSize: '11px', color: THEME.textLight }}>
              Penalize repetition (-2.0 to 2.0). Default: 0.0 (no penalty)
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '10px', color: THEME.warning, fontStyle: 'italic' }}>
              Note: Only applies to text chat, not voice chat
            </p>
          </div>
        </div>
      </div>

      {/* Appearance Settings */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: THEME.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Sliders size={20} color={THEME.primary} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: THEME.text }}>
              Appearance
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: THEME.textLight }}>
              Customize the look and feel
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>
              Compact Mode
            </div>
            <div style={{ fontSize: '12px', color: THEME.textLight }}>
              Use smaller spacing and text
            </div>
          </div>
          <button
            style={toggleStyle(localSettings.appearance.compactMode)}
            onClick={() => handleAppearanceChange('compactMode', !localSettings.appearance.compactMode)}
          >
            <div style={toggleKnobStyle(localSettings.appearance.compactMode)} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>
              Show Animations
            </div>
            <div style={{ fontSize: '12px', color: THEME.textLight }}>
              Enable celebratory effects
            </div>
          </div>
          <button
            style={toggleStyle(localSettings.appearance.showAnimations)}
            onClick={() => handleAppearanceChange('showAnimations', !localSettings.appearance.showAnimations)}
          >
            <div style={toggleKnobStyle(localSettings.appearance.showAnimations)} />
          </button>
        </div>

        <div>
          <label style={labelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sun size={14} />
              Dark Mode
            </div>
          </label>
          <select
            value={localSettings.themeMode || 'system'}
            onChange={(e) => {
              setLocalSettings(prev => ({
                ...prev,
                themeMode: e.target.value
              }));
            }}
            style={selectStyle}
          >
            <option value="system">System (Auto)</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: THEME.textLight }}>
            Choose your preferred theme. System option follows your device settings.
          </p>
        </div>
      </div>

      {/* Notification Settings */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: THEME.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <MessageSquare size={20} color={THEME.primary} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: THEME.text }}>
              Notifications
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: THEME.textLight }}>
              Manage your alerts
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>
              Goal Reminders
            </div>
            <div style={{ fontSize: '12px', color: THEME.textLight }}>
              Remind when behind on goals
            </div>
          </div>
          <button
            style={toggleStyle(localSettings.notifications.goalReminders)}
            onClick={() => handleNotificationChange('goalReminders', !localSettings.notifications.goalReminders)}
          >
            <div style={toggleKnobStyle(localSettings.notifications.goalReminders)} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>
              Achievement Alerts
            </div>
            <div style={{ fontSize: '12px', color: THEME.textLight }}>
              Celebrate when goals are met
            </div>
          </div>
          <button
            style={toggleStyle(localSettings.notifications.achievementAlerts)}
            onClick={() => handleNotificationChange('achievementAlerts', !localSettings.notifications.achievementAlerts)}
          >
            <div style={toggleKnobStyle(localSettings.notifications.achievementAlerts)} />
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        style={{
          width: '100%',
          padding: '16px',
          background: THEME.primary,
          border: 'none',
          borderRadius: '12px',
          color: THEME.white,
          fontSize: '16px',
          fontWeight: '700',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <Check size={20} />
        Save Settings
      </button>

      {/* App Info */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: THEME.secondary,
        borderRadius: '12px',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, fontSize: '12px', color: THEME.textLight }}>
          Window Depot Milwaukee Goal Tracker
        </p>
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: THEME.textLight }}>
          AI Status: {isAIConfigured() ? 'Configured' : 'Not configured'} |
          Voice Chat: {isVoiceChatSupported() ? 'Supported' : 'Not supported'}
        </p>
      </div>
    </div>
  );
}

// ========================================
// BOTTOM NAVIGATION
// ========================================

function BottomNav({ activeView, onViewChange, isManager, theme }) {
  const THEME = theme || { /* fallback */ primary: '#0056A4', secondary: '#F5F7FA', text: '#1A1A2E', textLight: '#6B7280', border: '#E5E7EB', white: '#FFFFFF', accent: '#E8F4FD', gradients: { cardHover: 'linear-gradient(135deg, rgba(0, 86, 164, 0.05) 0%, rgba(74, 144, 217, 0.05) 100%)', primary: 'linear-gradient(135deg, #0056A4 0%, #4A90D9 100%)' }, shadows: { layered: '0 2px 8px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04)' } };
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Target, roles: ['employee', 'manager'] },
    { id: 'goals', label: 'Goals', icon: Target, roles: ['employee', 'manager'] },
    { id: 'appointments', label: 'Appointments', icon: Calendar, roles: ['employee', 'manager'] },
    { id: 'feed', label: 'Feed', icon: MessageSquare, roles: ['employee', 'manager'] },
    { id: 'leaderboard', label: 'Leaderboard', icon: Award, roles: ['employee', 'manager'] },
    { id: 'history', label: 'History', icon: TrendingUp, roles: ['employee', 'manager'] },
    { id: 'chatbot', label: 'AI Coach', icon: Bot, roles: ['employee', 'manager'] },
    { id: 'settings', label: 'Settings', icon: Sliders, roles: ['employee', 'manager'] },
    { id: 'team', label: 'Team', icon: Users, roles: ['manager'] },
    { id: 'admin', label: 'Admin', icon: Settings, roles: ['manager'] },
    { id: 'reports', label: 'Reports', icon: TrendingUp, roles: ['manager'] },
  ];
  
  const visibleItems = navItems.filter(item => 
    isManager ? item.roles.includes('manager') : item.roles.includes('employee')
  );
  
  // Determine if mobile based on visible items count (heuristic for small screens)
  // On mobile, we'll use smaller sizing and potentially horizontal scroll
  const itemCount = visibleItems.length;
  const isMobile = itemCount > 6; // More than 6 items suggests mobile or manager view
  
  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .bottom-nav-item {
            padding: 8px 4px !important;
            min-width: 0 !important;
          }
          .bottom-nav-icon {
            width: 18px !important;
            height: 18px !important;
          }
          .bottom-nav-label {
            font-size: 9px !important;
            line-height: 1.2 !important;
          }
        }
        @media (max-width: 480px) {
          .bottom-nav-item {
            padding: 6px 2px !important;
          }
          .bottom-nav-icon {
            width: 16px !important;
            height: 16px !important;
          }
          .bottom-nav-label {
            font-size: 8px !important;
          }
        }
      `}</style>
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: THEME.white,
        borderTop: `1px solid ${THEME.border}`,
        display: 'grid',
        gridTemplateColumns: `repeat(${visibleItems.length}, 1fr)`,
        boxShadow: THEME.shadows.layered,
        zIndex: 1000,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {visibleItems.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="bottom-nav-item"
              style={{
                padding: isMobile ? '8px 4px' : '12px 8px',
                background: isActive ? THEME.gradients.cardHover : 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                color: isActive ? THEME.primary : THEME.textLight,
                transition: 'all 0.3s ease',
                minWidth: '0',
                flexShrink: 0,
                touchAction: 'manipulation',
                position: 'relative',
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.opacity = '0.7';
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '40px',
                  height: '3px',
                  background: THEME.gradients.primary,
                  borderRadius: '0 0 4px 4px',
                }} />
              )}
              <Icon 
                size={isMobile ? 18 : 22} 
                className="bottom-nav-icon"
                style={{
                  flexShrink: 0,
                  minWidth: isMobile ? '18px' : '22px',
                  minHeight: isMobile ? '18px' : '22px',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.2s ease',
                }}
              />
              <span 
                className="bottom-nav-label"
                style={{ 
                  fontSize: isMobile ? '9px' : '11px', 
                  fontWeight: isActive ? '700' : '600',
                  lineHeight: '1.2',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                  padding: '0 2px',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
