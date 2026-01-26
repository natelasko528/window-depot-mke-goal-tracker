import { GoogleGenerativeAI } from '@google/generative-ai';
import { getToolsForRole, toGeminiFunctionDeclarations } from './aiToolDefinitions';
import { executeTool } from './aiTools';

// Default API key from environment variable
let API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';
let genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// Current model configuration
let currentModel = 'gemini-2.0-flash';

// Cache for fetched models
let cachedTextModels = null;
let cachedLiveModels = null;
let modelsCacheTime = 0;
const MODELS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Fallback models if API fetch fails
export const TEXT_MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fast and efficient' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', description: 'Lightweight version' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: 'Previous generation' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Pro model' },
];

// Known live models (models that support bidiGenerateContent for voice chat)
// These are always included as options since the API may not list all preview models
export const LIVE_MODELS_FALLBACK = [
  { id: 'gemini-2.5-flash-native-audio-preview-12-2025', name: 'Gemini 2.5 Flash Native Audio (Recommended)', description: 'Real-time voice streaming' },
  { id: 'gemini-2.0-flash-live-001', name: 'Gemini 2.0 Flash Live', description: 'Live streaming model' },
];

/**
 * Fetch available models from the Gemini API
 * @param {string} apiKey - The API key to use
 * @returns {Promise<{textModels: Array, liveModels: Array}>}
 */
export const fetchAvailableModels = async (apiKey = API_KEY) => {
  if (!apiKey) {
    return { textModels: TEXT_MODELS, liveModels: LIVE_MODELS_FALLBACK };
  }

  // Check cache
  const now = Date.now();
  if (cachedTextModels && cachedLiveModels && (now - modelsCacheTime) < MODELS_CACHE_DURATION) {
    return { textModels: cachedTextModels, liveModels: cachedLiveModels };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    const models = data.models || [];

    // Filter and categorize models
    const textModels = [];
    const liveModels = [];

    for (const model of models) {
      const modelId = model.name.replace('models/', '');
      const displayName = model.displayName || modelId;
      const description = model.description || '';
      const supportedMethods = model.supportedGenerationMethods || [];

      // Check if model supports text generation (generateContent)
      if (supportedMethods.includes('generateContent')) {
        // Skip embedding models and other non-chat models
        if (!modelId.includes('embedding') && !modelId.includes('aqa') && !modelId.includes('imagen')) {
          textModels.push({
            id: modelId,
            name: displayName,
            description: description.substring(0, 60) + (description.length > 60 ? '...' : ''),
            inputTokenLimit: model.inputTokenLimit,
            outputTokenLimit: model.outputTokenLimit,
          });
        }
      }

      // Check if model supports live/bidirectional streaming (bidiGenerateContent)
      if (supportedMethods.includes('bidiGenerateContent')) {
        liveModels.push({
          id: modelId,
          name: displayName,
          description: description.substring(0, 60) + (description.length > 60 ? '...' : ''),
        });
      }
    }

    // Sort models - newer versions first
    const sortModels = (a, b) => {
      // Prioritize 2.5 > 2.0 > 1.5
      const getVersion = (id) => {
        if (id.includes('2.5')) return 3;
        if (id.includes('2.0')) return 2;
        if (id.includes('1.5')) return 1;
        return 0;
      };
      const versionDiff = getVersion(b.id) - getVersion(a.id);
      if (versionDiff !== 0) return versionDiff;

      // Then prioritize flash > pro > others
      const getType = (id) => {
        if (id.includes('flash') && !id.includes('lite')) return 2;
        if (id.includes('pro')) return 1;
        return 0;
      };
      return getType(b.id) - getType(a.id);
    };

    textModels.sort(sortModels);
    liveModels.sort(sortModels);

    // Always merge known working voice models with API-discovered ones
    // The native audio models may not appear in the standard API list
    const mergedLiveModels = [...LIVE_MODELS_FALLBACK]; // Start with known working models

    // Add any API-discovered live models that aren't already in our list
    for (const model of liveModels) {
      if (!LIVE_MODELS_FALLBACK.some(fm => fm.id === model.id)) {
        mergedLiveModels.push(model);
      }
    }

    // Cache results
    cachedTextModels = textModels.length > 0 ? textModels : TEXT_MODELS;
    cachedLiveModels = mergedLiveModels;
    modelsCacheTime = now;

    console.log(`Fetched ${textModels.length} text models and ${mergedLiveModels.length} live models (including ${LIVE_MODELS_FALLBACK.length} known models)`);

    return {
      textModels: cachedTextModels,
      liveModels: cachedLiveModels
    };
  } catch (error) {
    console.error('Failed to fetch models:', error);
    return { textModels: TEXT_MODELS, liveModels: LIVE_MODELS_FALLBACK };
  }
};

