/**
 * Connector Catalog Component
 * App-store-like interface for browsing and connecting apps
 */

import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, Link2, Package } from 'lucide-react';
import { getAllConnectors, getConnectorCategories, searchConnectors } from '../lib/connectors/registry';
import { createConnectionManager } from '../lib/connectors/connection-manager';

export default function ConnectorCatalog({ userId, onConnect, currentTheme }) {
  const [connectors, setConnectors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [connections, setConnections] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [allConnectors, allCategories] = await Promise.all([
        getAllConnectors(),
        getConnectorCategories(),
      ]);
      setConnectors(allConnectors);
      setCategories(allCategories);
      
      // Load connection statuses
      if (userId) {
        const manager = createConnectionManager(userId);
        const statuses = await manager.listConnections();
        const statusMap = {};
        statuses.forEach(conn => {
          statusMap[conn.connectorId] = conn.status;
        });
        setConnections(statusMap);
      }
    } catch (error) {
      console.error('Failed to load connectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConnectors = connectors.filter(connector => {
    const matchesSearch = !searchQuery || 
      connector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      connector.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || connector.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusIcon = (connectorId) => {
    const status = connections[connectorId];
    if (status === 'connected') {
      return <CheckCircle size={16} color={currentTheme.success} />;
    }
    return null;
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: currentTheme.textLight }}>
        Loading connectors...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px', color: currentTheme.text }}>
        Connect Apps
      </h2>

      {/* Search and Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ 
          flex: '1', 
          minWidth: '200px',
          position: 'relative'
        }}>
          <Search size={18} style={{ 
            position: 'absolute', 
            left: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: currentTheme.textLight
          }} />
          <input
            type="text"
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: `1px solid ${currentTheme.border}`,
              borderRadius: '8px',
              fontSize: '14px',
              background: currentTheme.white,
              color: currentTheme.text,
            }}
          />
        </div>
        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value || null)}
          style={{
            padding: '10px 12px',
            border: `1px solid ${currentTheme.border}`,
            borderRadius: '8px',
            fontSize: '14px',
            background: currentTheme.white,
            color: currentTheme.text,
            cursor: 'pointer'
          }}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Connector Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {filteredConnectors.map(connector => (
          <div
            key={connector.id}
            style={{
              background: currentTheme.white,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${currentTheme.border}`,
              boxShadow: currentTheme.shadows.md,
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = currentTheme.shadows.lg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = currentTheme.shadows.md;
            }}
            onClick={() => onConnect && onConnect(connector)}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '10px',
                background: currentTheme.gradients.primary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                <Package size={24} color={currentTheme.white} />
              </div>
              {getStatusIcon(connector.id)}
            </div>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              marginBottom: '8px',
              color: currentTheme.text
            }}>
              {connector.name}
            </h3>
            <p style={{ 
              fontSize: '14px', 
              color: currentTheme.textLight,
              marginBottom: '12px',
              lineHeight: '1.5'
            }}>
              {connector.description}
            </p>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: `1px solid ${currentTheme.border}`
            }}>
              <span style={{
                fontSize: '12px',
                color: currentTheme.textLight,
                textTransform: 'uppercase',
                fontWeight: '600'
              }}>
                {connector.category}
              </span>
              <button
                style={{
                  padding: '6px 16px',
                  background: connections[connector.id] === 'connected' 
                    ? currentTheme.success 
                    : currentTheme.primary,
                  color: currentTheme.white,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onConnect && onConnect(connector);
                }}
              >
                {connections[connector.id] === 'connected' ? 'Manage' : 'Connect'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredConnectors.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          color: currentTheme.textLight
        }}>
          <Package size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>No connectors found matching your search.</p>
        </div>
      )}
    </div>
  );
}
