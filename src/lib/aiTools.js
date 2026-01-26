/**
 * AI Tools Implementation
 *
 * This file contains the actual implementations of all AI coach tools.
 * Each tool function receives the tool arguments and context (currentUser, storage access).
 */

import storage from '../storage';
import { queueSyncOperation } from './sync';

// ========================================
// HELPER FUNCTIONS
// ========================================

/**
 * Get today's date in YYYY-MM-DD format
 */
const getToday = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Get start of current week (Monday)
 */
const getWeekStart = () => {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(today.setDate(diff));
  return weekStart.toISOString().split('T')[0];
};

/**
 * Get start of current month
 */
const getMonthStart = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
};

/**
 * Calculate days between two dates
 */
const daysBetween = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Get day of week name from date string
 */
const getDayOfWeek = (dateStr) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[new Date(dateStr).getDay()];
};

/**
 * Find user by name (case-insensitive partial match)
 */
const findUserByName = (users, name) => {
  if (!name) return null;
  const lowerName = name.toLowerCase();
  return users.find(u =>
    u.name.toLowerCase() === lowerName ||
    u.name.toLowerCase().includes(lowerName)
  );
};

/**
 * Sanitize text input
 */
const sanitizeInput = (text, maxLength = 500) => {
  if (!text) return '';
  return String(text)
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .substring(0, maxLength);
};

/**
 * Generate UUID
 */
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
};

/**
 * Log an AI action to audit log
 */
const logAIAction = async (action, entityType, entityId, details, currentUser) => {
  try {
    const auditLog = await storage.get('auditLog', []);
    const entry = {
      id: generateId(),
      userId: currentUser?.id,
      userName: currentUser?.name || 'AI Coach',
      action: `ai_${action}`,
      entityType,
      entityId,
      details: { ...details, viaAI: true },
      timestamp: new Date().toISOString(),
    };
    auditLog.unshift(entry);
    // Keep only last 1000 entries
    await storage.set('auditLog', auditLog.slice(0, 1000));

    // Queue sync to Supabase
    await queueSyncOperation({
      type: 'insert',
      table: 'audit_log',
      data: {
        id: entry.id,
        user_id: entry.userId,
        user_name: entry.userName,
        action: entry.action,
        entity_type: entry.entityType,
        entity_id: entry.entityId,
        details: entry.details,
        timestamp: entry.timestamp,
      },
    });
  } catch (error) {
    console.error('Failed to log AI action:', error);
  }
};

// ========================================
// EMPLOYEE READ TOOLS
// ========================================

/**
 * Get user's activity statistics for a date range
 */
