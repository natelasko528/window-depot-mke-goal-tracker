/**
 * Unified Connection Manager
 * Replaces app-specific connection methods with a universal interface
 */

import { encryptApiKey, decryptApiKey } from '../encryption';
import { getConnectorById } from './registry';
import { createOAuth2Manager } from './oauth-manager';
import { getGoogleAuthManager } from '../google-auth';
import { supabase } from '../supabase';
import storage from '../../storage';

/**
 * Connection Manager Class
 */
export class ConnectionManager {
  constructor(userId) {
    this.userId = userId;
    this.oauthManager = createOAuth2Manager(userId);
    this.googleAuth = getGoogleAuthManager();
  }

  /**
   * Connect to an app
   * @param {string} connectorId - Connector ID from registry
   * @param {object} options - Connection options
   * @returns {Promise<object>} Connection result
   */
  async connect(connectorId, options = {}) {
    const connector = await getConnectorById(connectorId);
    if (!connector) {
      throw new Error(`Connector not found: ${connectorId}`);
    }

    // Ensure Google auth first (for approval layer)
    const isGoogleAuth = await this.googleAuth.isAuthenticated();
    if (!isGoogleAuth) {
      throw new Error('Google authentication required. Please sign in with Google first.');
    }

    const googleUser = await this.googleAuth.getUser();

    try {
      let result;

      switch (connector.connection_type) {
        case 'oauth2':
          result = await this.connectOAuth2(connectorId, connector, options);
          break;
        case 'api_key':
          result = await this.connectApiKey(connectorId, connector, options);
          break;
        default:
          throw new Error(`Unsupported connection type: ${connector.connection_type}`);
      }

      // Store connection with Google approval metadata
      await this.updateConnectionMetadata(connectorId, {
        google_user_id: googleUser.email || googleUser.name,
        approved_at: new Date().toISOString(),
        connection_metadata: {
          google_email: googleUser.email,
          google_name: googleUser.name,
          connected_via: 'google_oauth',
        },
      });

      return result;
    } catch (error) {
      console.error(`Connection failed for ${connectorId}:`, error);
      throw error;
    }
  }

  /**
   * Connect via OAuth2
   * @param {string} connectorId - Connector ID
   * @param {object} connector - Connector definition
   * @param {object} options - OAuth options (clientId, clientSecret, redirectUri)
   * @returns {Promise<object>}
   */
  async connectOAuth2(connectorId, connector, options) {
    const { clientId, clientSecret, redirectUri, scopes } = options;

    if (!clientId || !clientSecret) {
      throw new Error('clientId and clientSecret are required for OAuth2 connections');
    }

    // Generate authorization URL
    const redirectUriFinal = redirectUri || `${window.location.origin}/auth/${connectorId}/callback`;
    const { url, state } = await this.oauthManager.generateAuthUrl(connectorId, redirectUriFinal, {
      clientId,
      scopes: scopes || connector.required_scopes,
      usePKCE: connector.oauth_endpoints?.supports_pkce !== false,
    });

    // Store connection attempt with credentials (encrypted)
    await storage.set(`connection_attempt_${connectorId}_${state}`, {
      connectorId,
      clientId,
      clientSecret: await encryptApiKey(clientSecret, this.userId),
      redirectUri: redirectUriFinal,
      timestamp: Date.now(),
    });

    // Return URL for redirect
    return {
      success: true,
      requiresRedirect: true,
      authUrl: url,
      state,
      connectorId,
    };
  }

  /**
   * Complete OAuth2 connection (after callback)
   * @param {string} connectorId - Connector ID
   * @param {string} callbackUrl - Full callback URL
   * @returns {Promise<object>}
   */
  async completeOAuth2Connection(connectorId, callbackUrl) {
    const { code, state } = this.oauthManager.parseCallback(callbackUrl);

    // Get stored connection attempt
    const attempt = await storage.get(`connection_attempt_${connectorId}_${state}`);
    if (!attempt) {
      throw new Error('Connection attempt not found or expired');
    }

    // Decrypt client secret
    const clientSecret = await decryptApiKey(attempt.clientSecret, this.userId);

    // Exchange code for tokens
    const tokens = await this.oauthManager.exchangeCode(connectorId, code, state, {
      clientId: attempt.clientId,
      clientSecret,
    });

    // Store tokens
    await this.oauthManager.storeTokens(connectorId, tokens);

    // Update connection status
    await this.updateConnectionStatus(connectorId, 'connected', null);

    // Clean up
    await storage.remove(`connection_attempt_${connectorId}_${state}`);

    return {
      success: true,
      connectorId,
      connectedAt: new Date().toISOString(),
    };
  }

