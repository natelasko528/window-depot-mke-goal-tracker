/**
 * Connections Dashboard Component
 * Manages all active connections
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { createConnectionManager } from '../lib/connectors/connection-manager';

export default function ConnectionsDashboard({ userId, currentTheme }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConnections();
  }, [userId]);

  const loadConnections = async () => {
    try {
      const manager = createConnectionManager(userId);
      const conns = await manager.listConnections();
      setConnections(conns);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (connectorId) => {
    if (!confirm('Are you sure you want to disconnect this app?')) return;
    
    try {
      const manager = createConnectionManager(userId);
      await manager.disconnect(connectorId);
      await loadConnections();
    } catch (error) {
      alert(`Failed to disconnect: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return currentTheme.success;
      case 'error': return currentTheme.danger;
      default: return currentTheme.textLight;
    }
  };

  if (loading) {
    return <div>Loading connections...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>
        Active Connections
      </h2>

      {connections.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: currentTheme.white,
          borderRadius: '12px',
          color: currentTheme.textLight
        }}>
          <p>No active connections. Connect an app to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {connections.map(conn => (
            <div
              key={conn.connectorId}
              style={{
                background: currentTheme.white,
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${currentTheme.border}`,
                boxShadow: currentTheme.shadows.md,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{conn.connectorId}</h3>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '14px',
                    color: getStatusColor(conn.status)
                  }}>
                    {conn.status === 'connected' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {conn.status}
                  </div>
                </div>
                {conn.lastSync && (
                  <p style={{ fontSize: '14px', color: currentTheme.textLight, margin: 0 }}>
                    Last synced: {new Date(conn.lastSync).toLocaleString()}
                  </p>
                )}
                {conn.error && (
                  <p style={{ fontSize: '14px', color: currentTheme.danger, marginTop: '8px' }}>
                    Error: {conn.error}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleDisconnect(conn.connectorId)}
                  style={{
                    padding: '8px 16px',
                    background: currentTheme.danger,
                    color: currentTheme.white,
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
