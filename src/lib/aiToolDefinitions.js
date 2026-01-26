/**
 * AI Tool Definitions for Gemini Function Calling
 *
 * This file defines all the tools available to the AI coach, organized by role.
 * Each tool has:
 * - name: Unique identifier for the function
 * - description: What the tool does (shown to the AI)
 * - parameters: JSON schema for expected parameters
 * - requiredRole: 'employee' (available to all) or 'manager' (manager only)
 */

// ========================================
// EMPLOYEE TOOLS - Read/Query Operations
// ========================================

export const getMyStatsDefinition = {
  name: 'getMyStats',
  description: 'Get the current user\'s activity statistics (reviews, demos, callbacks) for a specified date range. Use this to answer questions about their performance history, daily totals, weekly totals, trends, and patterns.',
  parameters: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format. Use today\'s date for current day stats.'
      },
      endDate: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format. Use today\'s date for current day stats.'
      },
      category: {
        type: 'string',
        enum: ['reviews', 'demos', 'callbacks', 'all'],
        description: 'Filter by specific category or "all" for all categories. Default is "all".'
      }
    },
    required: ['startDate', 'endDate']
  },
  requiredRole: 'employee'
};

export const getMyAppointmentsDefinition = {
  name: 'getMyAppointments',
  description: 'Get the current user\'s appointments with full details including customer name, date, time, products, and notes. Use this to answer questions about their appointments, scheduling patterns, and product interests.',
  parameters: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Filter appointments from this date (YYYY-MM-DD). Optional - if not provided, returns all appointments.'
      },
      endDate: {
        type: 'string',
        description: 'Filter appointments until this date (YYYY-MM-DD). Optional.'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of appointments to return. Default is 50.'
      }
    },
    required: []
  },
  requiredRole: 'employee'
};

export const getMyProfileDefinition = {
  name: 'getMyProfile',
  description: 'Get the current user\'s full profile including XP, level, streaks, achievements, and goals. Use this to answer questions about their gamification progress, achievements earned, and current streak.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  requiredRole: 'employee'
};

export const getMyAchievementProgressDefinition = {
  name: 'getMyAchievementProgress',
  description: 'Get detailed progress toward all achievements for the current user. Shows earned achievements and progress toward unearned ones.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  requiredRole: 'employee'
};

export const getLeaderboardDefinition = {
  name: 'getLeaderboard',
  description: 'Get the current leaderboard rankings. Shows user rankings based on activities completed during the specified period.',
  parameters: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        enum: ['today', 'week', 'month', 'all_time'],
        description: 'Time period for the leaderboard. Default is "week".'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of users to return. Default is 10.'
      }
    },
    required: []
  },
  requiredRole: 'employee'
};

export const getMyGoalsDefinition = {
  name: 'getMyGoals',
  description: 'Get the current user\'s daily goals for reviews, demos, and callbacks.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  requiredRole: 'employee'
};

export const analyzeMyPatternsDefinition = {
  name: 'analyzeMyPatterns',
  description: 'Analyze the current user\'s activity patterns including best days of the week, time patterns for appointments, goal completion rates, and trends. Use this to answer questions like "What time do I usually schedule demos?" or "What\'s my best day of the week?"',
  parameters: {
    type: 'object',
    properties: {
      analysisType: {
        type: 'string',
        enum: ['time_of_day', 'day_of_week', 'trends', 'goal_completion', 'all'],
        description: 'Type of pattern analysis to perform. Default is "all".'
      },
      days: {
        type: 'number',
        description: 'Number of days to analyze. Default is 30.'
      }
    },
    required: []
  },
  requiredRole: 'employee'
};

export const getMyFeedActivityDefinition = {
  name: 'getMyFeedActivity',
  description: 'Get the current user\'s feed posts and engagement statistics including likes received and comments.',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of posts to return. Default is 20.'
      }
    },
    required: []
  },
  requiredRole: 'employee'
};

