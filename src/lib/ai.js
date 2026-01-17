import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// Rate limiting (simple in-memory, consider Redis for production)
let requestCount = 0;
let resetTime = Date.now();
const MAX_REQUESTS_PER_MINUTE = 15;

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

// Check if AI is configured
export const isAIConfigured = () => {
  return !!API_KEY && !!genAI;
};

// Get AI response with context
export const getAIResponse = async (message, context = {}) => {
  if (!isAIConfigured()) {
    throw new Error('AI is not configured. Please add REACT_APP_GEMINI_API_KEY to your environment variables.');
  }

  checkRateLimit();

  try {
    // Using gemini-2.5-flash for better stability and future compatibility
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
      throw new Error('Invalid API key. Please check your REACT_APP_GEMINI_API_KEY configuration.');
    }

    if (error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('API quota exceeded. Please try again later or contact support.');
    }

    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }

    if (error.message?.includes('model not found') || error.message?.includes('NOT_FOUND')) {
      throw new Error('AI model unavailable. Please contact support.');
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