export const getMyStats = async (args, context) => {
  const { currentUser } = context;
  const { startDate, endDate, category = 'all' } = args;

  try {
    const dailyLogs = await storage.get('dailyLogs', {});
    const userId = currentUser.id;

    const result = {
      userId,
      userName: currentUser.name,
      dateRange: { startDate, endDate },
      days: [],
      totals: { reviews: 0, demos: 0, callbacks: 0, total: 0 },
      dailyAverages: { reviews: 0, demos: 0, callbacks: 0 },
    };

    // Iterate through date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    let dayCount = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayData = dailyLogs[dateStr]?.[userId] || { reviews: 0, demos: 0, callbacks: 0 };

      const dayStats = {
        date: dateStr,
        dayOfWeek: getDayOfWeek(dateStr),
        reviews: dayData.reviews || 0,
        demos: dayData.demos || 0,
        callbacks: dayData.callbacks || 0,
        total: (dayData.reviews || 0) + (dayData.demos || 0) + (dayData.callbacks || 0),
      };

      if (category === 'all' || category === 'reviews') result.totals.reviews += dayStats.reviews;
      if (category === 'all' || category === 'demos') result.totals.demos += dayStats.demos;
      if (category === 'all' || category === 'callbacks') result.totals.callbacks += dayStats.callbacks;
      result.totals.total += dayStats.total;

      result.days.push(dayStats);
      dayCount++;
    }

    // Calculate averages
    if (dayCount > 0) {
      result.dailyAverages.reviews = Math.round((result.totals.reviews / dayCount) * 10) / 10;
      result.dailyAverages.demos = Math.round((result.totals.demos / dayCount) * 10) / 10;
      result.dailyAverages.callbacks = Math.round((result.totals.callbacks / dayCount) * 10) / 10;
    }

    result.daysAnalyzed = dayCount;

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get user's appointments
 */
export const getMyAppointments = async (args, context) => {
  const { currentUser } = context;
  const { startDate, endDate, limit = 50 } = args;

  try {
    const appointments = await storage.get('appointments', []);
    let userAppointments = appointments.filter(a => a.userId === currentUser.id);

    // Filter by date range if provided
    if (startDate) {
      userAppointments = userAppointments.filter(a => a.date >= startDate);
    }
    if (endDate) {
      userAppointments = userAppointments.filter(a => a.date <= endDate);
    }

    // Sort by date descending
    userAppointments.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Apply limit
    userAppointments = userAppointments.slice(0, limit);

    // Calculate statistics
    const stats = {
      totalAppointments: userAppointments.length,
      byProduct: {},
      byDayOfWeek: {},
      byTimeSlot: {},
      demoCount: userAppointments.filter(a => a.countsAsDemo).length,
    };

    userAppointments.forEach(apt => {
      // Products
      (apt.products || []).forEach(p => {
        stats.byProduct[p] = (stats.byProduct[p] || 0) + 1;
      });

      // Day of week
      const dow = getDayOfWeek(apt.date);
      stats.byDayOfWeek[dow] = (stats.byDayOfWeek[dow] || 0) + 1;

      // Time slot
      if (apt.time) {
        const hour = parseInt(apt.time.split(':')[0], 10);
        let slot = 'morning';
        if (hour >= 12 && hour < 17) slot = 'afternoon';
        else if (hour >= 17) slot = 'evening';
        stats.byTimeSlot[slot] = (stats.byTimeSlot[slot] || 0) + 1;
      }
    });

    return {
      success: true,
      data: {
        appointments: userAppointments,
        statistics: stats,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get user's full profile
 */
export const getMyProfile = async (args, context) => {
  const { currentUser } = context;

  try {
    const users = await storage.get('users', []);
    const user = users.find(u => u.id === currentUser.id) || currentUser;

    const profile = {
      id: user.id,
      name: user.name,
      role: user.role,
      goals: user.goals || { reviews: 5, demos: 3, callbacks: 10 },
      xp: user.xp || 0,
      level: user.level || 1,
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0,
      totalSales: user.totalSales || 0,
      achievements: user.achievements || [],
      achievementCount: (user.achievements || []).length,
      lastActivityDate: user.lastActivityDate,
      createdAt: user.createdAt,
    };

    // Calculate XP to next level
    const xpForNextLevel = profile.level * 100;
    const currentLevelXP = profile.xp % 100;
    profile.xpToNextLevel = xpForNextLevel - currentLevelXP;
    profile.xpProgress = Math.round((currentLevelXP / xpForNextLevel) * 100);

    return { success: true, data: profile };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get user's achievement progress
 */
export const getMyAchievementProgress = async (args, context) => {
  const { currentUser } = context;

  try {
    const users = await storage.get('users', []);
    const achievements = await storage.get('achievements', []);
    const user = users.find(u => u.id === currentUser.id) || currentUser;

    const earnedIds = user.achievements || [];
    const progress = user.achievementProgress || {};

    const result = {
      earned: [],
      inProgress: [],
      locked: [],
      totalEarned: earnedIds.length,
      totalAvailable: achievements.length,
    };

    achievements.forEach(achievement => {
      if (earnedIds.includes(achievement.id)) {
        result.earned.push({
          ...achievement,
          earnedAt: progress[achievement.id]?.earnedAt,
        });
      } else if (progress[achievement.id]) {
        result.inProgress.push({
          ...achievement,
          currentProgress: progress[achievement.id].current || 0,
          targetProgress: progress[achievement.id].target || 1,
          percentComplete: Math.round(((progress[achievement.id].current || 0) / (progress[achievement.id].target || 1)) * 100),
        });
      } else {
        result.locked.push(achievement);
      }
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get leaderboard
 */
export const getLeaderboard = async (args, context) => {
  const { period = 'week', limit = 10 } = args;

  try {
    const users = await storage.get('users', []);
    const dailyLogs = await storage.get('dailyLogs', {});

    // Determine date range based on period
    let startDate, endDate = getToday();
    switch (period) {
      case 'today':
        startDate = getToday();
        break;
      case 'week':
        startDate = getWeekStart();
        break;
      case 'month':
        startDate = getMonthStart();
        break;
      case 'all_time':
        startDate = '2000-01-01';
        break;
      default:
        startDate = getWeekStart();
    }

    // Calculate scores for each user
    const userScores = users
      .filter(u => !u.archived)
      .map(user => {
        let reviews = 0, demos = 0, callbacks = 0;

        Object.entries(dailyLogs).forEach(([date, dateData]) => {
          if (date >= startDate && date <= endDate && dateData[user.id]) {
            reviews += dateData[user.id].reviews || 0;
            demos += dateData[user.id].demos || 0;
            callbacks += dateData[user.id].callbacks || 0;
          }
        });

        const total = reviews + demos + callbacks;

        return {
          userId: user.id,
          userName: user.name,
          role: user.role,
          level: user.level || 1,
          reviews,
          demos,
          callbacks,
          total,
        };
      });

    // Sort by total descending
    userScores.sort((a, b) => b.total - a.total);

    // Add rankings
    userScores.forEach((user, index) => {
      user.rank = index + 1;
      if (index === 0) user.badge = 'gold';
      else if (index === 1) user.badge = 'silver';
      else if (index === 2) user.badge = 'bronze';
    });

    return {
      success: true,
      data: {
        period,
        dateRange: { startDate, endDate },
        leaderboard: userScores.slice(0, limit),
        totalParticipants: userScores.length,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get user's goals
 */
export const getMyGoals = async (args, context) => {
  const { currentUser } = context;

  const goals = currentUser.goals || { reviews: 5, demos: 3, callbacks: 10 };

  return {
    success: true,
    data: {
      goals,
      totalDailyTarget: goals.reviews + goals.demos + goals.callbacks,
    },
  };
};

/**
 * Analyze user's activity patterns
 */
export const analyzeMyPatterns = async (args, context) => {
  const { currentUser } = context;
  const { analysisType = 'all', days = 30 } = args;

  try {
    const dailyLogs = await storage.get('dailyLogs', {});
    const appointments = await storage.get('appointments', []);
    const userId = currentUser.id;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = {
      period: { days, startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] },
      patterns: {},
    };

    // Day of week analysis
    if (analysisType === 'all' || analysisType === 'day_of_week') {
      const dayStats = {
        Sunday: { reviews: 0, demos: 0, callbacks: 0, count: 0 },
        Monday: { reviews: 0, demos: 0, callbacks: 0, count: 0 },
        Tuesday: { reviews: 0, demos: 0, callbacks: 0, count: 0 },
        Wednesday: { reviews: 0, demos: 0, callbacks: 0, count: 0 },
        Thursday: { reviews: 0, demos: 0, callbacks: 0, count: 0 },
        Friday: { reviews: 0, demos: 0, callbacks: 0, count: 0 },
        Saturday: { reviews: 0, demos: 0, callbacks: 0, count: 0 },
      };

      Object.entries(dailyLogs).forEach(([date, dateData]) => {
        if (date >= startDate.toISOString().split('T')[0] && dateData[userId]) {
          const dow = getDayOfWeek(date);
          dayStats[dow].reviews += dateData[userId].reviews || 0;
          dayStats[dow].demos += dateData[userId].demos || 0;
          dayStats[dow].callbacks += dateData[userId].callbacks || 0;
          dayStats[dow].count++;
        }
      });

      // Calculate averages and find best day
      let bestDay = null;
      let bestTotal = 0;

      Object.entries(dayStats).forEach(([day, stats]) => {
        if (stats.count > 0) {
          stats.avgReviews = Math.round((stats.reviews / stats.count) * 10) / 10;
          stats.avgDemos = Math.round((stats.demos / stats.count) * 10) / 10;
          stats.avgCallbacks = Math.round((stats.callbacks / stats.count) * 10) / 10;
          stats.avgTotal = stats.avgReviews + stats.avgDemos + stats.avgCallbacks;

          if (stats.avgTotal > bestTotal) {
            bestTotal = stats.avgTotal;
            bestDay = day;
          }
        }
      });

      result.patterns.dayOfWeek = {
        stats: dayStats,
        bestDay,
        bestDayAverage: bestTotal,
      };
    }

    // Time of day analysis (from appointments)
    if (analysisType === 'all' || analysisType === 'time_of_day') {
      const userAppointments = appointments.filter(a =>
        a.userId === userId &&
        a.date >= startDate.toISOString().split('T')[0] &&
        a.time
      );

      const timeSlots = {
        earlyMorning: { label: '6am-9am', count: 0, times: [] },
        morning: { label: '9am-12pm', count: 0, times: [] },
        earlyAfternoon: { label: '12pm-3pm', count: 0, times: [] },
        afternoon: { label: '3pm-6pm', count: 0, times: [] },
        evening: { label: '6pm-9pm', count: 0, times: [] },
      };

      userAppointments.forEach(apt => {
        const hour = parseInt(apt.time.split(':')[0], 10);
        let slot;
        if (hour >= 6 && hour < 9) slot = 'earlyMorning';
        else if (hour >= 9 && hour < 12) slot = 'morning';
        else if (hour >= 12 && hour < 15) slot = 'earlyAfternoon';
        else if (hour >= 15 && hour < 18) slot = 'afternoon';
        else slot = 'evening';

        timeSlots[slot].count++;
        timeSlots[slot].times.push(apt.time);
      });

      // Find most common time slot
      let mostCommonSlot = null;
      let maxCount = 0;

      Object.entries(timeSlots).forEach(([slot, data]) => {
        if (data.count > maxCount) {
          maxCount = data.count;
          mostCommonSlot = slot;
        }
      });

      // Calculate average time
      let avgTime = null;
      if (userAppointments.length > 0) {
        const totalMinutes = userAppointments.reduce((sum, apt) => {
          const [hours, mins] = apt.time.split(':').map(Number);
          return sum + hours * 60 + mins;
        }, 0);
        const avgMinutes = Math.round(totalMinutes / userAppointments.length);
        const avgHours = Math.floor(avgMinutes / 60);
        const avgMins = avgMinutes % 60;
        avgTime = `${avgHours.toString().padStart(2, '0')}:${avgMins.toString().padStart(2, '0')}`;
      }

      result.patterns.timeOfDay = {
        slots: timeSlots,
        mostCommonSlot: mostCommonSlot ? timeSlots[mostCommonSlot].label : null,
        appointmentCount: userAppointments.length,
        averageAppointmentTime: avgTime,
      };
    }

    // Goal completion analysis
    if (analysisType === 'all' || analysisType === 'goal_completion') {
      const goals = currentUser.goals || { reviews: 5, demos: 3, callbacks: 10 };
      let daysWithGoals = 0;
      let daysAllGoalsMet = 0;
      let daysPartialGoalsMet = 0;

      Object.entries(dailyLogs).forEach(([date, dateData]) => {
        if (date >= startDate.toISOString().split('T')[0] && dateData[userId]) {
          const data = dateData[userId];
          daysWithGoals++;

          const reviewsMet = (data.reviews || 0) >= goals.reviews;
          const demosMet = (data.demos || 0) >= goals.demos;
          const callbacksMet = (data.callbacks || 0) >= goals.callbacks;

          if (reviewsMet && demosMet && callbacksMet) {
            daysAllGoalsMet++;
          } else if (reviewsMet || demosMet || callbacksMet) {
            daysPartialGoalsMet++;
          }
        }
      });

      result.patterns.goalCompletion = {
        daysAnalyzed: daysWithGoals,
        daysAllGoalsMet,
        daysPartialGoalsMet,
        completionRate: daysWithGoals > 0 ? Math.round((daysAllGoalsMet / daysWithGoals) * 100) : 0,
        partialRate: daysWithGoals > 0 ? Math.round((daysPartialGoalsMet / daysWithGoals) * 100) : 0,
      };
    }

    // Trends analysis
    if (analysisType === 'all' || analysisType === 'trends') {
      const weeklyTotals = [];
      let currentWeekStart = new Date(startDate);

      while (currentWeekStart <= endDate) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        let weekReviews = 0, weekDemos = 0, weekCallbacks = 0;

        Object.entries(dailyLogs).forEach(([date, dateData]) => {
          if (date >= currentWeekStart.toISOString().split('T')[0] &&
            date <= weekEnd.toISOString().split('T')[0] &&
            dateData[userId]) {
            weekReviews += dateData[userId].reviews || 0;
            weekDemos += dateData[userId].demos || 0;
            weekCallbacks += dateData[userId].callbacks || 0;
          }
        });

        weeklyTotals.push({
          weekStart: currentWeekStart.toISOString().split('T')[0],
          reviews: weekReviews,
          demos: weekDemos,
          callbacks: weekCallbacks,
          total: weekReviews + weekDemos + weekCallbacks,
        });

        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }

      // Calculate trend (comparing last 2 weeks)
      let trend = 'stable';
      if (weeklyTotals.length >= 2) {
        const lastWeek = weeklyTotals[weeklyTotals.length - 1].total;
        const prevWeek = weeklyTotals[weeklyTotals.length - 2].total;
        if (lastWeek > prevWeek * 1.1) trend = 'improving';
        else if (lastWeek < prevWeek * 0.9) trend = 'declining';
      }

      result.patterns.trends = {
        weeklyTotals,
        overallTrend: trend,
        weeksAnalyzed: weeklyTotals.length,
      };
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get user's feed activity
 */
export const getMyFeedActivity = async (args, context) => {
  const { currentUser } = context;
  const { limit = 20 } = args;

  try {
    const feed = await storage.get('feed', []);
    const userPosts = feed
      .filter(p => p.userId === currentUser.id)
      .slice(0, limit);

    const totalLikes = userPosts.reduce((sum, p) => sum + (p.likes?.length || 0), 0);
    const totalComments = userPosts.reduce((sum, p) => sum + (p.comments?.length || 0), 0);

    return {
      success: true,
      data: {
        posts: userPosts,
        statistics: {
          totalPosts: userPosts.length,
          totalLikesReceived: totalLikes,
          totalCommentsReceived: totalComments,
          averageLikesPerPost: userPosts.length > 0 ? Math.round((totalLikes / userPosts.length) * 10) / 10 : 0,
        },
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get today's summary
 */
export const getTodaysSummary = async (args, context) => {
  const { currentUser } = context;

  try {
    const today = getToday();
    const dailyLogs = await storage.get('dailyLogs', {});
    const appointments = await storage.get('appointments', []);

    const todayStats = dailyLogs[today]?.[currentUser.id] || { reviews: 0, demos: 0, callbacks: 0 };
    const goals = currentUser.goals || { reviews: 5, demos: 3, callbacks: 10 };

    const todayAppointments = appointments.filter(a =>
      a.userId === currentUser.id && a.date === today
    );

    const summary = {
      date: today,
      dayOfWeek: getDayOfWeek(today),
      stats: todayStats,
      goals,
      progress: {
        reviews: { current: todayStats.reviews, goal: goals.reviews, percentage: Math.round((todayStats.reviews / goals.reviews) * 100) },
        demos: { current: todayStats.demos, goal: goals.demos, percentage: Math.round((todayStats.demos / goals.demos) * 100) },
        callbacks: { current: todayStats.callbacks, goal: goals.callbacks, percentage: Math.round((todayStats.callbacks / goals.callbacks) * 100) },
      },
      goalsCompleted: {
        reviews: todayStats.reviews >= goals.reviews,
        demos: todayStats.demos >= goals.demos,
        callbacks: todayStats.callbacks >= goals.callbacks,
        all: todayStats.reviews >= goals.reviews && todayStats.demos >= goals.demos && todayStats.callbacks >= goals.callbacks,
      },
      appointments: {
        count: todayAppointments.length,
        list: todayAppointments,
      },
      totalActivities: todayStats.reviews + todayStats.demos + todayStats.callbacks,
    };

    return { success: true, data: summary };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get challenges
 */
export const getChallenges = async (args, context) => {
  const { currentUser } = context;
  const { includeCompleted = false } = args;

  try {
    const challenges = await storage.get('challenges', []);
    const userChallenges = await storage.get('userChallenges', []);

    const today = getToday();

    // Filter active challenges
    let activeChallenges = challenges.filter(c => {
      if (!c.isActive) return false;
      if (c.endDate < today) return false;
      if (c.targetUsers && c.targetUsers.length > 0 && !c.targetUsers.includes(currentUser.id)) return false;
      return true;
    });

    // Add user progress to each challenge
    const result = activeChallenges.map(challenge => {
      const userProgress = userChallenges.find(uc =>
        uc.userId === currentUser.id && uc.challengeId === challenge.id
      );

      return {
        ...challenge,
        userProgress: userProgress?.progress || 0,
        completed: userProgress?.completed || false,
        completedAt: userProgress?.completedAt,
        percentComplete: Math.min(100, Math.round(((userProgress?.progress || 0) / challenge.goalValue) * 100)),
      };
    });

    // Filter out completed if not requested
    const filteredResult = includeCompleted
      ? result
      : result.filter(c => !c.completed);

    return {
      success: true,
      data: {
        challenges: filteredResult,
        totalActive: filteredResult.length,
        totalCompleted: result.filter(c => c.completed).length,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========================================
// EMPLOYEE WRITE TOOLS
// ========================================

/**
 * Log activity
 */
export const logActivity = async (args, context) => {
  const { currentUser, refreshData } = context;
  const { category, count = 1, date = getToday() } = args;

  // Validate
  if (!['reviews', 'demos', 'callbacks'].includes(category)) {
    return { success: false, error: 'Invalid category. Must be reviews, demos, or callbacks.' };
  }
  if (count < 1 || count > 100) {
    return { success: false, error: 'Count must be between 1 and 100.' };
  }

  try {
    const dailyLogs = await storage.get('dailyLogs', {});

    if (!dailyLogs[date]) {
      dailyLogs[date] = {};
    }
    if (!dailyLogs[date][currentUser.id]) {
      dailyLogs[date][currentUser.id] = { reviews: 0, demos: 0, callbacks: 0 };
    }

    const previousCount = dailyLogs[date][currentUser.id][category] || 0;
    dailyLogs[date][currentUser.id][category] = previousCount + count;

    await storage.set('dailyLogs', dailyLogs);

    // Queue sync to Supabase
    await queueSyncOperation({
      type: 'upsert',
      table: 'daily_logs',
      data: {
        user_id: currentUser.id,
        date,
        category,
        count: dailyLogs[date][currentUser.id][category],
      },
      conflictKey: 'user_id,date,category',
    });

    // Log the action
    await logAIAction('log_activity', 'daily_logs', `${date}_${currentUser.id}`, {
      category,
      count,
      previousCount,
      newCount: dailyLogs[date][currentUser.id][category],
    }, currentUser);

    // Refresh data if callback provided
    if (refreshData) refreshData();

    return {
      success: true,
      data: {
        message: `Logged ${count} ${category} for ${date}`,
        date,
        category,
        previousCount,
        newCount: dailyLogs[date][currentUser.id][category],
        todayTotals: dailyLogs[date][currentUser.id],
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Create appointment
 */
export const createAppointment = async (args, context) => {
  const { currentUser, refreshData } = context;
  const {
    customerName,
    date,
    time,
    products = [],
    notes = '',
    countsAsDemo = true,
  } = args;

  // Validate
  if (!customerName || customerName.trim().length < 2) {
    return { success: false, error: 'Customer name is required (minimum 2 characters).' };
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { success: false, error: 'Valid date is required (YYYY-MM-DD format).' };
  }

  try {
    const appointments = await storage.get('appointments', []);

    const newAppointment = {
      id: generateId(),
      userId: currentUser.id,
      userName: currentUser.name,
      customerName: sanitizeInput(customerName, 100),
      date,
      time: time || null,
      products: products.slice(0, 10),
      notes: sanitizeInput(notes, 500),
      countsAsDemo,
      timestamp: Date.now(),
    };

    appointments.unshift(newAppointment);
    await storage.set('appointments', appointments);

    // Queue sync to Supabase
    await queueSyncOperation({
      type: 'insert',
      table: 'appointments',
      data: {
        id: newAppointment.id,
        user_id: newAppointment.userId,
        customer_name: newAppointment.customerName,
        date: newAppointment.date,
        time: newAppointment.time,
        products: newAppointment.products,
        notes: newAppointment.notes,
        counts_as_demo: newAppointment.countsAsDemo,
        created_at: new Date().toISOString(),
      },
    });

    // If counts as demo, also log a demo
    if (countsAsDemo) {
      await logActivity({ category: 'demos', count: 1, date }, context);
    }

    // Log the action
    await logAIAction('create_appointment', 'appointments', newAppointment.id, {
      customerName: newAppointment.customerName,
      date,
      time,
      products,
      countsAsDemo,
    }, currentUser);

    // Refresh data if callback provided
    if (refreshData) refreshData();

    return {
      success: true,
      data: {
        message: `Appointment created for ${customerName} on ${date}${time ? ' at ' + time : ''}`,
        appointment: newAppointment,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Update user's goals
 */
export const updateMyGoals = async (args, context) => {
  const { currentUser, refreshData } = context;
  const { reviews, demos, callbacks } = args;

  if (reviews === undefined && demos === undefined && callbacks === undefined) {
    return { success: false, error: 'At least one goal (reviews, demos, or callbacks) must be specified.' };
  }

  try {
    const users = await storage.get('users', []);
    const userIndex = users.findIndex(u => u.id === currentUser.id);

    if (userIndex === -1) {
      return { success: false, error: 'User not found.' };
    }

    const previousGoals = { ...users[userIndex].goals };
    const newGoals = {
      reviews: reviews !== undefined ? Math.max(1, Math.min(100, reviews)) : previousGoals.reviews,
      demos: demos !== undefined ? Math.max(1, Math.min(100, demos)) : previousGoals.demos,
      callbacks: callbacks !== undefined ? Math.max(1, Math.min(100, callbacks)) : previousGoals.callbacks,
    };

    users[userIndex].goals = newGoals;
    await storage.set('users', users);

    // Queue sync to Supabase
    await queueSyncOperation({
      type: 'update',
      table: 'users',
      id: currentUser.id,
      data: { goals: newGoals },
    });

    // Log the action
    await logAIAction('update_goals', 'users', currentUser.id, {
      previousGoals,
      newGoals,
    }, currentUser);

    // Refresh data if callback provided
    if (refreshData) refreshData();

    return {
      success: true,
      data: {
        message: 'Goals updated successfully',
        previousGoals,
        newGoals,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Create feed post
 */
export const createFeedPost = async (args, context) => {
  const { currentUser, refreshData } = context;
  const { content } = args;

  if (!content || content.trim().length < 1) {
    return { success: false, error: 'Post content is required.' };
  }

  try {
    const feed = await storage.get('feed', []);

    const newPost = {
      id: generateId(),
      userId: currentUser.id,
      userName: currentUser.name,
      content: sanitizeInput(content, 500),
      timestamp: Date.now(),
      likes: [],
      comments: [],
      isAuto: false,
    };

    feed.unshift(newPost);
    await storage.set('feed', feed);

    // Queue sync to Supabase
    await queueSyncOperation({
      type: 'insert',
      table: 'feed_posts',
      data: {
        id: newPost.id,
        user_id: newPost.userId,
        content: newPost.content,
        type: 'manual',
        created_at: new Date().toISOString(),
      },
    });

    // Log the action
    await logAIAction('create_post', 'feed_posts', newPost.id, {
      contentPreview: content.substring(0, 50),
    }, currentUser);

    // Refresh data if callback provided
    if (refreshData) refreshData();

    return {
      success: true,
      data: {
        message: 'Post created successfully',
        post: newPost,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Quick increment activity
 */
export const incrementActivity = async (args, context) => {
  return logActivity({ ...args, count: 1 }, context);
};

// ========================================
// MANAGER READ TOOLS
// ========================================

/**
 * Get team stats
 */
export const getTeamStats = async (args, context) => {
  const { currentUser } = context;
  const { startDate, endDate, includeArchived = false } = args;

  // Verify manager role
  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  try {
    const users = await storage.get('users', []);
    const dailyLogs = await storage.get('dailyLogs', {});

    const activeUsers = includeArchived ? users : users.filter(u => !u.archived);

    const teamStats = activeUsers.map(user => {
      let reviews = 0, demos = 0, callbacks = 0;

      Object.entries(dailyLogs).forEach(([date, dateData]) => {
        if (date >= startDate && date <= endDate && dateData[user.id]) {
          reviews += dateData[user.id].reviews || 0;
          demos += dateData[user.id].demos || 0;
          callbacks += dateData[user.id].callbacks || 0;
        }
      });

      return {
        userId: user.id,
        userName: user.name,
        role: user.role,
        level: user.level || 1,
        goals: user.goals,
        reviews,
        demos,
        callbacks,
        total: reviews + demos + callbacks,
        archived: user.archived || false,
      };
    });

    // Sort by total
    teamStats.sort((a, b) => b.total - a.total);

    // Calculate totals
    const totals = teamStats.reduce((acc, u) => ({
      reviews: acc.reviews + u.reviews,
      demos: acc.demos + u.demos,
      callbacks: acc.callbacks + u.callbacks,
      total: acc.total + u.total,
    }), { reviews: 0, demos: 0, callbacks: 0, total: 0 });

    return {
      success: true,
      data: {
        dateRange: { startDate, endDate },
        userStats: teamStats,
        teamTotals: totals,
        teamAverages: {
          reviews: Math.round((totals.reviews / activeUsers.length) * 10) / 10,
          demos: Math.round((totals.demos / activeUsers.length) * 10) / 10,
          callbacks: Math.round((totals.callbacks / activeUsers.length) * 10) / 10,
        },
        userCount: activeUsers.length,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get specific user's stats (manager only)
 */
export const getUserStats = async (args, context) => {
  const { currentUser } = context;
  const { userName, userId, startDate, endDate } = args;

  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  try {
    const users = await storage.get('users', []);
    let targetUser;

    if (userId) {
      targetUser = users.find(u => u.id === userId);
    } else if (userName) {
      targetUser = findUserByName(users, userName);
    }

    if (!targetUser) {
      return { success: false, error: 'User not found.' };
    }

    // Get stats using the employee function
    const statsResult = await getMyStats(
      { startDate, endDate, category: 'all' },
      { currentUser: targetUser }
    );

    if (!statsResult.success) {
      return statsResult;
    }

    return {
      success: true,
      data: {
        user: {
          id: targetUser.id,
          name: targetUser.name,
          role: targetUser.role,
          level: targetUser.level || 1,
          goals: targetUser.goals,
        },
        ...statsResult.data,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get team appointments
 */
export const getTeamAppointments = async (args, context) => {
  const { currentUser } = context;
  const { startDate, endDate, userId, limit = 100 } = args;

  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  try {
    const appointments = await storage.get('appointments', []);
    const users = await storage.get('users', []);

    let filtered = appointments;

    if (startDate) {
      filtered = filtered.filter(a => a.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(a => a.date <= endDate);
    }
    if (userId) {
      filtered = filtered.filter(a => a.userId === userId);
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    filtered = filtered.slice(0, limit);

    // Add user names
    filtered = filtered.map(apt => ({
      ...apt,
      userName: users.find(u => u.id === apt.userId)?.name || 'Unknown',
    }));

    return {
      success: true,
      data: {
        appointments: filtered,
        totalCount: filtered.length,
        dateRange: { startDate, endDate },
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Generate report
 */
export const generateReport = async (args, context) => {
  const { currentUser } = context;
  const { reportType, startDate: customStart, endDate: customEnd } = args;

  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  try {
    let startDate, endDate;
    const today = getToday();

    switch (reportType) {
      case 'daily':
        startDate = endDate = today;
        break;
      case 'weekly':
        startDate = getWeekStart();
        endDate = today;
        break;
      case 'monthly':
        startDate = getMonthStart();
        endDate = today;
        break;
      case 'custom':
        if (!customStart || !customEnd) {
          return { success: false, error: 'Custom reports require startDate and endDate.' };
        }
        startDate = customStart;
        endDate = customEnd;
        break;
      default:
        startDate = getWeekStart();
        endDate = today;
    }

    // Get team stats
    const teamStatsResult = await getTeamStats(
      { startDate, endDate, includeArchived: false },
      context
    );

    if (!teamStatsResult.success) {
      return teamStatsResult;
    }

    // Get leaderboard
    const leaderboardResult = await getLeaderboard({ period: 'week', limit: 10 }, context);

    // Get appointments summary
    const appointmentsResult = await getTeamAppointments(
      { startDate, endDate, limit: 1000 },
      context
    );

    const report = {
      generatedAt: new Date().toISOString(),
      reportType,
      dateRange: { startDate, endDate, daysIncluded: daysBetween(startDate, endDate) },
      teamPerformance: teamStatsResult.data,
      leaderboard: leaderboardResult.success ? leaderboardResult.data.leaderboard : [],
      appointmentsSummary: {
        totalAppointments: appointmentsResult.success ? appointmentsResult.data.totalCount : 0,
        appointments: appointmentsResult.success ? appointmentsResult.data.appointments.slice(0, 20) : [],
      },
      highlights: {
        topPerformer: teamStatsResult.data.userStats[0]?.userName || 'N/A',
        totalTeamActivities: teamStatsResult.data.teamTotals.total,
        averagePerUser: Math.round(teamStatsResult.data.teamTotals.total / teamStatsResult.data.userCount),
      },
    };

    return { success: true, data: report };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get team overview
 */
export const getTeamOverview = async (args, context) => {
  const { currentUser } = context;

  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  try {
    const users = await storage.get('users', []);
    const dailyLogs = await storage.get('dailyLogs', {});
    const appointments = await storage.get('appointments', []);
    const challenges = await storage.get('challenges', []);

    const today = getToday();
    const activeUsers = users.filter(u => !u.archived);

    // Today's totals
    let todayReviews = 0, todayDemos = 0, todayCallbacks = 0;
    let usersActiveToday = 0;

    activeUsers.forEach(user => {
      const todayData = dailyLogs[today]?.[user.id];
      if (todayData) {
        todayReviews += todayData.reviews || 0;
        todayDemos += todayData.demos || 0;
        todayCallbacks += todayData.callbacks || 0;
        if ((todayData.reviews || 0) + (todayData.demos || 0) + (todayData.callbacks || 0) > 0) {
          usersActiveToday++;
        }
      }
    });

    const todayAppointments = appointments.filter(a => a.date === today);
    const activeChallenges = challenges.filter(c => c.isActive && c.endDate >= today);

    return {
      success: true,
      data: {
        date: today,
        team: {
          totalUsers: activeUsers.length,
          activeToday: usersActiveToday,
          managers: activeUsers.filter(u => u.role === 'manager').length,
          employees: activeUsers.filter(u => u.role === 'employee').length,
        },
        todayStats: {
          reviews: todayReviews,
          demos: todayDemos,
          callbacks: todayCallbacks,
          total: todayReviews + todayDemos + todayCallbacks,
          appointments: todayAppointments.length,
        },
        challenges: {
          active: activeChallenges.length,
        },
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Compare users
 */
export const compareUsers = async (args, context) => {
  const { currentUser } = context;
  const { userNames, startDate, endDate } = args;

  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  if (!userNames || userNames.length < 2 || userNames.length > 5) {
    return { success: false, error: 'Please specify 2-5 users to compare.' };
  }

  try {
    const users = await storage.get('users', []);

    const comparisons = [];

    for (const name of userNames) {
      const user = findUserByName(users, name);
      if (!user) {
        return { success: false, error: `User "${name}" not found.` };
      }

      const statsResult = await getMyStats(
        { startDate, endDate, category: 'all' },
        { currentUser: user }
      );

      if (statsResult.success) {
        comparisons.push({
          userId: user.id,
          userName: user.name,
          ...statsResult.data,
        });
      }
    }

    return {
      success: true,
      data: {
        dateRange: { startDate, endDate },
        comparisons,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get top performers
 */
export const getTopPerformers = async (args, context) => {
  const { currentUser } = context;
  const { period = 'week', category = 'total', limit = 5 } = args;

  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  try {
    let startDate;
    const endDate = getToday();

    switch (period) {
      case 'today': startDate = endDate; break;
      case 'week': startDate = getWeekStart(); break;
      case 'month': startDate = getMonthStart(); break;
      default: startDate = getWeekStart();
    }

    const teamStatsResult = await getTeamStats({ startDate, endDate }, context);

    if (!teamStatsResult.success) {
      return teamStatsResult;
    }

    let sorted = [...teamStatsResult.data.userStats];

    if (category === 'goal_completion') {
      // Sort by goal completion rate
      sorted = sorted.map(u => {
        const goals = u.goals || { reviews: 5, demos: 3, callbacks: 10 };
        const days = daysBetween(startDate, endDate);
        const reviewRate = u.reviews / (goals.reviews * days);
        const demoRate = u.demos / (goals.demos * days);
        const callbackRate = u.callbacks / (goals.callbacks * days);
        return {
          ...u,
          completionRate: Math.round(((reviewRate + demoRate + callbackRate) / 3) * 100),
        };
      });
      sorted.sort((a, b) => b.completionRate - a.completionRate);
    } else if (category !== 'total') {
      sorted.sort((a, b) => b[category] - a[category]);
    }

    return {
      success: true,
      data: {
        period,
        category,
        dateRange: { startDate, endDate },
        topPerformers: sorted.slice(0, limit),
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get underperformers
 */
export const getUnderperformers = async (args, context) => {
  const { currentUser } = context;
  const { period = 'week', threshold = 50 } = args;

  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  try {
    let startDate;
    const endDate = getToday();

    switch (period) {
      case 'today': startDate = endDate; break;
      case 'week': startDate = getWeekStart(); break;
      case 'month': startDate = getMonthStart(); break;
      default: startDate = getWeekStart();
    }

    const teamStatsResult = await getTeamStats({ startDate, endDate }, context);

    if (!teamStatsResult.success) {
      return teamStatsResult;
    }

    const days = daysBetween(startDate, endDate);

    const usersWithRates = teamStatsResult.data.userStats.map(u => {
      const goals = u.goals || { reviews: 5, demos: 3, callbacks: 10 };
      const reviewRate = (u.reviews / (goals.reviews * days)) * 100;
      const demoRate = (u.demos / (goals.demos * days)) * 100;
      const callbackRate = (u.callbacks / (goals.callbacks * days)) * 100;
      const avgRate = (reviewRate + demoRate + callbackRate) / 3;

      return {
        ...u,
        goalCompletionRate: Math.round(avgRate),
        reviewsRate: Math.round(reviewRate),
        demosRate: Math.round(demoRate),
        callbacksRate: Math.round(callbackRate),
      };
    });

    const underperformers = usersWithRates
      .filter(u => u.goalCompletionRate < threshold)
      .sort((a, b) => a.goalCompletionRate - b.goalCompletionRate);

    return {
      success: true,
      data: {
        period,
        threshold,
        dateRange: { startDate, endDate },
        underperformers,
        message: underperformers.length === 0
          ? `Great news! No users are below ${threshold}% goal completion.`
          : `${underperformers.length} user(s) below ${threshold}% goal completion.`,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get audit log
 */
export const getAuditLog = async (args, context) => {
  const { currentUser } = context;
  const { limit = 50, actionType, userId } = args;

  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  try {
    let auditLog = await storage.get('auditLog', []);

    if (actionType) {
      auditLog = auditLog.filter(e => e.action === actionType || e.action?.includes(actionType));
    }
    if (userId) {
      auditLog = auditLog.filter(e => e.userId === userId);
    }

    return {
      success: true,
      data: {
        entries: auditLog.slice(0, limit),
        totalEntries: auditLog.length,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get rewards
 */
export const getRewards = async (args, context) => {
  const { currentUser } = context;
  const { includeEarned = true } = args;

  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  try {
    const rewards = await storage.get('rewards', []);
    const userRewards = await storage.get('userRewards', []);

    const result = rewards.map(reward => {
      const earned = userRewards.filter(ur => ur.rewardId === reward.id);
      return {
        ...reward,
        earnedByCount: earned.length,
        earnedBy: includeEarned ? earned : [],
      };
    });

    return {
      success: true,
      data: {
        rewards: result,
        totalRewards: rewards.length,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========================================
// MANAGER WRITE TOOLS
// ========================================

/**
 * Create challenge
 */
export const createChallenge = async (args, context) => {
  const { currentUser, refreshData } = context;
  const {
    title,
    description,
    challengeType,
    goalType,
    goalValue,
    xpReward = 100,
    startDate = getToday(),
    endDate,
    targetUsers = [],
  } = args;

  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  // Validate
  if (!title || title.trim().length < 3) {
    return { success: false, error: 'Challenge title is required (minimum 3 characters).' };
  }
  if (!endDate) {
    return { success: false, error: 'End date is required.' };
  }

  try {
    const challenges = await storage.get('challenges', []);

    const newChallenge = {
      id: generateId(),
      title: sanitizeInput(title, 100),
      description: sanitizeInput(description, 500),
      challengeType,
      goalType,
      goalValue,
      xpReward: Math.min(1000, Math.max(0, xpReward)),
      startDate,
      endDate,
      isActive: true,
      createdBy: currentUser.id,
      targetUsers,
    };

    challenges.unshift(newChallenge);
    await storage.set('challenges', challenges);

    // Queue sync to Supabase
    await queueSyncOperation({
      type: 'insert',
      table: 'challenges',
      data: {
        id: newChallenge.id,
        title: newChallenge.title,
        description: newChallenge.description,
        challenge_type: newChallenge.challengeType,
        goal_type: newChallenge.goalType,
        goal_value: newChallenge.goalValue,
        xp_reward: newChallenge.xpReward,
        start_date: newChallenge.startDate,
        end_date: newChallenge.endDate,
        is_active: true,
        created_by: currentUser.id,
        target_users: targetUsers,
      },
    });

    // Log the action
    await logAIAction('create_challenge', 'challenges', newChallenge.id, {
      title: newChallenge.title,
      challengeType,
      goalType,
      goalValue,
      xpReward,
    }, currentUser);

    if (refreshData) refreshData();

    return {
      success: true,
      data: {
        message: `Challenge "${title}" created successfully!`,
        challenge: newChallenge,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Update another user's goals
 */
export const updateUserGoals = async (args, context) => {
  const { currentUser, refreshData } = context;
  const { userName, userId, reviews, demos, callbacks } = args;

  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  if (!userName && !userId) {
    return { success: false, error: 'Please specify the user by name or ID.' };
  }

  try {
    const users = await storage.get('users', []);
    let targetUser;
    let userIndex;

    if (userId) {
      userIndex = users.findIndex(u => u.id === userId);
      targetUser = users[userIndex];
    } else {
      targetUser = findUserByName(users, userName);
      userIndex = users.findIndex(u => u.id === targetUser?.id);
    }

    if (!targetUser || userIndex === -1) {
      return { success: false, error: 'User not found.' };
    }

    const previousGoals = { ...targetUser.goals };
    const newGoals = {
      reviews: reviews !== undefined ? Math.max(1, Math.min(100, reviews)) : previousGoals.reviews,
      demos: demos !== undefined ? Math.max(1, Math.min(100, demos)) : previousGoals.demos,
      callbacks: callbacks !== undefined ? Math.max(1, Math.min(100, callbacks)) : previousGoals.callbacks,
    };

    users[userIndex].goals = newGoals;
    await storage.set('users', users);

    // Queue sync to Supabase
    await queueSyncOperation({
      type: 'update',
      table: 'users',
      id: targetUser.id,
      data: { goals: newGoals },
    });

    // Log the action
    await logAIAction('update_user_goals', 'users', targetUser.id, {
      targetUser: targetUser.name,
      previousGoals,
      newGoals,
    }, currentUser);

    if (refreshData) refreshData();

    return {
      success: true,
      data: {
        message: `Goals updated for ${targetUser.name}`,
        user: targetUser.name,
        previousGoals,
        newGoals,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Create team announcement
 */
export const createTeamAnnouncement = async (args, context) => {
  const { currentUser, refreshData } = context;
  const { content, priority = 'normal' } = args;

  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  if (!content || content.trim().length < 1) {
    return { success: false, error: 'Announcement content is required.' };
  }

  try {
    const feed = await storage.get('feed', []);

    const announcement = {
      id: generateId(),
      userId: currentUser.id,
      userName: currentUser.name,
      content: sanitizeInput(content, 1000),
      timestamp: Date.now(),
      likes: [],
      comments: [],
      isAuto: false,
      isAnnouncement: true,
      priority,
    };

    feed.unshift(announcement);
    await storage.set('feed', feed);

    // Queue sync to Supabase
    await queueSyncOperation({
      type: 'insert',
      table: 'feed_posts',
      data: {
        id: announcement.id,
        user_id: announcement.userId,
        content: announcement.content,
        type: 'announcement',
        created_at: new Date().toISOString(),
      },
    });

    // Log the action
    await logAIAction('create_announcement', 'feed_posts', announcement.id, {
      contentPreview: content.substring(0, 50),
      priority,
    }, currentUser);

    if (refreshData) refreshData();

    return {
      success: true,
      data: {
        message: 'Team announcement posted successfully',
        post: announcement,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Award bonus XP
 */
export const awardBonusXP = async (args, context) => {
  const { currentUser, refreshData } = context;
  const { userName, userId, amount, reason } = args;

  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  if (!userName && !userId) {
    return { success: false, error: 'Please specify the user by name or ID.' };
  }
  if (!amount || amount < 1 || amount > 1000) {
    return { success: false, error: 'XP amount must be between 1 and 1000.' };
  }
  if (!reason || reason.trim().length < 3) {
    return { success: false, error: 'Please provide a reason for the bonus XP.' };
  }

  try {
    const users = await storage.get('users', []);
    let targetUser;
    let userIndex;

    if (userId) {
      userIndex = users.findIndex(u => u.id === userId);
      targetUser = users[userIndex];
    } else {
      targetUser = findUserByName(users, userName);
      userIndex = users.findIndex(u => u.id === targetUser?.id);
    }

    if (!targetUser || userIndex === -1) {
      return { success: false, error: 'User not found.' };
    }

    const previousXP = targetUser.xp || 0;
    const previousLevel = targetUser.level || 1;

    users[userIndex].xp = previousXP + amount;

    // Check for level up
    let newLevel = previousLevel;
    while (users[userIndex].xp >= newLevel * 100) {
      newLevel++;
    }
    users[userIndex].level = newLevel;

    await storage.set('users', users);

    // Queue sync to Supabase
    await queueSyncOperation({
      type: 'update',
      table: 'users',
      id: targetUser.id,
      data: {
        xp: users[userIndex].xp,
        level: users[userIndex].level,
      },
    });

    // Log the action
    await logAIAction('award_bonus_xp', 'users', targetUser.id, {
      targetUser: targetUser.name,
      amount,
      reason,
      previousXP,
      newXP: users[userIndex].xp,
      leveledUp: newLevel > previousLevel,
    }, currentUser);

    if (refreshData) refreshData();

    return {
      success: true,
      data: {
        message: `Awarded ${amount} bonus XP to ${targetUser.name}`,
        user: targetUser.name,
        xpAwarded: amount,
        reason,
        previousXP,
        newXP: users[userIndex].xp,
        leveledUp: newLevel > previousLevel,
        newLevel: newLevel > previousLevel ? newLevel : undefined,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Archive user
 */
export const archiveUser = async (args, context) => {
  const { currentUser, refreshData } = context;
  const { userName, userId, reason } = args;

  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  if (!userName && !userId) {
    return { success: false, error: 'Please specify the user by name or ID.' };
  }
  if (!reason || reason.trim().length < 3) {
    return { success: false, error: 'Please provide a reason for archiving.' };
  }

  try {
    const users = await storage.get('users', []);
    let targetUser;
    let userIndex;

    if (userId) {
      userIndex = users.findIndex(u => u.id === userId);
      targetUser = users[userIndex];
    } else {
      targetUser = findUserByName(users, userName);
      userIndex = users.findIndex(u => u.id === targetUser?.id);
    }

    if (!targetUser || userIndex === -1) {
      return { success: false, error: 'User not found.' };
    }

    if (targetUser.id === currentUser.id) {
      return { success: false, error: 'You cannot archive yourself.' };
    }

    if (targetUser.archived) {
      return { success: false, error: 'User is already archived.' };
    }

    users[userIndex].archived = true;
    users[userIndex].archivedAt = new Date().toISOString();
    users[userIndex].archivedBy = currentUser.id;

    await storage.set('users', users);

    // Queue sync to Supabase
    await queueSyncOperation({
      type: 'update',
      table: 'users',
      id: targetUser.id,
      data: {
        archived: true,
        archived_at: users[userIndex].archivedAt,
        archived_by: currentUser.id,
      },
    });

    // Log the action
    await logAIAction('archive_user', 'users', targetUser.id, {
      targetUser: targetUser.name,
      reason,
    }, currentUser);

    if (refreshData) refreshData();

    return {
      success: true,
      data: {
        message: `User ${targetUser.name} has been archived`,
        user: targetUser.name,
        reason,
        archivedAt: users[userIndex].archivedAt,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Create reward
 */
export const createReward = async (args, context) => {
  const { currentUser, refreshData } = context;
  const {
    name,
    description,
    rewardType,
    rewardCategory,
    requiredLevel,
    icon,
  } = args;

  if (currentUser.role !== 'manager') {
    return { success: false, error: 'This action requires manager permissions.' };
  }

  if (!name || name.trim().length < 2) {
    return { success: false, error: 'Reward name is required (minimum 2 characters).' };
  }
  if (!description || description.trim().length < 5) {
    return { success: false, error: 'Reward description is required (minimum 5 characters).' };
  }

  try {
    const rewards = await storage.get('rewards', []);

    const newReward = {
      id: generateId(),
      name: sanitizeInput(name, 100),
      description: sanitizeInput(description, 500),
      rewardType: rewardType || 'virtual',
      rewardCategory: rewardCategory || 'badge',
      requiredLevel: requiredLevel ? Math.max(1, Math.min(20, requiredLevel)) : null,
      icon: icon || '🏆',
    };

    rewards.push(newReward);
    await storage.set('rewards', rewards);

    // Queue sync to Supabase
    await queueSyncOperation({
      type: 'insert',
      table: 'rewards',
      data: {
        id: newReward.id,
        name: newReward.name,
        description: newReward.description,
        reward_type: newReward.rewardType,
        reward_category: newReward.rewardCategory,
        required_level: newReward.requiredLevel,
        icon: newReward.icon,
      },
    });

    // Log the action
    await logAIAction('create_reward', 'rewards', newReward.id, {
      name: newReward.name,
      rewardType,
      rewardCategory,
    }, currentUser);

    if (refreshData) refreshData();

    return {
      success: true,
      data: {
        message: `Reward "${name}" created successfully!`,
        reward: newReward,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========================================
// TOOL EXECUTOR
// ========================================

/**
 * Map of tool names to their implementation functions
 */
const toolImplementations = {
  // Employee read tools
  getMyStats,
  getMyAppointments,
  getMyProfile,
  getMyAchievementProgress,
  getLeaderboard,
  getMyGoals,
  analyzeMyPatterns,
  getMyFeedActivity,
  getTodaysSummary,
  getChallenges,
  // Employee write tools
  logActivity,
  createAppointment,
  updateMyGoals,
  createFeedPost,
  incrementActivity,
  // Manager read tools
  getTeamStats,
  getUserStats,
  getTeamAppointments,
  generateReport,
  getTeamOverview,
  compareUsers,
  getTopPerformers,
  getUnderperformers,
  getAuditLog,
  getRewards,
  // Manager write tools
  createChallenge,
  updateUserGoals,
  createTeamAnnouncement,
  awardBonusXP,
  archiveUser,
  createReward,
};

/**
 * Execute a tool by name with given arguments and context
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} args - Arguments for the tool
 * @param {Object} context - Context with currentUser and other data
 * @returns {Promise<Object>} Tool result
 */
export const executeTool = async (toolName, args, context) => {
  const toolFn = toolImplementations[toolName];

  if (!toolFn) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
    };
  }

  try {
    return await toolFn(args, context);
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return {
      success: false,
      error: error.message || 'Tool execution failed',
    };
  }
};

const aiToolsModule = {
  executeTool,
  // Export individual tools for direct use if needed
  ...toolImplementations,
};

export default aiToolsModule;