export const getTodaysSummaryDefinition = {
  name: 'getTodaysSummary',
  description: 'Get a comprehensive summary of today\'s activities, progress toward goals, and key metrics. Quick overview of current day status.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  requiredRole: 'employee'
};

export const getChallengesDefinition = {
  name: 'getChallenges',
  description: 'Get active challenges and the current user\'s progress on them.',
  parameters: {
    type: 'object',
    properties: {
      includeCompleted: {
        type: 'boolean',
        description: 'Whether to include completed challenges. Default is false.'
      }
    },
    required: []
  },
  requiredRole: 'employee'
};

// ========================================
// EMPLOYEE TOOLS - Write/Action Operations
// ========================================

export const logActivityDefinition = {
  name: 'logActivity',
  description: 'Log activities (reviews, demos, or callbacks) for the current user. Use this when the user wants to record their work. This adds to the existing count for today.',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['reviews', 'demos', 'callbacks'],
        description: 'The category of activity to log.'
      },
      count: {
        type: 'number',
        description: 'Number of activities to add. Must be a positive integer. Default is 1.'
      },
      date: {
        type: 'string',
        description: 'Date to log the activity for in YYYY-MM-DD format. Default is today.'
      }
    },
    required: ['category']
  },
  requiredRole: 'employee'
};

export const createAppointmentDefinition = {
  name: 'createAppointment',
  description: 'Create a new appointment for the current user. Use this when the user wants to schedule or log an appointment with a customer.',
  parameters: {
    type: 'object',
    properties: {
      customerName: {
        type: 'string',
        description: 'Name of the customer for the appointment.'
      },
      date: {
        type: 'string',
        description: 'Date of the appointment in YYYY-MM-DD format.'
      },
      time: {
        type: 'string',
        description: 'Time of the appointment in HH:MM format (24-hour). Optional.'
      },
      products: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of products the customer is interested in. Options: "windows", "doors", "siding", "roofing", "gutters".'
      },
      notes: {
        type: 'string',
        description: 'Additional notes about the appointment. Optional.'
      },
      countsAsDemo: {
        type: 'boolean',
        description: 'Whether this appointment counts as a demo. Default is true.'
      }
    },
    required: ['customerName', 'date']
  },
  requiredRole: 'employee'
};

export const updateMyGoalsDefinition = {
  name: 'updateMyGoals',
  description: 'Update the current user\'s daily goals. Use this when the user wants to change their target numbers for reviews, demos, or callbacks.',
  parameters: {
    type: 'object',
    properties: {
      reviews: {
        type: 'number',
        description: 'New daily goal for reviews. Must be a positive integer.'
      },
      demos: {
        type: 'number',
        description: 'New daily goal for demos. Must be a positive integer.'
      },
      callbacks: {
        type: 'number',
        description: 'New daily goal for callbacks. Must be a positive integer.'
      }
    },
    required: []
  },
  requiredRole: 'employee'
};

export const createFeedPostDefinition = {
  name: 'createFeedPost',
  description: 'Create a new post on the team feed. Use this when the user wants to share an update, celebration, or message with the team.',
  parameters: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The content of the post. Maximum 500 characters.'
      }
    },
    required: ['content']
  },
  requiredRole: 'employee'
};

export const incrementActivityDefinition = {
  name: 'incrementActivity',
  description: 'Quick increment: Add one activity to a category for today. Shortcut for logging a single activity.',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['reviews', 'demos', 'callbacks'],
        description: 'The category to increment.'
      }
    },
    required: ['category']
  },
  requiredRole: 'employee'
};

// ========================================
// MANAGER TOOLS - Read/Query Operations
// ========================================

export const getTeamStatsDefinition = {
  name: 'getTeamStats',
  description: 'Get activity statistics for all team members. Manager only. Use this to see team-wide performance and compare users.',
  parameters: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format.'
      },
      endDate: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format.'
      },
      includeArchived: {
        type: 'boolean',
        description: 'Whether to include archived users. Default is false.'
      }
    },
    required: ['startDate', 'endDate']
  },
  requiredRole: 'manager'
};

