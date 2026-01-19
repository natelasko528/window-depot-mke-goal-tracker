/**
 * Google OAuth Integration
 * Approval layer for connector connections using Google authentication
 */

import storage from '../storage';
import { generateState, generateCodeVerifier, generateCodeChallenge } from './connectors/oauth-manager';

/**
 * Google OAuth2 Configuration
 */
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = `${window.location.origin}/auth/google/callback`;
const GOOGLE_SCOPES = ['openid', 'profile', 'email'];

/**
 * Google OAuth Manager
 */
export class GoogleAuthManager {
  constructor() {
    this.clientId = GOOGLE_CLIENT_ID;
    this.redirectUri = GOOGLE_REDIRECT_URI;
  }

  /**
   * Check if Google OAuth is configured
   */
  isConfigured() {
    return !!this.clientId;
  }

  /**
   * Generate Google OAuth authorization URL
   * @param {string} targetConnectorId - Connector ID to connect after Google auth
   * @param {string[]} additionalScopes - Additional scopes if needed
   * @returns {Promise<{url: string, state: string}>}
   */
  async generateAuthUrl(targetConnectorId = null, additionalScopes = []) {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth is not configured. Please set REACT_APP_GOOGLE_CLIENT_ID');
    }

    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store state and context
    await storage.set(`google_oauth_state_${state}`, {
      targetConnectorId,
      codeVerifier,
      timestamp: Date.now(),
    });

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: [...GOOGLE_SCOPES, ...additionalScopes].join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline',
      prompt: 'consent', // Force consent screen to get refresh token
    });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return { url, state };
  }

  /**
   * Handle Google OAuth callback
   * @param {string} callbackUrl - Full callback URL
   * @returns {Promise<{code: string, state: string, userInfo?: object}>}
   */
  async handleCallback(callbackUrl) {
    const url = new URL(callbackUrl);
    const params = new URLSearchParams(url.search);

    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      throw new Error(`Google OAuth error: ${error}`);
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    // Verify state
    const storedState = await storage.get(`google_oauth_state_${state}`);
    if (!storedState) {
      throw new Error('Invalid state parameter');
    }

    // Check state expiration (10 minutes)
    if (Date.now() - storedState.timestamp > 10 * 60 * 1000) {
      await storage.remove(`google_oauth_state_${state}`);
      throw new Error('State parameter expired');
    }

    // Exchange code for tokens via Edge Function
    const { data, error: exchangeError } = await this.exchangeCode(code, state, storedState.codeVerifier);

    if (exchangeError) {
      throw new Error(`Failed to exchange code: ${exchangeError.message}`);
    }

    // Store Google tokens
    await this.storeTokens(data);

    // Get user info
    const userInfo = await this.getUserInfo(data.access_token);

    // Clean up
    await storage.remove(`google_oauth_state_${state}`);

    return {
      code,
      state,
      tokens: data,
      userInfo,
      targetConnectorId: storedState.targetConnectorId,
    };
  }

  /**
   * Exchange authorization code for tokens via Edge Function
   * @param {string} code - Authorization code
   * @param {string} state - State parameter
   * @param {string} codeVerifier - PKCE code verifier
   * @returns {Promise<{data: object, error: Error|null}>}
   */
  async exchangeCode(code, state, codeVerifier) {
    const { supabase } = await import('./supabase');
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';

    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/google-oauth-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          state,
          code_verifier: codeVerifier,
          redirect_uri: this.redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          data: null,
          error: new Error(error.message || `Exchange failed: ${response.status}`),
        };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get user info from Google
   * @param {string} accessToken - Google access token
   * @returns {Promise<object>} User info
   */
  async getUserInfo(accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Store Google tokens
   * @param {object} tokens - Token response
   * @returns {Promise<void>}
   */
  async storeTokens(tokens) {
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null,
      id_token: tokens.id_token,
    };

    await storage.set('google_oauth_tokens', tokenData);
    await storage.set('google_oauth_user', {
      email: tokens.email || null,
      name: tokens.name || null,
      picture: tokens.picture || null,
      expires_at: tokenData.expires_at,
    });
  }

  /**
   * Get stored Google tokens
   * @returns {Promise<object|null>} Tokens or null
   */
  async getTokens() {
    return await storage.get('google_oauth_tokens');
  }

  /**
   * Get stored Google user info
   * @returns {Promise<object|null>} User info or null
   */
  async getUser() {
    return await storage.get('google_oauth_user');
  }

  /**
   * Check if user is authenticated
   * @returns {Promise<boolean>}
   */
  async isAuthenticated() {
    const tokens = await this.getTokens();
    if (!tokens || !tokens.access_token) {
      return false;
    }

    // Check if token is expired
    if (tokens.expires_at && Date.now() >= tokens.expires_at) {
      // Try to refresh
      try {
        await this.refreshToken();
        return true;
      } catch (error) {
        return false;
      }
    }

    return true;
  }

  /**
   * Refresh Google access token
   * @returns {Promise<object>} New tokens
   */
  async refreshToken() {
    const tokens = await this.getTokens();
    if (!tokens || !tokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    const { supabase } = await import('./supabase');
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';

    const response = await fetch(`${supabaseUrl}/functions/v1/google-oauth-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: tokens.refresh_token,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status}`);
    }

    const data = await response.json();
    await this.storeTokens(data);
    return data;
  }

  /**
   * Sign out (clear stored tokens)
   */
  async signOut() {
    await storage.remove('google_oauth_tokens');
    await storage.remove('google_oauth_user');
  }
}

// Singleton instance
let googleAuthInstance = null;

/**
 * Get Google Auth manager instance
 * @returns {GoogleAuthManager}
 */
export function getGoogleAuthManager() {
  if (!googleAuthInstance) {
    googleAuthInstance = new GoogleAuthManager();
  }
  return googleAuthInstance;
}

/**
 * Convenience functions
 */
export async function signInWithGoogle(targetConnectorId = null) {
  const manager = getGoogleAuthManager();
  const { url } = await manager.generateAuthUrl(targetConnectorId);
  window.location.href = url;
}

export async function handleGoogleCallback(callbackUrl) {
  const manager = getGoogleAuthManager();
  return await manager.handleCallback(callbackUrl);
}

export async function isGoogleAuthenticated() {
  const manager = getGoogleAuthManager();
  return await manager.isAuthenticated();
}

export async function getGoogleUser() {
  const manager = getGoogleAuthManager();
  return await manager.getUser();
}

export async function signOutGoogle() {
  const manager = getGoogleAuthManager();
  return await manager.signOut();
}
