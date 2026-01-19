/**
 * Third-party integrations: Jotform and Marketsharp
 * Handles API connections, data syncing, and webhook management
 */

import { encryptApiKey, decryptApiKey } from './encryption';
import storage from '../storage';

const JOTFORM_API_BASE = 'https://api.jotform.com';
const MARKETSHP_API_BASE = 'https://api.marketsharp.com'; // Update with actual base URL
const GOHIGHLEVEL_API_BASE = 'https://services.leadconnectorhq.com';
const ZOOM_API_BASE = 'https://api.zoom.us/v2';

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
 * GoHighLevel API Client
 */
export class GoHighLevelClient {
  constructor(accessToken, locationId, userId) {
    this.accessToken = accessToken;
    this.locationId = locationId;
    this.userId = userId;
    this.baseURL = GOHIGHLEVEL_API_BASE;
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL}/contacts/`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok && response.status !== 401) {
        throw new Error(`GoHighLevel API error: ${response.status}`);
      }
      return { valid: response.ok, error: response.ok ? null : 'Invalid token or location ID' };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Get contacts with pagination
   * @param {number} limit - Number of contacts to fetch
   * @param {number} offset - Pagination offset
   */
  async getContacts(limit = 100, offset = 0) {
    try {
      const response = await fetch(
        `${this.baseURL}/contacts/?locationId=${this.locationId}&limit=${limit}&skip=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch contacts: ${response.status}`);
      }
      const data = await response.json();
      return data.contacts || [];
    } catch (error) {
      console.error('GoHighLevel getContacts error:', error);
      throw error;
    }
  }

  /**
   * Create new contact
   * @param {object} contactData - Contact data (firstName, lastName, email, phone, etc.)
   */
  async createContact(contactData) {
    try {
      const response = await fetch(`${this.baseURL}/contacts/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: this.locationId,
          ...contactData,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create contact: ${response.status}`);
      }
      const data = await response.json();
      return data.contact || data;
    } catch (error) {
      console.error('GoHighLevel createContact error:', error);
      throw error;
    }
  }

  /**
   * Update contact
   * @param {string} contactId - Contact ID
   * @param {object} contactData - Updated contact data
   */
  async updateContact(contactId, contactData) {
    try {
      const response = await fetch(`${this.baseURL}/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update contact: ${response.status}`);
      }
      const data = await response.json();
      return data.contact || data;
    } catch (error) {
      console.error('GoHighLevel updateContact error:', error);
      throw error;
    }
  }

  /**
   * Get opportunities/deals with pagination
   * @param {number} limit - Number of opportunities to fetch
   * @param {number} offset - Pagination offset
   */
  async getOpportunities(limit = 100, offset = 0) {
    try {
      const response = await fetch(
        `${this.baseURL}/opportunities/?locationId=${this.locationId}&limit=${limit}&skip=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch opportunities: ${response.status}`);
      }
      const data = await response.json();
      return data.opportunities || data.opportunity || [];
    } catch (error) {
      console.error('GoHighLevel getOpportunities error:', error);
      throw error;
    }
  }

  /**
   * Create opportunity/deal
   * @param {object} opportunityData - Opportunity data (pipelineId, contactId, name, status, etc.)
   */
  async createOpportunity(opportunityData) {
    try {
      const response = await fetch(`${this.baseURL}/opportunities/upsert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: this.locationId,
          ...opportunityData,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create opportunity: ${response.status}`);
      }
      const data = await response.json();
      return data.opportunity || data;
    } catch (error) {
      console.error('GoHighLevel createOpportunity error:', error);
      throw error;
    }
  }

  /**
   * Get appointments for a contact
   * @param {string} contactId - Contact ID
   */
  async getAppointments(contactId) {
    try {
      const response = await fetch(
        `${this.baseURL}/contacts/${contactId}/appointments`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch appointments: ${response.status}`);
      }
      const data = await response.json();
      return data.events || data.appointments || [];
    } catch (error) {
      console.error('GoHighLevel getAppointments error:', error);
      throw error;
    }
  }
}

/**
 * Zoom API Client
 */
export class ZoomClient {
  constructor(accessToken, refreshToken, userId) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.userId = userId;
    this.baseURL = ZOOM_API_BASE;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken() {
    try {
      // Note: This requires client_id and client_secret which should be stored securely
      // For now, return error indicating refresh needs to be handled externally
      throw new Error('Token refresh must be handled via OAuth flow');
    } catch (error) {
      console.error('Zoom refreshAccessToken error:', error);
      throw error;
    }
  }