export const getUserStatsDefinition = {
  name: 'getUserStats',
  description: 'Get activity statistics for a specific user by name or ID. Manager only.',
  parameters: {
    type: 'object',
    properties: {
      userName: {
        type: 'string',
        description: 'Name of the user to query. Case-insensitive partial match supported.'
      },
      userId: {
        type: 'string',
        description: 'ID of the user to query. Use this if you have the exact user ID.'
      },
      startDate: {
        type: 'string',
        description: 'Start date in YYYY-MM-DD format.'
      },
      endDate: {
        type: 'string',
        description: 'End date in YYYY-MM-DD format.'
      }
    },
    required: ['startDate', 'endDate']
  },
  requiredRole: 'manager'
};

export const getTeamAppointmentsDefinition = {
  name: 'getTeamAppointments',
  description: 'Get all team appointments. Manager only. Use this to see all scheduled appointments across the team.',
  parameters: {
    type: 'object',
    properties: {
      startDate: {
        type: 'string',
        description: 'Filter appointments from this date (YYYY-MM-DD).'
      },
      endDate: {
        type: 'string',
        description: 'Filter appointments until this date (YYYY-MM-DD).'
      },
      userId: {
        type: 'string',
        description: 'Filter by specific user ID. Optional.'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of appointments to return. Default is 100.'
      }
    },
    required: []
  },
  requiredRole: 'manager'
};

export const generateReportDefinition = {
  name: 'generateReport',
  description: 'Generate a performance report for the team. Manager only. Creates a comprehensive summary with statistics, rankings, and insights.',
  parameters: {
    type: 'object',
    properties: {
      reportType: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly', 'custom'],
        description: 'Type of report to generate.'
      },
      startDate: {
        type: 'string',
        description: 'Start date for custom report (YYYY-MM-DD). Required for custom report type.'
      },
      endDate: {
        type: 'string',
        description: 'End date for custom report (YYYY-MM-DD). Required for custom report type.'
      },
      includeCharts: {
        type: 'boolean',
        description: 'Whether to include chart data in the report. Default is true.'
      }
    },
    required: ['reportType']
  },
  requiredRole: 'manager'
};

export const getTeamOverviewDefinition = {
  name: 'getTeamOverview',
  description: 'Get a quick overview of the entire team\'s current status. Manager only. Shows active users, today\'s totals, and key metrics.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  requiredRole: 'manager'
};

export const compareUsersDefinition = {
  name: 'compareUsers',
  description: 'Compare performance between two or more users. Manager only.',
  parameters: {
    type: 'object',
    properties: {
      userNames: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of user names to compare (2-5 users).'
      },
      startDate: {
        type: 'string',
        description: 'Start date for comparison period (YYYY-MM-DD).'
      },
      endDate: {
        type: 'string',
        description: 'End date for comparison period (YYYY-MM-DD).'
      }
    },
    required: ['userNames', 'startDate', 'endDate']
  },
  requiredRole: 'manager'
};

export const getTopPerformersDefinition = {
  name: 'getTopPerformers',
  description: 'Get the top performing users for a period. Manager only.',
  parameters: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        enum: ['today', 'week', 'month'],
        description: 'Time period to analyze. Default is "week".'
      },
      category: {
        type: 'string',
        enum: ['reviews', 'demos', 'callbacks', 'total', 'goal_completion'],
        description: 'Category to rank by. Default is "total".'
      },
      limit: {
        type: 'number',
        description: 'Number of top performers to return. Default is 5.'
      }
    },
    required: []
  },
  requiredRole: 'manager'
};

export const getUnderperformersDefinition = {
  name: 'getUnderperformers',
  description: 'Identify users who are falling behind on their goals. Manager only. Useful for identifying who might need support.',
  parameters: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        enum: ['today', 'week', 'month'],
        description: 'Time period to analyze. Default is "week".'
      },
      threshold: {
        type: 'number',
        description: 'Goal completion percentage threshold (0-100). Users below this are flagged. Default is 50.'
      }
    },
    required: []
  },
  requiredRole: 'manager'
};