/**
 * Clear the models cache to force a refresh
 */
export const clearModelsCache = () => {
  cachedTextModels = null;
  cachedLiveModels = null;
  modelsCacheTime = 0;
};

// Available Gemini models (verified as of 2025)
export const AVAILABLE_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Default - Fast)' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Balanced)' },
  { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Cost-Efficient)' },
  { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview (Most Powerful)' },
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (Fast Preview)' },
];

// Default model
export const DEFAULT_MODEL = 'gemini-2.5-flash';

// Rate limiting (simple in-memory, consider Redis for production)
let requestCount = 0;
let resetTime = Date.now();
let MAX_REQUESTS_PER_MINUTE = 15;

const checkRateLimit = () => {
  const now = Date.now();
  if (now - resetTime > 60000) {
    requestCount = 0;
    resetTime = now;
  }
  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    throw new Error('Rate limit exceeded. Please wait a moment before sending another message.');
  }
  requestCount++;
};

// System prompt for the AI (basic - used when tools are not available)
const BASIC_SYSTEM_PROMPT = `You are a helpful AI coach for Window Depot Milwaukee's goal tracking app.
Your role is to:
- Provide motivation and coaching to help users reach their daily goals
- Answer questions about the app features, goals, and performance
- Help users understand their progress and suggest improvements
- Be encouraging, professional, and supportive

Available goal categories: reviews, demos, callbacks
Users can track their daily progress toward goals and see weekly leaderboards.

Be concise but helpful. Use emojis sparingly. Focus on actionable advice.`;

// Enhanced system prompt for function calling mode
const getEnhancedSystemPrompt = (userRole) => {
  const basePrompt = `You are an intelligent AI coach and assistant for Window Depot Milwaukee's goal tracking app.
You have FULL ACCESS to the user's data and can perform actions on their behalf.

YOUR CAPABILITIES:
${userRole === 'manager' ? `
AS A MANAGER, you can:
- Query ANY user's stats, appointments, and performance data
- Generate team reports and compare users
- Identify top performers and those needing support
- Create challenges, rewards, and team announcements
- Update any user's goals and award bonus XP
- Archive users and manage team settings
` : ''}
AS ${userRole === 'manager' ? 'ALSO FOR YOUR OWN DATA' : 'AN EMPLOYEE'}, you can:
- Query your activity history (reviews, demos, callbacks) for any date range
- View and analyze your appointments (including times, customers, products)
- Check your achievements, XP, level, and streak information
- Analyze your performance patterns (best days, typical times, trends)
- View your leaderboard position and compare with teammates
- Log new activities and create appointments
- Post to the team feed
- Update your daily goals

IMPORTANT GUIDELINES:
1. ALWAYS use your tools to fetch real data before answering questions about stats or performance
2. When asked about historical data, patterns, or analytics - USE YOUR TOOLS
3. For actions like logging activities or creating appointments - CONFIRM BEFORE EXECUTING
4. Provide specific numbers and insights from the data you retrieve
5. Be concise but informative - summarize data clearly
6. If a tool returns an error, explain what went wrong in simple terms

EXAMPLE TOOL USAGE:
- "How many demos this week?" → Call getMyStats with this week's date range
- "What time do I usually schedule appointments?" → Call analyzeMyPatterns
- "Log 3 callbacks" → Call logActivity with category='callbacks', count=3
- "Compare John and Sarah" (manager) → Call compareUsers

Today's date is ${new Date().toISOString().split('T')[0]}.
Be helpful, accurate, and proactive in using your tools to provide real insights.`;

  return basePrompt;
};

/**
 * Configure the AI module with custom settings
 * @param {Object} settings - Configuration object
 * @param {string} settings.apiKey - Gemini API key
 * @param {string} settings.model - Model ID to use
 * @param {number} settings.rateLimit - Max requests per minute
 */
export const configureAI = (settings = {}) => {
  if (settings.apiKey !== undefined) {
    API_KEY = settings.apiKey;
    genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
  }

  if (settings.model) {
    currentModel = settings.model;
  }

  if (settings.rateLimit !== undefined && settings.rateLimit > 0) {
    MAX_REQUESTS_PER_MINUTE = settings.rateLimit;
  }

  return {
    isConfigured: isAIConfigured(),
    model: currentModel,
    rateLimit: MAX_REQUESTS_PER_MINUTE,
  };
};

/**
 * Get current AI configuration
 */
