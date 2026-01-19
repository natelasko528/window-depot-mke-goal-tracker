/**
 * Universal OAuth2 Flow Manager
 * Provider-agnostic OAuth2 implementation with PKCE support
 */

import { encryptApiKey, decryptApiKey } from '../encryption';
import storage from '../../storage';
import { getConnectorById } from './registry';

/**
 * Generate random string for PKCE
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
function generateRandomString(length = 43) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate code verifier for PKCE
 * @returns {string} Code verifier
 */
export function generateCodeVerifier() {
  return generateRandomString(128);
}

/**
 * Generate code challenge from verifier
 * @param {string} verifier - Code verifier
 * @returns {Promise<string>} Code challenge (base64url encoded SHA256 hash)
 */
export async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode.apply(null, new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generate state parameter for CSRF protection
 * @returns {string} Random state string
 */
export function generateState() {
  return generateRandomString(32);
}

/**
 * Universal OAuth2 Manager
 */
export class OAuth2Manager {
  constructor(userId) {
    this.userId = userId;
  }

  /**
   * Generate OAuth2 authorization URL
   * @param {string} connectorId - Connector ID from registry
   * @param {string} redirectUri - Redirect URI
   * @param {object} options - Additional options
   * @returns {Promise<{url: string, state: string, codeVerifier?: string}>}
   */
  async generateAuthUrl(connectorId, redirectUri, options = {}) {
    const connector = await getConnectorById(connectorId);
    if (!connector) {
      throw new Error(`Connector not found: ${connectorId}`);
    }

    if (connector.connection_type !== 'oauth2') {
      throw new Error(`Connector ${connectorId} does not support OAuth2`);
    }

    const {
      clientId,
      scopes = connector.required_scopes || [],
      state = generateState(),
      usePKCE = connector.oauth_endpoints?.supports_pkce !== false,
      extraParams = {},
    } = options;

    if (!clientId) {
      throw new Error('clientId is required');
    }

    const oauthEndpoints = connector.oauth_endpoints || {};
    const authUrl = oauthEndpoints.authorization_url;

    if (!authUrl) {
      throw new Error(`Connector ${connectorId} missing authorization_url`);
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: Array.isArray(scopes) ? scopes.join(' ') : scopes,
      ...extraParams,
    });

    let codeVerifier = null;

    // Add PKCE if supported
    if (usePKCE) {
      codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      params.append('code_challenge', codeChallenge);
      params.append('code_challenge_method', 'S256');

      // Store code verifier for later use
      await storage.set(`oauth_${connectorId}_code_verifier_${state}`, codeVerifier);
    }

    // Store state for validation
    await storage.set(`oauth_${connectorId}_state_${state}`, {
      connectorId,
      redirectUri,
      clientId,
      scopes,
      timestamp: Date.now(),
    });

    const url = `${authUrl}?${params.toString()}`;
    return { url, state, codeVerifier };
  }

  /**
   * Exchange authorization code for tokens
   * @param {string} connectorId - Connector ID
   * @param {string} code - Authorization code
   * @param {string} state - State parameter
   * @param {object} credentials - OAuth credentials (clientId, clientSecret)
   * @returns {Promise<object>} Token response
   */
  async exchangeCode(connectorId, code, state, credentials) {
    const { clientId, clientSecret } = credentials;
    if (!clientId || !clientSecret) {
      throw new Error('clientId and clientSecret are required');
    }

    // Verify state
    const storedState = await storage.get(`oauth_${connectorId}_state_${state}`);
    if (!storedState) {
      throw new Error('Invalid state parameter');
    }

    // Check state expiration (5 minutes)
    if (Date.now() - storedState.timestamp > 5 * 60 * 1000) {
      await storage.remove(`oauth_${connectorId}_state_${state}`);
      throw new Error('State parameter expired');
    }

    const connector = await getConnectorById(connectorId);
    if (!connector) {
      throw new Error(`Connector not found: ${connectorId}`);
    }

    const oauthEndpoints = connector.oauth_endpoints || {};
    const tokenUrl = oauthEndpoints.token_url;

    if (!tokenUrl) {
      throw new Error(`Connector ${connectorId} missing token_url`);
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: storedState.redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    // Add PKCE if code verifier exists
    const codeVerifier = await storage.get(`oauth_${connectorId}_code_verifier_${state}`);
    if (codeVerifier) {
      params.append('code_verifier', codeVerifier);
      // Clean up code verifier
      await storage.remove(`oauth_${connectorId}_code_verifier_${state}`);
    }

    // Clean up state
    await storage.remove(`oauth_${connectorId}_state_${state}`);

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // Some providers use Basic Auth instead of params
    const useBasicAuth = oauthEndpoints.use_basic_auth === true;
    if (useBasicAuth) {
      headers['Authorization'] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
      params.delete('client_id');
      params.delete('client_secret');
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error_description || error.error || `Token exchange failed: ${response.status}`
      );
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type || 'Bearer',
      scope: data.scope,
      // Provider-specific fields
      locationId: data.locationId || data.location_id,
      expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
    };
  }

  /**
   * Refresh access token
   * @param {string} connectorId - Connector ID
   * @param {string} refreshToken - Refresh token
   * @param {object} credentials - OAuth credentials
   * @returns {Promise<object>} New token response
   */
  async refreshToken(connectorId, refreshToken, credentials) {
    const { clientId, clientSecret } = credentials;
    if (!clientId || !clientSecret) {
      throw new Error('clientId and clientSecret are required');
    }

    const connector = await getConnectorById(connectorId);
    if (!connector) {
      throw new Error(`Connector not found: ${connectorId}`);
    }

    const oauthEndpoints = connector.oauth_endpoints || {};
    const tokenUrl = oauthEndpoints.token_url;

    if (!tokenUrl) {
      throw new Error(`Connector ${connectorId} missing token_url`);
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    // Some providers use Basic Auth
    const useBasicAuth = oauthEndpoints.use_basic_auth === true;
    if (useBasicAuth) {
      headers['Authorization'] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
      params.delete('client_id');
      params.delete('client_secret');
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        error.error_description || error.error || `Token refresh failed: ${response.status}`
      );
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken, // Keep old refresh token if not provided
      expires_in: data.expires_in,
      token_type: data.token_type || 'Bearer',
      expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : null,
    };
  }

  /**
   * Store tokens securely
   * @param {string} connectorId - Connector ID
   * @param {object} tokens - Token response
   * @returns {Promise<void>}
   */
  async storeTokens(connectorId, tokens) {
    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope,
      // Provider-specific
      locationId: tokens.locationId,
    };

    // Encrypt tokens
    const encrypted = await encryptApiKey(JSON.stringify(tokenData), this.userId);

    // Store in Supabase
    const { supabase } = await import('../supabase');
    const { error } = await supabase
      .from('integration_sync_status')
      .upsert(
        {
          user_id: this.userId,
          integration_type: connectorId,
          oauth_tokens: encrypted,
          status: 'connected',
          updated_at: new Date().toISOString(),
          connection_metadata: {
            locationId: tokens.locationId,
            token_type: tokenData.token_type,
            expires_at: tokenData.expires_at,
          },
        },
        { onConflict: 'user_id,integration_type' }
      );

    if (error) {
      throw new Error(`Failed to store tokens: ${error.message}`);
    }
  }

  /**
   * Get stored tokens
   * @param {string} connectorId - Connector ID
   * @returns {Promise<object|null>} Decrypted tokens or null
   */
  async getTokens(connectorId) {
    const { supabase } = await import('../supabase');
    const { data, error } = await supabase
      .from('integration_sync_status')
      .select('oauth_tokens')
      .eq('user_id', this.userId)
      .eq('integration_type', connectorId)
      .single();

    if (error || !data || !data.oauth_tokens) {
      return null;
    }

    try {
      const decrypted = await decryptApiKey(data.oauth_tokens, this.userId);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt tokens:', error);
      return null;
    }
  }

  /**
   * Check if token is expired or about to expire
   * @param {object} tokens - Token object with expires_at
   * @param {number} bufferSeconds - Buffer time in seconds before expiry
   * @returns {boolean} True if expired or expiring soon
   */
  isTokenExpired(tokens, bufferSeconds = 60) {
    if (!tokens || !tokens.expires_at) {
      return false; // Assume valid if no expiry info
    }
    return Date.now() >= tokens.expires_at - bufferSeconds * 1000;
  }

  /**
   * Validate callback URL and extract code/state
   * @param {string} callbackUrl - Full callback URL
   * @returns {object} Parsed callback data
   */
  parseCallback(callbackUrl) {
    const url = new URL(callbackUrl);
    const params = new URLSearchParams(url.search);

    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      throw new Error(errorDescription || error);
    }

    if (!code || !state) {
      throw new Error('Missing code or state parameter');
    }

    return { code, state };
  }
}

/**
 * Create OAuth2 manager instance
 * @param {string} userId - User ID
 * @returns {OAuth2Manager} Manager instance
 */
export function createOAuth2Manager(userId) {
  return new OAuth2Manager(userId);
}