export const getAuditLogDefinition = {
  name: 'getAuditLog',
  description: 'View the system audit log of recent actions and changes. Manager only.',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of entries to return. Default is 50.'
      },
      actionType: {
        type: 'string',
        description: 'Filter by action type (e.g., "user_created", "goal_changed"). Optional.'
      },
      userId: {
        type: 'string',
        description: 'Filter by user ID who performed the action. Optional.'
      }
    },
    required: []
  },
  requiredRole: 'manager'
};

export const getRewardsDefinition = {
  name: 'getRewards',
  description: 'Get available rewards and their unlock requirements. Shows both earned and available rewards.',
  parameters: {
    type: 'object',
    properties: {
      includeEarned: {
        type: 'boolean',
        description: 'Whether to include rewards already earned by users. Default is true.'
      }
    },
    required: []
  },
  requiredRole: 'manager'
};

// ========================================
// MANAGER TOOLS - Write/Action Operations
// ========================================

export const createChallengeDefinition = {
  name: 'createChallenge',
  description: 'Create a new challenge for the team or specific users. Manager only.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Title of the challenge.'
      },
      description: {
        type: 'string',
        description: 'Description of what the challenge entails.'
      },
      challengeType: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly', 'team'],
        description: 'Type of challenge. Team challenges are collaborative.'
      },
      goalType: {
        type: 'string',
        enum: ['activities', 'reviews', 'demos', 'callbacks', 'appointments', 'goals_met'],
        description: 'What metric the challenge tracks.'
      },
      goalValue: {
        type: 'number',
        description: 'Target value to reach.'
      },
      xpReward: {
        type: 'number',
        description: 'XP reward for completing the challenge. Default is 100.'
      },
      startDate: {
        type: 'string',
        description: 'Start date of the challenge (YYYY-MM-DD). Default is today.'
      },
      endDate: {
        type: 'string',
        description: 'End date of the challenge (YYYY-MM-DD). Required.'
      },
      targetUsers: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of user IDs who can participate. Empty array means all users.'
      }
    },
    required: ['title', 'description', 'challengeType', 'goalType', 'goalValue', 'endDate']
  },
  requiredRole: 'manager'
};

export const updateUserGoalsDefinition = {
  name: 'updateUserGoals',
  description: 'Update the daily goals for a specific user. Manager only.',
  parameters: {
    type: 'object',
    properties: {
      userName: {
        type: 'string',
        description: 'Name of the user whose goals to update.'
      },
      userId: {
        type: 'string',
        description: 'ID of the user. Use if you have the exact ID.'
      },
      reviews: {
        type: 'number',
        description: 'New daily goal for reviews.'
      },
      demos: {
        type: 'number',
        description: 'New daily goal for demos.'
      },
      callbacks: {
        type: 'number',
        description: 'New daily goal for callbacks.'
      }
    },
    required: []
  },
  requiredRole: 'manager'
};

export const createTeamAnnouncementDefinition = {
  name: 'createTeamAnnouncement',
  description: 'Create an announcement post on the team feed. Manager only. Announcements are highlighted differently from regular posts.',
  parameters: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'The announcement content. Maximum 1000 characters.'
      },
      priority: {
        type: 'string',
        enum: ['normal', 'important', 'urgent'],
        description: 'Priority level of the announcement. Default is "normal".'
      }
    },
    required: ['content']
  },
  requiredRole: 'manager'
};

export const awardBonusXPDefinition = {
  name: 'awardBonusXP',
  description: 'Award bonus XP to a user for exceptional performance. Manager only.',
  parameters: {
    type: 'object',
    properties: {
      userName: {
        type: 'string',
        description: 'Name of the user to award XP to.'
      },
      userId: {
        type: 'string',
        description: 'ID of the user. Use if you have the exact ID.'
      },
      amount: {
        type: 'number',
        description: 'Amount of XP to award. Must be positive, max 1000.'
      },
      reason: {
        type: 'string',
        description: 'Reason for the bonus XP award.'
      }
    },
    required: ['amount', 'reason']
  },
  requiredRole: 'manager'
};

