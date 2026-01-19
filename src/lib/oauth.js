/**
 * OAuth 2.0 utilities for Zoom and GoHighLevel integrations
 * Handles PKCE flow, authorization URLs, and token exchange
 */

import { encryptApiKey, decryptApiKey } from './encryption';
import storage from '../storage';

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
 * Generate Zoom OAuth authorization URL with PKCE
 * @param {string} clientId - Zoom OAuth client ID
 * @param {string} redirectUri - Redirect URI
 * @param {string} state - State parameter for CSRF protection
 * @param {string[]} scopes - OAuth scopes
 * @returns {Promise<{url: string, codeVerifier: string}>} Authorization URL and code verifier
 */
export async function generateZoomAuthUrl(clientId, redirectUri, state, scopes = ['meeting:write', 'meeting:read', 'user:read']) {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Store code verifier in session storage for later use
  await storage.set(`oauth_zoom_code_verifier_${state}`, codeVerifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    scope: scopes.join(' '),
  });

  const url = `https://zoom.us/oauth/authorize?${params.toString()}`;
  return { url, codeVerifier };
}

/**
 * Exchange Zoom authorization code for tokens
 * @param {string} code - Authorization code
 * @param {string} redirectUri - Redirect URI (must match authorization request)
 * @param {string} codeVerifier - Code verifier from PKCE flow
 * @param {string} clientId - Zoom OAuth client ID
 * @param {string} clientSecret - Zoom OAuth client secret
 * @returns {Promise<{access_token: string, refresh_token: string, expires_in: number}>} Token response
 */
export async function exchangeZoomCode(code, redirectUri, codeVerifier, clientId, clientSecret) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || error.error || `Token exchange failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * Refresh Zoom access token
 * @param {string} refreshToken - Refresh token
 * @param {string} clientId - Zoom OAuth client ID
 * @param {string} clientSecret - Zoom OAuth client secret
 * @returns {Promise<{access_token: string, refresh_token: string, expires_in: number}>} Token response
 */
export async function refreshZoomToken(refreshToken, clientId, clientSecret) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || error.error || `Token refresh failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * Generate GoHighLevel OAuth authorization URL
 * @param {string} clientId - GoHighLevel OAuth client ID
 * @param {string} redirectUri - Redirect URI
 * @param {string} state - State parameter for CSRF protection
 * @param {string[]} scopes - OAuth scopes
 * @returns {{url: string}} Authorization URL
 */
export function generateGoHighLevelAuthUrl(clientId, redirectUri, state, scopes = ['contacts.readonly', 'contacts.write', 'opportunities.readonly', 'opportunities.write']) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: scopes.join(' '),
  });

  const url = `https://marketplace.gohighlevel.com/oauth/chooselocation?${params.toString()}`;
  return { url };
}

/**
 * Exchange GoHighLevel authorization code for tokens
 * @param {string} code - Authorization code
 * @param {string} redirectUri - Redirect URI (must match authorization request)
 * @param {string} clientId - GoHighLevel OAuth client ID
 * @param {string} clientSecret - GoHighLevel OAuth client secret
 * @returns {Promise<{access_token: string, refresh_token: string, expires_in: number, locationId: string}>} Token response
 */
export async function exchangeGoHighLevelCode(code, redirectUri, clientId, clientSecret) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || error.error || `Token exchange failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    locationId: data.locationId || data.location_id, // GoHighLevel returns locationId in response
  };
}

/**
 * Refresh GoHighLevel access token
 * @param {string} refreshToken - Refresh token
 * @param {string} clientId - GoHighLevel OAuth client ID
 * @param {string} clientSecret - GoHighLevel OAuth client secret
 * @returns {Promise<{access_token: string, refresh_token: string, expires_in: number}>} Token response
 */
export async function refreshGoHighLevelToken(refreshToken, clientId, clientSecret) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error_description || error.error || `Token refresh failed: ${response.status}`);
  }

  return await response.json();
}

/**
 * Get stored code verifier for state
 * @param {string} state - State parameter
 * @returns {Promise<string|null>} Code verifier or null
 */
export async function getStoredCodeVerifier(state) {
  try {
    return await storage.get(`oauth_zoom_code_verifier_${state}`);
  } catch (error) {
    return null;
  }
}

/**
 * Clear stored code verifier
 * @param {string} state - State parameter
 */
export async function clearStoredCodeVerifier(state) {
  try {
    await storage.remove(`oauth_zoom_code_verifier_${state}`);
  } catch (error) {
    console.error('Error clearing code verifier:', error);
  }
}
