/**
 * Third-party integrations: Jotform and Marketsharp
 * Handles API connections, data syncing, and webhook management
 */

import { encryptApiKey, decryptApiKey } from './encryption';
import storage from '../storage';

const JOTFORM_API_BASE = 'https://api.jotform.com';
const MARKETSHP_API_BASE = 'https://api.marketsharp.com'; // Update with actual base URL

/**
 * Jotform API Client
 */
export class JotformClient {
  constructor(apiKey, userId) {
    this.apiKey = apiKey;
    this.userId = userId;
    this.baseURL = JOTFORM_API_BASE;
  }

  /**
   * Test API key validity
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL}/user?apiKey=${this.apiKey}`);
      if (!response.ok) {
        throw new Error(`Jotform API error: ${response.status}`);
      }
      const data = await response.json();
      return { valid: true, user: data.content };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get all forms
   */
  async getForms() {
    try {
      const response = await fetch(`${this.baseURL}/user/forms?apiKey=${this.apiKey}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch forms: ${response.status}`);
      }
      const data = await response.json();
      return data.content || [];
    } catch (error) {
      console.error('Jotform getForms error:', error);
      throw error;
    }
  }

  /**
   * Get form submissions
   * @param {string} formId - Form ID
   * @param {number} offset - Pagination offset
   * @param {number} limit - Results per page (max 100)
   */
  async getSubmissions(formId, offset = 0, limit = 100) {
    try {
      const response = await fetch(
        `${this.baseURL}/form/${formId}/submissions?apiKey=${this.apiKey}&offset=${offset}&limit=${limit}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch submissions: ${response.status}`);
      }
      const data = await response.json();
      return data.content || [];
    } catch (error) {
      console.error('Jotform getSubmissions error:', error);
      throw error;
    }
  }

  /**
   * Get all submissions across all forms
   */
  async getAllSubmissions() {
    try {
      const forms = await this.getForms();
      const allSubmissions = [];

      for (const form of forms) {
        try {
          let offset = 0;
          let hasMore = true;

          while (hasMore) {
            const submissions = await this.getSubmissions(form.id, offset, 100);
            if (submissions.length === 0) {
              hasMore = false;
            } else {
              allSubmissions.push(...submissions.map(sub => ({
                ...sub,
                formId: form.id,
                formTitle: form.title,
              })));
              offset += submissions.length;
              if (submissions.length < 100) {
                hasMore = false;
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching submissions for form ${form.id}:`, error);
        }
      }

      return allSubmissions;
    } catch (error) {
      console.error('Jotform getAllSubmissions error:', error);
      throw error;
    }
  }

  /**
   * Register webhook for form
   * @param {string} formId - Form ID
   * @param {string} webhookURL - Webhook URL
   */
  async registerWebhook(formId, webhookURL) {
    try {
      const response = await fetch(
        `${this.baseURL}/form/${formId}/webhooks?apiKey=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `webhookURL=${encodeURIComponent(webhookURL)}`,
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to register webhook: ${response.status}`);
      }
      const data = await response.json();
      return data.content;
    } catch (error) {
      console.error('Jotform registerWebhook error:', error);
      throw error;
    }
  }

  /**
   * Delete webhook
   * @param {string} formId - Form ID
   * @param {string} webhookId - Webhook ID
   */
  async deleteWebhook(formId, webhookId) {
    try {
      const response = await fetch(
        `${this.baseURL}/form/${formId}/webhooks/${webhookId}?apiKey=${this.apiKey}`,
        { method: 'DELETE' }
      );
      return response.ok;
    } catch (error) {
      console.error('Jotform deleteWebhook error:', error);
      throw error;
    }
  }
}

/**
 * Marketsharp API Client
 */
export class MarketsharpClient {
  constructor(apiKey, userId, companyId) {
    this.apiKey = apiKey;
    this.userId = userId;
    this.companyId = companyId;
    this.baseURL = MARKETSHP_API_BASE;
  }

  /**
   * Test API key validity
   */
  async testConnection() {
    try {
      // Update with actual Marketsharp API endpoint
      const response = await fetch(`${this.baseURL}/api/test?apiKey=${this.apiKey}&companyId=${this.companyId}`);
      if (!response.ok) {
        throw new Error(`Marketsharp API error: ${response.status}`);
      }
      const data = await response.json();
      return { valid: true, data };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get leads
   * @param {object} filters - Filter options
   */
  async getLeads(filters = {}) {
    try {
      // Update with actual Marketsharp API endpoint
      const queryParams = new URLSearchParams({
        apiKey: this.apiKey,
        companyId: this.companyId,
        ...filters,
      });
      const response = await fetch(`${this.baseURL}/api/leads?${queryParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.status}`);
      }
      const data = await response.json();
      return data.leads || data.data || [];
    } catch (error) {
      console.error('Marketsharp getLeads error:', error);
      throw error;
    }
  }

  /**
   * Get contacts
   */
  async getContacts() {
    try {
      // Update with actual Marketsharp API endpoint
      const queryParams = new URLSearchParams({
        apiKey: this.apiKey,
        companyId: this.companyId,
      });
      const response = await fetch(`${this.baseURL}/api/contacts?${queryParams}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.status}`);
      }
      const data = await response.json();
      return data.contacts || data.data || [];
    } catch (error) {
      console.error('Marketsharp getContacts error:', error);
      throw error;
    }
  }

  /**
   * Create lead
   * @param {object} leadData - Lead data
   */
  async createLead(leadData) {
    try {
      // Update with actual Marketsharp API endpoint
      const response = await fetch(`${this.baseURL}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'API-Key': this.apiKey,
        },
        body: JSON.stringify({
          companyId: this.companyId,
          ...leadData,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create lead: ${response.status}`);
      }
      const data = await response.json();
      return data.lead || data.data;
    } catch (error) {
      console.error('Marketsharp createLead error:', error);
      throw error;
    }
  }
}

/**
 * Integration Manager
 */
export class IntegrationManager {
  constructor(userId) {
    this.userId = userId;
    this.syncIntervals = {};
  }

  /**
   * Connect Jotform integration
   * @param {string} apiKey - Jotform API key
   */
  async connectJotform(apiKey) {
    try {
      // Encrypt and store API key
      const encrypted = await encryptApiKey(apiKey, this.userId);
      await storage.set(`integration_jotform_${this.userId}`, {
        encryptedApiKey: encrypted,
        connectedAt: new Date().toISOString(),
        status: 'connected',
      });

      // Test connection
      const client = new JotformClient(apiKey, this.userId);
      const testResult = await client.testConnection();
      
      if (!testResult.valid) {
        await this.disconnectJotform();
        throw new Error(testResult.error || 'Connection test failed');
      }

      return { success: true, user: testResult.user };
    } catch (error) {
      console.error('Jotform connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect Jotform integration
   */
  async disconnectJotform() {
    try {
      // Deregister webhooks first
      await this.deregisterJotformWebhooks().catch(console.error);
      
      await storage.remove(`integration_jotform_${this.userId}`);
      await storage.remove(`integration_jotform_sync_${this.userId}`);
      await storage.remove(`integration_jotform_submissions_${this.userId}`);
      if (this.syncIntervals.jotform) {
        clearInterval(this.syncIntervals.jotform);
        delete this.syncIntervals.jotform;
      }
      return { success: true };
    } catch (error) {
      console.error('Jotform disconnect error:', error);
      throw error;
    }
  }

  /**
   * Get Jotform connection status
   */
  async getJotformStatus() {
    try {
      const stored = await storage.get(`integration_jotform_${this.userId}`);
      if (!stored) {
        return { connected: false };
      }

      try {
        const apiKey = await decryptApiKey(stored.encryptedApiKey, this.userId);
        const client = new JotformClient(apiKey, this.userId);
        const testResult = await client.testConnection();
        
        return {
          connected: true,
          status: testResult.valid ? 'connected' : 'error',
          connectedAt: stored.connectedAt,
          error: testResult.valid ? null : testResult.error,
        };
      } catch (error) {
        return {
          connected: true,
          status: 'error',
          error: error.message,
        };
      }
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  /**
   * Sync Jotform submissions
   */
  async syncJotformSubmissions() {
    try {
      const stored = await storage.get(`integration_jotform_${this.userId}`);
      if (!stored) {
        throw new Error('Jotform not connected');
      }

      const apiKey = await decryptApiKey(stored.encryptedApiKey, this.userId);
      const client = new JotformClient(apiKey, this.userId);
      const submissions = await client.getAllSubmissions();

      // Store submissions
      await storage.set(`integration_jotform_submissions_${this.userId}`, {
        submissions,
        lastSync: new Date().toISOString(),
      });

      return {
        success: true,
        count: submissions.length,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Jotform sync error:', error);
      throw error;
    }
  }

  /**
   * Register webhook for Jotform forms
   * @param {string} webhookURL - Webhook URL (Supabase Edge Function)
   */
  async registerJotformWebhooks(webhookURL) {
    try {
      const stored = await storage.get(`integration_jotform_${this.userId}`);
      if (!stored) {
        throw new Error('Jotform not connected');
      }

      const apiKey = await decryptApiKey(stored.encryptedApiKey, this.userId);
      const client = new JotformClient(apiKey, this.userId);
      const forms = await client.getForms();

      const webhookIds = [];
      for (const form of forms) {
        try {
          const webhook = await client.registerWebhook(form.id, webhookURL);
          webhookIds.push({ formId: form.id, webhookId: webhook.id || webhook.webhookID });
        } catch (error) {
          console.error(`Failed to register webhook for form ${form.id}:`, error);
        }
      }

      // Store webhook IDs
      await storage.set(`integration_jotform_webhooks_${this.userId}`, {
        webhookURL,
        webhookIds,
        registeredAt: new Date().toISOString(),
      });

      return { success: true, webhookIds };
    } catch (error) {
      console.error('Jotform webhook registration error:', error);
      throw error;
    }
  }

  /**
   * Deregister Jotform webhooks
   */
  async deregisterJotformWebhooks() {
    try {
      const stored = await storage.get(`integration_jotform_webhooks_${this.userId}`);
      if (!stored) {
        return { success: true };
      }

      const connection = await storage.get(`integration_jotform_${this.userId}`);
      if (!connection) {
        return { success: true };
      }

      const apiKey = await decryptApiKey(connection.encryptedApiKey, this.userId);
      const client = new JotformClient(apiKey, this.userId);

      for (const { formId, webhookId } of stored.webhookIds || []) {
        try {
          await client.deleteWebhook(formId, webhookId);
        } catch (error) {
          console.error(`Failed to delete webhook ${webhookId} for form ${formId}:`, error);
        }
      }

      await storage.remove(`integration_jotform_webhooks_${this.userId}`);
      return { success: true };
    } catch (error) {
      console.error('Jotform webhook deregistration error:', error);
      throw error;
    }
  }

  /**
   * Start periodic Jotform sync (every 15 minutes)
   */
  startJotformSync(onSync) {
    if (this.syncIntervals.jotform) {
      clearInterval(this.syncIntervals.jotform);
    }

    // Initial sync
    this.syncJotformSubmissions().then(onSync).catch(console.error);

    // Periodic sync every 15 minutes
    this.syncIntervals.jotform = setInterval(() => {
      this.syncJotformSubmissions().then(onSync).catch(console.error);
    }, 15 * 60 * 1000);
  }

  /**
   * Connect Marketsharp integration
   * @param {string} apiKey - Marketsharp API key
   * @param {string} companyId - Company ID
   */
  async connectMarketsharp(apiKey, companyId) {
    try {
      // Encrypt and store API key
      const encrypted = await encryptApiKey(apiKey, this.userId);
      await storage.set(`integration_marketsharp_${this.userId}`, {
        encryptedApiKey: encrypted,
        companyId,
        connectedAt: new Date().toISOString(),
        status: 'connected',
      });

      // Test connection
      const client = new MarketsharpClient(apiKey, this.userId, companyId);
      const testResult = await client.testConnection();
      
      if (!testResult.valid) {
        await this.disconnectMarketsharp();
        throw new Error(testResult.error || 'Connection test failed');
      }

      return { success: true };
    } catch (error) {
      console.error('Marketsharp connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect Marketsharp integration
   */
  async disconnectMarketsharp() {
    try {
      await storage.remove(`integration_marketsharp_${this.userId}`);
      await storage.remove(`integration_marketsharp_sync_${this.userId}`);
      if (this.syncIntervals.marketsharp) {
        clearInterval(this.syncIntervals.marketsharp);
        delete this.syncIntervals.marketsharp;
      }
      return { success: true };
    } catch (error) {
      console.error('Marketsharp disconnect error:', error);
      throw error;
    }
  }

  /**
   * Get Marketsharp connection status
   */
  async getMarketsharpStatus() {
    try {
      const stored = await storage.get(`integration_marketsharp_${this.userId}`);
      if (!stored) {
        return { connected: false };
      }

      try {
        const apiKey = await decryptApiKey(stored.encryptedApiKey, this.userId);
        const client = new MarketsharpClient(apiKey, this.userId, stored.companyId);
        const testResult = await client.testConnection();
        
        return {
          connected: true,
          status: testResult.valid ? 'connected' : 'error',
          connectedAt: stored.connectedAt,
          companyId: stored.companyId,
          error: testResult.valid ? null : testResult.error,
        };
      } catch (error) {
        return {
          connected: true,
          status: 'error',
          error: error.message,
        };
      }
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }

  /**
   * Sync Marketsharp leads and contacts
   */
  async syncMarketsharpData() {
    try {
      const stored = await storage.get(`integration_marketsharp_${this.userId}`);
      if (!stored) {
        throw new Error('Marketsharp not connected');
      }

      const apiKey = await decryptApiKey(stored.encryptedApiKey, this.userId);
      const client = new MarketsharpClient(apiKey, this.userId, stored.companyId);
      
      const [leads, contacts] = await Promise.all([
        client.getLeads().catch(() => []),
        client.getContacts().catch(() => []),
      ]);

      // Store data
      await storage.set(`integration_marketsharp_data_${this.userId}`, {
        leads,
        contacts,
        lastSync: new Date().toISOString(),
      });

      return {
        success: true,
        leadsCount: leads.length,
        contactsCount: contacts.length,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Marketsharp sync error:', error);
      throw error;
    }
  }

  /**
   * Start periodic Marketsharp sync (every 30 minutes)
   */
  startMarketsharpSync(onSync) {
    if (this.syncIntervals.marketsharp) {
      clearInterval(this.syncIntervals.marketsharp);
    }

    // Initial sync
    this.syncMarketsharpData().then(onSync).catch(console.error);

    // Periodic sync every 30 minutes
    this.syncIntervals.marketsharp = setInterval(() => {
      this.syncMarketsharpData().then(onSync).catch(console.error);
    }, 30 * 60 * 1000);
  }

  /**
   * Create lead in Marketsharp
   * @param {object} leadData - Lead data
   */
  async createMarketsharpLead(leadData) {
    try {
      const stored = await storage.get(`integration_marketsharp_${this.userId}`);
      if (!stored) {
        throw new Error('Marketsharp not connected');
      }

      const apiKey = await decryptApiKey(stored.encryptedApiKey, this.userId);
      const client = new MarketsharpClient(apiKey, this.userId, stored.companyId);
      const lead = await client.createLead(leadData);

      // Trigger sync to refresh data
      await this.syncMarketsharpData();

      return { success: true, lead };
    } catch (error) {
      console.error('Marketsharp createLead error:', error);
      throw error;
    }
  }

  /**
   * Get synced Jotform submissions
   */
  async getJotformSubmissions() {
    try {
      const stored = await storage.get(`integration_jotform_submissions_${this.userId}`);
      return stored?.submissions || [];
    } catch (error) {
      console.error('Get Jotform submissions error:', error);
      return [];
    }
  }

  /**
   * Get synced Marketsharp data
   */
  async getMarketsharpData() {
    try {
      const stored = await storage.get(`integration_marketsharp_data_${this.userId}`);
      return {
        leads: stored?.leads || [],
        contacts: stored?.contacts || [],
        lastSync: stored?.lastSync,
      };
    } catch (error) {
      console.error('Get Marketsharp data error:', error);
      return { leads: [], contacts: [], lastSync: null };
    }
  }
}