export const archiveUserDefinition = {
  name: 'archiveUser',
  description: 'Archive a user account. Manager only. Archived users are hidden from active lists but data is preserved.',
  parameters: {
    type: 'object',
    properties: {
      userName: {
        type: 'string',
        description: 'Name of the user to archive.'
      },
      userId: {
        type: 'string',
        description: 'ID of the user to archive.'
      },
      reason: {
        type: 'string',
        description: 'Reason for archiving the user.'
      }
    },
    required: ['reason']
  },
  requiredRole: 'manager'
};

export const createRewardDefinition = {
  name: 'createReward',
  description: 'Create a new reward that users can earn. Manager only.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Name of the reward.'
      },
      description: {
        type: 'string',
        description: 'Description of the reward.'
      },
      rewardType: {
        type: 'string',
        enum: ['virtual', 'real'],
        description: 'Whether the reward is virtual (in-app) or real (physical/gift card).'
      },
      rewardCategory: {
        type: 'string',
        description: 'Category of reward (e.g., "badge", "theme", "gift_card", "team_lunch").'
      },
      requiredLevel: {
        type: 'number',
        description: 'Level required to unlock this reward. Optional.'
      },
      icon: {
        type: 'string',
        description: 'Emoji or icon for the reward. Optional.'
      }
    },
    required: ['name', 'description', 'rewardType']
  },
  requiredRole: 'manager'
};

// ========================================
// UTILITY - Get All Tool Definitions
// ========================================

/**
 * Get all employee tools (available to all users)
 */
export const getEmployeeTools = () => [
  // Read tools
  getMyStatsDefinition,
  getMyAppointmentsDefinition,
  getMyProfileDefinition,
  getMyAchievementProgressDefinition,
  getLeaderboardDefinition,
  getMyGoalsDefinition,
  analyzeMyPatternsDefinition,
  getMyFeedActivityDefinition,
  getTodaysSummaryDefinition,
  getChallengesDefinition,
  // Write tools
  logActivityDefinition,
  createAppointmentDefinition,
  updateMyGoalsDefinition,
  createFeedPostDefinition,
  incrementActivityDefinition,
];

/**
 * Get all manager tools (only available to managers)
 */
export const getManagerTools = () => [
  // Read tools
  getTeamStatsDefinition,
  getUserStatsDefinition,
  getTeamAppointmentsDefinition,
  generateReportDefinition,
  getTeamOverviewDefinition,
  compareUsersDefinition,
  getTopPerformersDefinition,
  getUnderperformersDefinition,
  getAuditLogDefinition,
  getRewardsDefinition,
  // Write tools
  createChallengeDefinition,
  updateUserGoalsDefinition,
  createTeamAnnouncementDefinition,
  awardBonusXPDefinition,
  archiveUserDefinition,
  createRewardDefinition,
];

/**
 * Get all tools for a user based on their role
 * @param {string} role - User role ('employee' or 'manager')
 * @returns {Array} Array of tool definitions
 */
export const getToolsForRole = (role) => {
  const employeeTools = getEmployeeTools();

  if (role === 'manager') {
    return [...employeeTools, ...getManagerTools()];
  }

  return employeeTools;
};

/**
 * Convert tool definitions to Gemini function declarations format
 * @param {Array} tools - Array of tool definitions
 * @returns {Array} Array formatted for Gemini API
 */
export const toGeminiFunctionDeclarations = (tools) => {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
};

const aiToolDefinitionsModule = {
  getEmployeeTools,
  getManagerTools,
  getToolsForRole,
  toGeminiFunctionDeclarations,
};

export default aiToolDefinitionsModule;