  /**
   * Connect via API Key
   * @param {string} connectorId - Connector ID
   * @param {object} connector - Connector definition
   * @param {object} options - API key options
   * @returns {Promise<object>}
   */
  async connectApiKey(connectorId, connector, options) {
    const { apiKey, ...additionalData } = options;

    if (!apiKey) {
      throw new Error('API key is required');
    }

    // Test connection with the API key
    const testResult = await this.testApiKeyConnection(connectorId, connector, apiKey);

    if (!testResult.valid) {
      throw new Error(`Connection test failed: ${testResult.error}`);
    }

    // Encrypt and store API key
    const encrypted = await encryptApiKey(apiKey, this.userId);

    // Store in Supabase
    const { error } = await supabase
      .from('integration_sync_status')
      .upsert(
        {
          user_id: this.userId,
          integration_type: connectorId,
          status: 'connected',
          connection_metadata: {
            api_key_encrypted: true,
            ...additionalData,
            test_result: testResult,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,integration_type' }
      );

    if (error) {
      throw new Error(`Failed to store connection: ${error.message}`);
    }

    // Also store encrypted API key in local storage for quick access
    await storage.set(`integration_${connectorId}_${this.userId}`, {
      encryptedApiKey: encrypted,
      connectedAt: new Date().toISOString(),
      status: 'connected',
    });

    return {
      success: true,
      connectorId,
      connectedAt: new Date().toISOString(),
      testResult,
    };
  }

  /**
   * Test API key connection
   * @param {string} connectorId - Connector ID
   * @param {object} connector - Connector definition
   * @param {string} apiKey - API key to test
   * @returns {Promise<object>} Test result
   */
  async testApiKeyConnection(connectorId, connector, apiKey) {
    // Import existing clients for testing
    const { IntegrationManager } = await import('../integrations');
    const manager = new IntegrationManager(this.userId);

    try {
      switch (connectorId) {
        case 'jotform':
          const jotformClient = new (await import('../integrations')).JotformClient(apiKey, this.userId);
          return await jotformClient.testConnection();
        case 'marketsharp':
          const marketsharpClient = new (await import('../integrations')).MarketsharpClient(
            apiKey,
            this.userId,
            connector.metadata?.companyId
          );
          return await marketsharpClient.testConnection();
        default:
          // Generic test - try to make a request to the API base URL
          const testUrl = `${connector.api_base_url}/user` || `${connector.api_base_url}/me`;
          const response = await fetch(`${testUrl}?apiKey=${apiKey}`);
          return {
            valid: response.ok,
            error: response.ok ? null : `HTTP ${response.status}`,
          };
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Disconnect from an app
   * @param {string} connectorId - Connector ID
   * @returns {Promise<object>}
   */
  async disconnect(connectorId) {
    try {
      // Remove from Supabase
      const { error } = await supabase
        .from('integration_sync_status')
        .update({
          status: 'disconnected',
          oauth_tokens: null,
          connection_metadata: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', this.userId)
        .eq('integration_type', connectorId);

      if (error) {
        console.error('Failed to update Supabase:', error);
      }

      // Remove from local storage
      await storage.remove(`integration_${connectorId}_${this.userId}`);

      return { success: true, connectorId };
    } catch (error) {
      console.error(`Disconnect failed for ${connectorId}:`, error);
      throw error;
    }
  }

  /**
   * Get connection status
   * @param {string} connectorId - Connector ID
   * @returns {Promise<object>} Connection status
   */
  async getStatus(connectorId) {
    const { data, error } = await supabase
      .from('integration_sync_status')
      .select('*')
      .eq('user_id', this.userId)
      .eq('integration_type', connectorId)
      .single();

    if (error || !data) {
      return {
        connected: false,
        status: 'disconnected',
      };
    }

    // Check if OAuth tokens are expired
    if (data.oauth_tokens && data.status === 'connected') {
      try {
        const tokens = await this.oauthManager.getTokens(connectorId);
        if (tokens && this.oauthManager.isTokenExpired(tokens)) {
          // Try to refresh
          try {
            await this.refreshToken(connectorId);
          } catch (refreshError) {
            return {
              connected: true,
              status: 'error',
              error: 'Token expired and refresh failed',
              errorDetails: refreshError.message,
            };
          }
        }
      } catch (error) {
        // Ignore decryption errors, might be old format
      }
    }

    return {
      connected: data.status === 'connected',
      status: data.status,
      lastSync: data.last_sync,
      lastWebhook: data.last_webhook_received,
      error: data.error_message,
      googleUserId: data.google_user_id,
      approvedAt: data.approved_at,
      metadata: data.connection_metadata,
    };
  }

  /**
   * Refresh OAuth token
   * @param {string} connectorId - Connector ID
   * @returns {Promise<object>}
   */
  async refreshToken(connectorId) {
    const connector = await getConnectorById(connectorId);
    if (!connector || connector.connection_type !== 'oauth2') {
      throw new Error(`Connector ${connectorId} does not support OAuth2`);
    }

    const tokens = await this.oauthManager.getTokens(connectorId);
    if (!tokens || !tokens.refresh_token) {
      throw new Error('No refresh token available');
    }

    // Get credentials from connection metadata or env
    // For now, we'll need to store client credentials securely
    // This should be stored encrypted in connection_metadata
    const connection = await supabase
      .from('integration_sync_status')
      .select('connection_metadata')
      .eq('user_id', this.userId)
      .eq('integration_type', connectorId)
      .single();

    const metadata = connection.data?.connection_metadata || {};
    const clientId = metadata.client_id;
    const encryptedSecret = metadata.client_secret_encrypted;

    if (!clientId || !encryptedSecret) {
      throw new Error('OAuth credentials not found');
    }

    const clientSecret = await decryptApiKey(encryptedSecret, this.userId);

    // Refresh token
    const newTokens = await this.oauthManager.refreshToken(connectorId, tokens.refresh_token, {
      clientId,
      clientSecret,
    });

    // Store new tokens
    await this.oauthManager.storeTokens(connectorId, newTokens);

    return { success: true, tokens: newTokens };
  }

  /**
   * List all connections
   * @returns {Promise<array>} List of connections
   */
  async listConnections() {
    const { data, error } = await supabase
      .from('integration_sync_status')
      .select('*')
      .eq('user_id', this.userId)
      .in('status', ['connected', 'syncing', 'error']);

    if (error) {
      throw new Error(`Failed to list connections: ${error.message}`);
    }

    return (data || []).map(conn => ({
      connectorId: conn.integration_type,
      status: conn.status,
      lastSync: conn.last_sync,
      lastWebhook: conn.last_webhook_received,
      error: conn.error_message,
      connectedAt: conn.created_at,
      googleUserId: conn.google_user_id,
      approvedAt: conn.approved_at,
    }));
  }

  /**
   * Update connection status
   * @param {string} connectorId - Connector ID
   * @param {string} status - Status ('connected', 'error', 'syncing', 'disconnected')
   * @param {string|null} errorMessage - Error message if status is 'error'
   */
  async updateConnectionStatus(connectorId, status, errorMessage = null) {
    const { error } = await supabase
      .from('integration_sync_status')
      .update({
        status,
        error_message: errorMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', this.userId)
      .eq('integration_type', connectorId);

    if (error) {
      throw new Error(`Failed to update status: ${error.message}`);
    }
  }

  /**
   * Update connection metadata
   * @param {string} connectorId - Connector ID
   * @param {object} metadata - Metadata to merge
   */
  async updateConnectionMetadata(connectorId, metadata) {
    const { data } = await supabase
      .from('integration_sync_status')
      .select('connection_metadata')
      .eq('user_id', this.userId)
      .eq('integration_type', connectorId)
      .single();

    const existingMetadata = data?.connection_metadata || {};

    const { error } = await supabase
      .from('integration_sync_status')
      .update({
        connection_metadata: { ...existingMetadata, ...metadata },
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', this.userId)
      .eq('integration_type', connectorId);

    if (error) {
      throw new Error(`Failed to update metadata: ${error.message}`);
    }
  }
}

/**
 * Create connection manager instance
 * @param {string} userId - User ID
 * @returns {ConnectionManager}
 */
export function createConnectionManager(userId) {
  return new ConnectionManager(userId);
}
