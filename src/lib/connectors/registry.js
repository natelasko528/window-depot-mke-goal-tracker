/**
 * Universal Connector Registry
 * Manages catalog of all connectable apps with metadata
 */

import { supabase } from '../supabase';

/**
 * Default connector definitions (fallback if database is unavailable)
 */
const DEFAULT_CONNECTORS = [
  {
    id: 'jotform',
    name: 'Jotform',
    category: 'Forms',
    icon_url: null,
    description: 'Connect Jotform to sync form submissions and manage webhooks',
    connection_type: 'api_key',
    api_base_url: 'https://api.jotform.com',
    required_scopes: null,
    metadata: {
      website: 'https://www.jotform.com',
      auth_method: 'api_key',
      help_url: 'https://www.jotform.com/help/8-How-to-Get-Your-JotForm-API-Key',
    },
  },
  {
    id: 'marketsharp',
    name: 'Marketsharp',
    category: 'CRM',
    icon_url: null,
    description: 'Sync leads and contacts from Marketsharp CRM',
    connection_type: 'api_key',
    api_base_url: 'https://api.marketsharp.com',
    required_scopes: null,
    metadata: {
      website: 'https://www.marketsharp.com',
      auth_method: 'api_key',
    },
  },
  {
    id: 'gohighlevel',
    name: 'GoHighLevel',
    category: 'CRM',
    icon_url: null,
    description: 'Connect GoHighLevel to sync contacts, opportunities, and appointments',
    connection_type: 'oauth2',
    api_base_url: 'https://services.leadconnectorhq.com',
    required_scopes: ['contacts.readonly', 'contacts.write', 'opportunities.readonly', 'opportunities.write'],
    oauth_endpoints: {
      authorization_url: 'https://marketplace.gohighlevel.com/oauth/chooselocation',
      token_url: 'https://services.leadconnectorhq.com/oauth/token',
      supports_pkce: false,
    },
    metadata: {
      website: 'https://www.gohighlevel.com',
      auth_method: 'oauth2',
    },
  },
  {
    id: 'zoom',
    name: 'Zoom',
    category: 'Communication',
    icon_url: null,
    description: 'Connect Zoom to manage meetings and webinars',
    connection_type: 'oauth2',
    api_base_url: 'https://api.zoom.us/v2',
    required_scopes: ['meeting:write', 'meeting:read', 'user:read'],
    oauth_endpoints: {
      authorization_url: 'https://zoom.us/oauth/authorize',
      token_url: 'https://zoom.us/oauth/token',
      supports_pkce: true,
    },
    metadata: {
      website: 'https://zoom.us',
      auth_method: 'oauth2',
    },
  },
];

/**
 * Connector Registry Class
 */
export class ConnectorRegistry {
  constructor() {
    this.connectors = new Map();
    this.loaded = false;
  }

  /**
   * Load connectors from database or use defaults
   */
  async load() {
    if (this.loaded) {
      return Array.from(this.connectors.values());
    }

    try {
      // Try to load from Supabase
      const { data, error } = await supabase
        .from('connector_definitions')
        .select('*')
        .eq('enabled', true)
        .order('name');

      if (!error && data && data.length > 0) {
        // Load from database
        data.forEach(connector => {
          this.connectors.set(connector.id, this.normalizeConnector(connector));
        });
      } else {
        // Fallback to defaults
        DEFAULT_CONNECTORS.forEach(connector => {
          this.connectors.set(connector.id, connector);
        });
      }
    } catch (error) {
      console.warn('Failed to load connectors from database, using defaults:', error);
      // Fallback to defaults
      DEFAULT_CONNECTORS.forEach(connector => {
        this.connectors.set(connector.id, connector);
      });
    }

    this.loaded = true;
    return Array.from(this.connectors.values());
  }

  /**
   * Normalize connector data from database format
   */
  normalizeConnector(dbConnector) {
    return {
      id: dbConnector.id,
      name: dbConnector.name,
      category: dbConnector.category || 'Other',
      icon_url: dbConnector.icon_url,
      description: dbConnector.description,
      connection_type: dbConnector.connection_type,
      api_base_url: dbConnector.api_base_url,
      required_scopes: dbConnector.required_scopes || [],
      oauth_endpoints: dbConnector.oauth_endpoints || null,
      metadata: dbConnector.metadata || {},
    };
  }

  /**
   * Get all connectors
   */
  async getAll() {
    if (!this.loaded) {
      await this.load();
    }
    return Array.from(this.connectors.values());
  }

  /**
   * Get connector by ID
   */
  async getById(id) {
    if (!this.loaded) {
      await this.load();
    }
    return this.connectors.get(id) || null;
  }

  /**
   * Get connectors by category
   */
  async getByCategory(category) {
    if (!this.loaded) {
      await this.load();
    }
    return Array.from(this.connectors.values()).filter(
      connector => connector.category === category
    );
  }

  /**
   * Get connectors by connection type
   */
  async getByConnectionType(type) {
    if (!this.loaded) {
      await this.load();
    }
    return Array.from(this.connectors.values()).filter(
      connector => connector.connection_type === type
    );
  }

  /**
   * Search connectors by name or description
   */
  async search(query) {
    if (!this.loaded) {
      await this.load();
    }
    const lowerQuery = query.toLowerCase();
    return Array.from(this.connectors.values()).filter(
      connector =>
        connector.name.toLowerCase().includes(lowerQuery) ||
        (connector.description && connector.description.toLowerCase().includes(lowerQuery)) ||
        (connector.category && connector.category.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get all unique categories
   */
  async getCategories() {
    if (!this.loaded) {
      await this.load();
    }
    const categories = new Set();
    this.connectors.forEach(connector => {
      if (connector.category) {
        categories.add(connector.category);
      }
    });
    return Array.from(categories).sort();
  }

  /**
   * Refresh connectors from database
   */
  async refresh() {
    this.loaded = false;
    this.connectors.clear();
    return await this.load();
  }

  /**
   * Register a new connector (admin function)
   */
  async register(connectorData) {
    try {
      const { data, error } = await supabase
        .from('connector_definitions')
        .upsert(connectorData, { onConflict: 'id' })
        .select()
        .single();

      if (error) throw error;

      // Refresh cache
      await this.refresh();
      return data;
    } catch (error) {
      console.error('Failed to register connector:', error);
      throw error;
    }
  }
}

// Singleton instance
let registryInstance = null;

/**
 * Get registry instance
 */
export function getConnectorRegistry() {
  if (!registryInstance) {
    registryInstance = new ConnectorRegistry();
  }
  return registryInstance;
}

/**
 * Convenience functions
 */
export async function getAllConnectors() {
  const registry = getConnectorRegistry();
  return await registry.getAll();
}

export async function getConnectorById(id) {
  const registry = getConnectorRegistry();
  return await registry.getById(id);
}

export async function getConnectorsByCategory(category) {
  const registry = getConnectorRegistry();
  return await registry.getByCategory(category);
}

export async function searchConnectors(query) {
  const registry = getConnectorRegistry();
  return await registry.search(query);
}

export async function getConnectorCategories() {
  const registry = getConnectorRegistry();
  return await registry.getCategories();
}
