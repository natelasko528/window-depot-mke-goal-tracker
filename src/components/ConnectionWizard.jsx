/**
 * Connection Wizard Component
 * Multi-step wizard for connecting apps with Google OAuth approval
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ArrowRight, Loader } from 'lucide-react';
import { signInWithGoogle, isGoogleAuthenticated } from '../lib/google-auth';
import { createConnectionManager } from '../lib/connectors/connection-manager';
import { getConnectorById } from '../lib/connectors/registry';

export default function ConnectionWizard({ connectorId, userId, onComplete, onCancel, currentTheme }) {
  const [step, setStep] = useState(1);
  const [connector, setConnector] = useState(null);
  const [googleAuth, setGoogleAuth] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadConnector();
    checkGoogleAuth();
  }, [connectorId]);

  const loadConnector = async () => {
    const conn = await getConnectorById(connectorId);
    setConnector(conn);
  };

  const checkGoogleAuth = async () => {
    const isAuth = await isGoogleAuthenticated();
    setGoogleAuth(isAuth);
    if (isAuth) {
      setStep(2); // Skip to app connection step
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle(connectorId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const manager = createConnectionManager(userId);
      
      if (connector.connection_type === 'oauth2') {
        const result = await manager.connect(connectorId, {
          clientId,
          clientSecret,
        });
        
        if (result.requiresRedirect) {
          window.location.href = result.authUrl;
        }
      } else if (connector.connection_type === 'api_key') {
        const result = await manager.connect(connectorId, { apiKey });
        if (result.success) {
          onComplete && onComplete(result);
        }
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (!connector) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{
      background: currentTheme.white,
      borderRadius: '16px',
      padding: '32px',
      maxWidth: '600px',
      margin: '0 auto',
      boxShadow: currentTheme.shadows.xl
    }}>
      {/* Progress Steps */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{
            flex: 1,
            textAlign: 'center',
            position: 'relative'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: step >= s ? currentTheme.primary : currentTheme.border,
              color: step >= s ? currentTheme.white : currentTheme.textLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              fontWeight: '600'
            }}>
              {step > s ? <CheckCircle size={20} /> : s}
            </div>
            <div style={{ fontSize: '12px', color: currentTheme.textLight }}>
              {s === 1 ? 'Google Auth' : s === 2 ? 'App Config' : 'Complete'}
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: Google Auth */}
      {step === 1 && (
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Sign in with Google
          </h3>
          <p style={{ color: currentTheme.textLight, marginBottom: '24px' }}>
            Please sign in with your Google account to approve this connection.
          </p>
          <button
            onClick={handleGoogleAuth}
            style={{
              width: '100%',
              padding: '12px',
              background: currentTheme.primary,
              color: currentTheme.white,
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Continue with Google
          </button>
        </div>
      )}

      {/* Step 2: App Configuration */}
      {step === 2 && (
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Configure {connector.name}
          </h3>
          
          {connector.connection_type === 'api_key' ? (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}
              />
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Client ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Enter OAuth Client ID"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '8px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Client Secret
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Enter OAuth Client Secret"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: '8px'
                  }}
                />
              </div>
            </>
          )}

          {error && (
            <div style={{
              padding: '12px',
              background: '#FEE2E2',
              color: '#DC2626',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '12px',
                background: currentTheme.secondary,
                color: currentTheme.text,
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={loading || (connector.connection_type === 'api_key' ? !apiKey : !clientId || !clientSecret)}
              style={{
                flex: 1,
                padding: '12px',
                background: loading || (connector.connection_type === 'api_key' ? !apiKey : !clientId || !clientSecret)
                  ? currentTheme.border
                  : currentTheme.primary,
                color: currentTheme.white,
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? <Loader size={16} className="spinner" /> : 'Connect'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