  /**
   * Test API connection
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.baseURL}/users/me`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 401) {
        return { valid: false, error: 'Invalid or expired token' };
      }
      if (!response.ok) {
        throw new Error(`Zoom API error: ${response.status}`);
      }
      const data = await response.json();
      return { valid: true, user: data };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Create new meeting
   * @param {object} meetingData - Meeting data (topic, type, start_time, duration, etc.)
   */
  async createMeeting(meetingData) {
    try {
      const response = await fetch(`${this.baseURL}/users/me/meetings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetingData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create meeting: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Zoom createMeeting error:', error);
      throw error;
    }
  }

  /**
   * List meetings for a user
   * @param {string} userId - User ID (use 'me' for authenticated user)
   * @param {number} pageSize - Number of meetings per page
   * @param {string} nextPageToken - Token for pagination
   */
  async listMeetings(userId = 'me', pageSize = 30, nextPageToken = null) {
    try {
      let url = `${this.baseURL}/users/${userId}/meetings?page_size=${pageSize}`;
      if (nextPageToken) {
        url += `&next_page_token=${nextPageToken}`;
      }
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to list meetings: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Zoom listMeetings error:', error);
      throw error;
    }
  }

  /**
   * Get meeting details
   * @param {string} meetingId - Meeting ID
   */
  async getMeeting(meetingId) {
    try {
      const response = await fetch(`${this.baseURL}/meetings/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to get meeting: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Zoom getMeeting error:', error);
      throw error;
    }
  }

  /**
   * Update meeting
   * @param {string} meetingId - Meeting ID
   * @param {object} meetingData - Updated meeting data
   */
  async updateMeeting(meetingId, meetingData) {
    try {
      const response = await fetch(`${this.baseURL}/meetings/${meetingId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetingData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to update meeting: ${response.status}`);
      }
      return { success: true };
    } catch (error) {
      console.error('Zoom updateMeeting error:', error);
      throw error;
    }
  }