export const getAIConfig = () => ({
  apiKey: API_KEY ? '********' + API_KEY.slice(-4) : '',
  hasApiKey: !!API_KEY,
  model: currentModel,
  rateLimit: MAX_REQUESTS_PER_MINUTE,
  isConfigured: isAIConfigured(),
});

/**
 * Get the raw API key (use carefully)
 */
export const getAPIKey = () => API_KEY;

// Check if AI is configured
export const isAIConfigured = () => {
  return !!API_KEY && !!genAI;
};

// Get AI response with context (basic mode - no function calling)
export const getAIResponse = async (message, context = {}, modelName = DEFAULT_MODEL) => {
  if (!isAIConfigured()) {
    throw new Error('AI is not configured. Please add your Gemini API key in Settings.');
  }

  checkRateLimit();

  try {
    // Use provided modelName if valid, otherwise use currentModel
    // This supports both per-request model selection and global model configuration
    const modelToUse = modelName && modelName !== DEFAULT_MODEL ? modelName : currentModel;
    const model = genAI.getGenerativeModel({ model: modelToUse });
    // Build context string
    let contextString = '';
    if (context.currentUser) {
      contextString += `\nCurrent User: ${context.currentUser.name} (${context.currentUser.role})\n`;
    }
    if (context.todayStats) {
      contextString += `Today's Stats: Reviews: ${context.todayStats.reviews || 0}, Demos: ${context.todayStats.demos || 0}, Callbacks: ${context.todayStats.callbacks || 0}\n`;
    }
    if (context.weekStats) {
      contextString += `This Week: Reviews: ${context.weekStats.reviews || 0}, Demos: ${context.weekStats.demos || 0}, Callbacks: ${context.weekStats.callbacks || 0}\n`;
    }
    if (context.userGoals) {
      contextString += `Goals: Reviews: ${context.userGoals.reviews}, Demos: ${context.userGoals.demos}, Callbacks: ${context.userGoals.callbacks}\n`;
    }

    const prompt = `${BASIC_SYSTEM_PROMPT}${contextString}\n\nUser: ${message}\n\nAI:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error('AI request failed:', error);
    throw handleAIError(error);
  }
};

/**
 * Handle common AI errors and return user-friendly error messages
 */
const handleAIError = (error) => {
  if (error.message?.includes('Rate limit') || error.message?.includes('rate_limit')) {
    return error;
  }

  if (error.message?.includes('API key') || error.message?.includes('INVALID_ARGUMENT')) {
    return new Error('Invalid API key. Please check your API key in Settings.');
  }

  if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
    return new Error('API quota exceeded. Please try again later or contact support.');
  }

  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return new Error('Network error. Please check your internet connection and try again.');
  }

  if (error.message?.includes('model not found') || error.message?.includes('NOT_FOUND')) {
    return new Error(`Model "${currentModel}" is not available. Try a different model in Settings.`);
  }

  // Generic fallback with original error context
  return new Error(`Failed to get AI response: ${error.message || 'Unknown error'}`);
};

/**
 * Get AI response with function calling support
 * This is the enhanced version that can query data and perform actions
 *
 * @param {string} message - User's message
 * @param {Object} context - Context object with currentUser, refreshData callback, etc.
 * @param {string} modelName - Model to use
 * @param {Function} onToolCall - Optional callback when a tool is called (for UI feedback)
 * @returns {Promise<{text: string, toolCalls: Array}>} Response with text and any tool calls made
 */
export const getAIResponseWithTools = async (message, context = {}, modelName = DEFAULT_MODEL, onToolCall = null) => {
  if (!isAIConfigured()) {
    throw new Error('AI is not configured. Please add your Gemini API key in Settings.');
  }

  checkRateLimit();

  const { currentUser } = context;
  if (!currentUser) {
    throw new Error('User context is required for AI tools.');
  }

  const userRole = currentUser.role || 'employee';
  const tools = getToolsForRole(userRole);
  const functionDeclarations = toGeminiFunctionDeclarations(tools);

  try {
    const modelToUse = modelName && modelName !== DEFAULT_MODEL ? modelName : currentModel;

    // Create model with tools
    const model = genAI.getGenerativeModel({
      model: modelToUse,
      tools: [{ functionDeclarations }],
      systemInstruction: getEnhancedSystemPrompt(userRole),
    });

    // Start a chat session for multi-turn conversation with tools
    const chat = model.startChat({
      history: [],
    });

    // Build initial context message
    let contextInfo = `[Context: User "${currentUser.name}" (${userRole})`;
    if (context.todayStats) {
      contextInfo += `, Today: ${context.todayStats.reviews || 0} reviews, ${context.todayStats.demos || 0} demos, ${context.todayStats.callbacks || 0} callbacks`;
    }
    contextInfo += ']';

    const fullMessage = `${contextInfo}\n\nUser: ${message}`;

    // Send message and handle potential function calls
    let result = await chat.sendMessage(fullMessage);
    let response = result.response;

    const toolCallsMade = [];
    let maxIterations = 5; // Prevent infinite loops
    let iteration = 0;

    // Loop to handle function calls
    while (iteration < maxIterations) {
      iteration++;

      // Check if the model wants to call a function
      const functionCalls = response.functionCalls();

      if (!functionCalls || functionCalls.length === 0) {
        // No more function calls, we're done
        break;
      }

      // Execute all function calls
      const functionResponses = [];

      for (const functionCall of functionCalls) {
        const { name, args } = functionCall;

        // Notify UI if callback provided
        if (onToolCall) {
          onToolCall({ name, args, status: 'executing' });
        }

        console.log(`AI calling tool: ${name}`, args);

        // Execute the tool
        const toolResult = await executeTool(name, args || {}, context);

        toolCallsMade.push({
          name,
          args,
          result: toolResult,
        });

        // Notify UI of completion
        if (onToolCall) {
          onToolCall({ name, args, status: 'completed', result: toolResult });
        }

        functionResponses.push({
          functionResponse: {
            name,
            response: toolResult,
          },
        });
      }

      // Send function results back to the model
      result = await chat.sendMessage(functionResponses);
      response = result.response;
    }

    // Extract the final text response
    const text = response.text();

    return {
      text,
      toolCalls: toolCallsMade,
    };
  } catch (error) {
    console.error('AI request with tools failed:', error);
    throw handleAIError(error);
  }
};

/**
 * Build system instruction for voice chat with tool awareness
 */
export const getVoiceChatSystemInstruction = (currentUser, todayStats) => {
  const userRole = currentUser?.role || 'employee';

  return `You are a helpful AI voice coach for Window Depot Milwaukee's goal tracking app.
The current user is ${currentUser?.name || 'User'} (${userRole}).
Today's stats: Reviews: ${todayStats?.reviews || 0}, Demos: ${todayStats?.demos || 0}, Callbacks: ${todayStats?.callbacks || 0}.
Goals: Reviews: ${currentUser?.goals?.reviews || 0}, Demos: ${currentUser?.goals?.demos || 0}, Callbacks: ${currentUser?.goals?.callbacks || 0}.

You have access to tools that can query detailed data and perform actions. When the user asks about:
- Historical stats, patterns, or analysis - use your data query tools
- Logging activities, appointments, or posts - use your action tools
- Team data or reports (managers only) - use your management tools

Your role is to:
- Provide motivation and coaching through natural conversation
- Answer questions by fetching real data
- Help with role-playing exercises for sales calls and customer interactions
- Log activities and appointments when requested
- Give specific, data-driven feedback

Keep responses conversational and concise for voice interaction.
Today's date is ${new Date().toISOString().split('T')[0]}.`;
};

// Get remaining requests in current minute
export const getRemainingRequests = () => {
  const now = Date.now();
  if (now - resetTime > 60000) {
    return MAX_REQUESTS_PER_MINUTE;
  }
  return Math.max(0, MAX_REQUESTS_PER_MINUTE - requestCount);
};

/**
 * Validate an API key by making a test request
 * @param {string} apiKey - The API key to validate
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export const validateAPIKey = async (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
    return { valid: false, error: 'Invalid API key format' };
  }

  try {
    const testGenAI = new GoogleGenerativeAI(apiKey.trim());
    const model = testGenAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Make a minimal test request
    const result = await model.generateContent('Say "OK"');
    const response = await result.response;
    const text = response.text();

    if (text) {
      return { valid: true };
    }

    return { valid: false, error: 'No response received' };
  } catch (error) {
    console.error('API key validation failed:', error);

    if (error.message?.includes('API key') || error.message?.includes('INVALID_ARGUMENT')) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      return { valid: false, error: 'API quota exceeded' };
    }

    return { valid: false, error: error.message || 'Validation failed' };
  }
};

const aiModule = {
  getAIResponse,
  getAIResponseWithTools,
  getVoiceChatSystemInstruction,
  isAIConfigured,
  getRemainingRequests,
  configureAI,
  getAIConfig,
  getAPIKey,
  validateAPIKey,
  fetchAvailableModels,
  clearModelsCache,
  TEXT_MODELS,
  LIVE_MODELS_FALLBACK,
};

export default aiModule;
