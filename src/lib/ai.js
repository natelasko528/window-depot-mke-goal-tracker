import { GoogleGenerativeAI } from '@google/generative-ai';

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

// Fallback live models
export const LIVE_MODELS_FALLBACK = [
  { id: 'gemini-2.0-flash-live-001', name: 'Gemini 2.0 Flash Live', description: 'Real-time voice' },
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

    // Cache results
    cachedTextModels = textModels.length > 0 ? textModels : TEXT_MODELS;
    cachedLiveModels = liveModels.length > 0 ? liveModels : LIVE_MODELS_FALLBACK;
    modelsCacheTime = now;

    console.log(`Fetched ${textModels.length} text models and ${liveModels.length} live models`);

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

// System prompt for the AI
const SYSTEM_PROMPT = `You are a helpful AI coach for Window Depot Milwaukee's goal tracking app.
Your role is to:
- Provide motivation and coaching to help users reach their daily goals
- Answer questions about the app features, goals, and performance
- Help users understand their progress and suggest improvements
- Be encouraging, professional, and supportive

Available goal categories: reviews, demos, callbacks
Users can track their daily progress toward goals and see weekly leaderboards.

Be concise but helpful. Use emojis sparingly. Focus on actionable advice.`;

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

// Get AI response with context
export const getAIResponse = async (message, context = {}) => {
  if (!isAIConfigured()) {
    throw new Error('AI is not configured. Please add your Gemini API key in Settings.');
  }

  checkRateLimit();

  try {
    // Using the configured model
    const model = genAI.getGenerativeModel({ model: currentModel });

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

    const prompt = `${SYSTEM_PROMPT}${contextString}\n\nUser: ${message}\n\nAI:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return text;
  } catch (error) {
    console.error('AI request failed:', error);

    // Provide specific error messages for common failure scenarios
    if (error.message?.includes('Rate limit') || error.message?.includes('rate_limit')) {
      throw error;
    }

    if (error.message?.includes('API key') || error.message?.includes('INVALID_ARGUMENT')) {
      throw new Error('Invalid API key. Please check your API key in Settings.');
    }

    if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('API quota exceeded. Please try again later or contact support.');
    }

    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }

    if (error.message?.includes('model not found') || error.message?.includes('NOT_FOUND')) {
      throw new Error(`Model "${currentModel}" is not available. Try a different model in Settings.`);
    }

    // Generic fallback with original error context
    throw new Error(`Failed to get AI response: ${error.message || 'Unknown error'}`);
  }
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