  /**
   * Delete meeting
   * @param {string} meetingId - Meeting ID
   */
  async deleteMeeting(meetingId) {
    try {
      const response = await fetch(`${this.baseURL}/meetings/${meetingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to delete meeting: ${response.status}`);
      }
      return { success: true };
    } catch (error) {
      console.error('Zoom deleteMeeting error:', error);
      throw error;
    }
  }

  /**
   * Create event subscription for webhooks
   * @param {object} subscriptionData - Subscription data (events, webhook_url, etc.)
   */
  async createEventSubscription(subscriptionData) {
    try {
      const response = await fetch(`${this.baseURL}/marketplace/app/event_subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscriptionData),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create subscription: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Zoom createEventSubscription error:', error);
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

  /**
   * Connect GoHighLevel integration
   * @param {string} accessToken - GoHighLevel access token
   * @param {string} locationId - GoHighLevel location ID
   */
  async connectGoHighLevel(accessToken, locationId) {
    try {
      // Encrypt and store access token
      const encrypted = await encryptApiKey(accessToken, this.userId);
      await storage.set(`integration_gohighlevel_${this.userId}`, {
        encryptedAccessToken: encrypted,
        locationId,
        connectedAt: new Date().toISOString(),
        status: 'connected',
      });

      // Test connection
      const client = new GoHighLevelClient(accessToken, locationId, this.userId);
      const testResult = await client.testConnection();
      
      if (!testResult.valid) {
        await this.disconnectGoHighLevel();
        throw new Error(testResult.error || 'Connection test failed');
      }

      return { success: true };
    } catch (error) {
      console.error('GoHighLevel connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect GoHighLevel integration
   */
  async disconnectGoHighLevel() {
    try {
      await storage.remove(`integration_gohighlevel_${this.userId}`);
      await storage.remove(`integration_gohighlevel_data_${this.userId}`);
      if (this.syncIntervals.gohighlevel) {
        clearInterval(this.syncIntervals.gohighlevel);
        delete this.syncIntervals.gohighlevel;
      }
      return { success: true };
    } catch (error) {
      console.error('GoHighLevel disconnect error:', error);
      throw error;
    }
  }

  /**
   * Get GoHighLevel connection status
   */
  async getGoHighLevelStatus() {
    try {
      const stored = await storage.get(`integration_gohighlevel_${this.userId}`);
      if (!stored) {
        return { connected: false };
      }

      try {
        const accessToken = await decryptApiKey(stored.encryptedAccessToken, this.userId);
        const client = new GoHighLevelClient(accessToken, stored.locationId, this.userId);
        const testResult = await client.testConnection();
        
        return {
          connected: true,
          status: testResult.valid ? 'connected' : 'error',
          connectedAt: stored.connectedAt,
          locationId: stored.locationId,
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
   * Sync GoHighLevel contacts
   */
  async syncGoHighLevelContacts() {
    try {
      const stored = await storage.get(`integration_gohighlevel_${this.userId}`);
      if (!stored) {
        throw new Error('GoHighLevel not connected');
      }

      const accessToken = await decryptApiKey(stored.encryptedAccessToken, this.userId);
      const client = new GoHighLevelClient(accessToken, stored.locationId, this.userId);
      
      let allContacts = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const contacts = await client.getContacts(100, offset);
        if (contacts.length === 0) {
          hasMore = false;
        } else {
          allContacts.push(...contacts);
          offset += contacts.length;
          if (contacts.length < 100) {
            hasMore = false;
          }
        }
      }

      // Store contacts
      await storage.set(`integration_gohighlevel_contacts_${this.userId}`, {
        contacts: allContacts,
        lastSync: new Date().toISOString(),
      });

      return {
        success: true,
        count: allContacts.length,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      console.error('GoHighLevel sync contacts error:', error);
      throw error;
    }
  }

  /**
   * Sync GoHighLevel opportunities
   */
  async syncGoHighLevelOpportunities() {
    try {
      const stored = await storage.get(`integration_gohighlevel_${this.userId}`);
      if (!stored) {
        throw new Error('GoHighLevel not connected');
      }

      const accessToken = await decryptApiKey(stored.encryptedAccessToken, this.userId);
      const client = new GoHighLevelClient(accessToken, stored.locationId, this.userId);
      
      let allOpportunities = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const opportunities = await client.getOpportunities(100, offset);
        if (opportunities.length === 0) {
          hasMore = false;
        } else {
          allOpportunities.push(...opportunities);
          offset += opportunities.length;
          if (opportunities.length < 100) {
            hasMore = false;
          }
        }
      }

      // Store opportunities
      await storage.set(`integration_gohighlevel_opportunities_${this.userId}`, {
        opportunities: allOpportunities,
        lastSync: new Date().toISOString(),
      });

      return {
        success: true,
        count: allOpportunities.length,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      console.error('GoHighLevel sync opportunities error:', error);
      throw error;
    }
  }

  /**
   * Sync GoHighLevel appointments (for all contacts)
   */
  async syncGoHighLevelAppointments() {
    try {
      const stored = await storage.get(`integration_gohighlevel_contacts_${this.userId}`);
      if (!stored || !stored.contacts) {
        throw new Error('Contacts must be synced first');
      }

      const connection = await storage.get(`integration_gohighlevel_${this.userId}`);
      if (!connection) {
        throw new Error('GoHighLevel not connected');
      }

      const accessToken = await decryptApiKey(connection.encryptedAccessToken, this.userId);
      const client = new GoHighLevelClient(accessToken, connection.locationId, this.userId);
      
      const allAppointments = [];
      
      // Get appointments for each contact (limit to first 100 contacts to avoid rate limits)
      for (const contact of stored.contacts.slice(0, 100)) {
        try {
          const appointments = await client.getAppointments(contact.id);
          allAppointments.push(...appointments.map(apt => ({ ...apt, contactId: contact.id })));
        } catch (error) {
          console.error(`Error fetching appointments for contact ${contact.id}:`, error);
        }
      }

      // Store appointments
      await storage.set(`integration_gohighlevel_appointments_${this.userId}`, {
        appointments: allAppointments,
        lastSync: new Date().toISOString(),
      });

      return {
        success: true,
        count: allAppointments.length,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      console.error('GoHighLevel sync appointments error:', error);
      throw error;
    }
  }

  /**
   * Start periodic GoHighLevel sync (every 30 minutes)
   */
  startGoHighLevelSync(onSync) {
    if (this.syncIntervals.gohighlevel) {
      clearInterval(this.syncIntervals.gohighlevel);
    }

    // Initial sync
    Promise.all([
      this.syncGoHighLevelContacts(),
      this.syncGoHighLevelOpportunities(),
    ]).then((results) => {
      onSync({ success: true, contacts: results[0], opportunities: results[1] });
    }).catch(console.error);

    // Periodic sync every 30 minutes
    this.syncIntervals.gohighlevel = setInterval(() => {
      Promise.all([
        this.syncGoHighLevelContacts(),
        this.syncGoHighLevelOpportunities(),
      ]).then((results) => {
        onSync({ success: true, contacts: results[0], opportunities: results[1] });
      }).catch(console.error);
    }, 30 * 60 * 1000);
  }

  /**
   * Get synced GoHighLevel data
   */
  async getGoHighLevelData() {
    try {
      const [contactsData, opportunitiesData, appointmentsData] = await Promise.all([
        storage.get(`integration_gohighlevel_contacts_${this.userId}`).catch(() => null),
        storage.get(`integration_gohighlevel_opportunities_${this.userId}`).catch(() => null),
        storage.get(`integration_gohighlevel_appointments_${this.userId}`).catch(() => null),
      ]);

      return {
        contacts: contactsData?.contacts || [],
        opportunities: opportunitiesData?.opportunities || [],
        appointments: appointmentsData?.appointments || [],
        lastSync: contactsData?.lastSync || opportunitiesData?.lastSync || appointmentsData?.lastSync,
      };
    } catch (error) {
      console.error('Get GoHighLevel data error:', error);
      return { contacts: [], opportunities: [], appointments: [], lastSync: null };
    }
  }

  /**
   * Connect Zoom integration
   * @param {string} accessToken - Zoom access token
   * @param {string} refreshToken - Zoom refresh token
   */
  async connectZoom(accessToken, refreshToken) {
    try {
      // Encrypt and store tokens
      const encryptedAccess = await encryptApiKey(accessToken, this.userId);
      const encryptedRefresh = refreshToken ? await encryptApiKey(refreshToken, this.userId) : null;
      
      await storage.set(`integration_zoom_${this.userId}`, {
        encryptedAccessToken: encryptedAccess,
        encryptedRefreshToken: encryptedRefresh,
        connectedAt: new Date().toISOString(),
        status: 'connected',
      });

      // Test connection
      const client = new ZoomClient(accessToken, refreshToken, this.userId);
      const testResult = await client.testConnection();
      
      if (!testResult.valid) {
        await this.disconnectZoom();
        throw new Error(testResult.error || 'Connection test failed');
      }

      return { success: true, user: testResult.user };
    } catch (error) {
      console.error('Zoom connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect Zoom integration
   */
  async disconnectZoom() {
    try {
      // Deregister webhooks first
      await this.deregisterZoomWebhooks().catch(console.error);
      
      await storage.remove(`integration_zoom_${this.userId}`);
      await storage.remove(`integration_zoom_meetings_${this.userId}`);
      if (this.syncIntervals.zoom) {
        clearInterval(this.syncIntervals.zoom);
        delete this.syncIntervals.zoom;
      }
      return { success: true };
    } catch (error) {
      console.error('Zoom disconnect error:', error);
      throw error;
    }
  }

  /**
   * Get Zoom connection status
   */
  async getZoomStatus() {
    try {
      const stored = await storage.get(`integration_zoom_${this.userId}`);
      if (!stored) {
        return { connected: false };
      }

      try {
        const accessToken = await decryptApiKey(stored.encryptedAccessToken, this.userId);
        const refreshToken = stored.encryptedRefreshToken 
          ? await decryptApiKey(stored.encryptedRefreshToken, this.userId)
          : null;
        const client = new ZoomClient(accessToken, refreshToken, this.userId);
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
   * Sync Zoom meetings
   */
  async syncZoomMeetings() {
    try {
      const stored = await storage.get(`integration_zoom_${this.userId}`);
      if (!stored) {
        throw new Error('Zoom not connected');
      }

      const accessToken = await decryptApiKey(stored.encryptedAccessToken, this.userId);
      const refreshToken = stored.encryptedRefreshToken 
        ? await decryptApiKey(stored.encryptedRefreshToken, this.userId)
        : null;
      const client = new ZoomClient(accessToken, refreshToken, this.userId);
      
      let allMeetings = [];
      let nextPageToken = null;
      let hasMore = true;

      while (hasMore) {
        const response = await client.listMeetings('me', 30, nextPageToken);
        if (response.meetings && response.meetings.length > 0) {
          allMeetings.push(...response.meetings);
        }
        nextPageToken = response.next_page_token;
        hasMore = !!nextPageToken && response.meetings && response.meetings.length > 0;
      }

      // Store meetings
      await storage.set(`integration_zoom_meetings_${this.userId}`, {
        meetings: allMeetings,
        lastSync: new Date().toISOString(),
      });

      return {
        success: true,
        count: allMeetings.length,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Zoom sync meetings error:', error);
      throw error;
    }
  }

  /**
   * Create Zoom meeting
   * @param {object} meetingData - Meeting data
   */
  async createZoomMeeting(meetingData) {
    try {
      const stored = await storage.get(`integration_zoom_${this.userId}`);
      if (!stored) {
        throw new Error('Zoom not connected');
      }

      const accessToken = await decryptApiKey(stored.encryptedAccessToken, this.userId);
      const refreshToken = stored.encryptedRefreshToken 
        ? await decryptApiKey(stored.encryptedRefreshToken, this.userId)
        : null;
      const client = new ZoomClient(accessToken, refreshToken, this.userId);
      const meeting = await client.createMeeting(meetingData);

      // Trigger sync to refresh data
      await this.syncZoomMeetings();

      return { success: true, meeting };
    } catch (error) {
      console.error('Zoom createMeeting error:', error);
      throw error;
    }
  }

  /**
   * Start periodic Zoom sync (every 30 minutes)
   */
  startZoomSync(onSync) {
    if (this.syncIntervals.zoom) {
      clearInterval(this.syncIntervals.zoom);
    }

    // Initial sync
    this.syncZoomMeetings().then(onSync).catch(console.error);

    // Periodic sync every 30 minutes
    this.syncIntervals.zoom = setInterval(() => {
      this.syncZoomMeetings().then(onSync).catch(console.error);
    }, 30 * 60 * 1000);
  }

  /**
   * Register Zoom webhooks
   * @param {string} webhookUrl - Webhook URL (Supabase Edge Function)
   */
  async registerZoomWebhooks(webhookUrl) {
    try {
      const stored = await storage.get(`integration_zoom_${this.userId}`);
      if (!stored) {
        throw new Error('Zoom not connected');
      }

      const accessToken = await decryptApiKey(stored.encryptedAccessToken, this.userId);
      const refreshToken = stored.encryptedRefreshToken 
        ? await decryptApiKey(stored.encryptedRefreshToken, this.userId)
        : null;
      const client = new ZoomClient(accessToken, refreshToken, this.userId);

      const subscription = await client.createEventSubscription({
        event_subscription_name: 'Window Depot Goal Tracker Webhooks',
        event_webhook_url: webhookUrl,
        events: [
          'meeting.created',
          'meeting.updated',
          'meeting.deleted',
          'meeting.started',
          'meeting.ended',
        ],
        subscription_scope: 'user',
      });

      // Store subscription ID
      await storage.set(`integration_zoom_webhook_${this.userId}`, {
        webhookUrl,
        subscriptionId: subscription.event_subscription_id,
        registeredAt: new Date().toISOString(),
      });

      return { success: true, subscriptionId: subscription.event_subscription_id };
    } catch (error) {
      console.error('Zoom webhook registration error:', error);
      throw error;
    }
  }

  /**
   * Deregister Zoom webhooks
   */
  async deregisterZoomWebhooks() {
    try {
      const stored = await storage.get(`integration_zoom_webhook_${this.userId}`);
      if (!stored || !stored.subscriptionId) {
        return { success: true };
      }

      const connection = await storage.get(`integration_zoom_${this.userId}`);
      if (!connection) {
        return { success: true };
      }

      // Note: Zoom API requires DELETE endpoint which we'd need to implement
      // For now, just remove stored webhook info
      await storage.remove(`integration_zoom_webhook_${this.userId}`);
      return { success: true };
    } catch (error) {
      console.error('Zoom webhook deregistration error:', error);
      throw error;
    }
  }

  /**
   * Get synced Zoom meetings
   */
  async getZoomMeetings() {
    try {
      const stored = await storage.get(`integration_zoom_meetings_${this.userId}`);
      return stored?.meetings || [];
    } catch (error) {
      console.error('Get Zoom meetings error:', error);
      return [];
    }
  }
}
