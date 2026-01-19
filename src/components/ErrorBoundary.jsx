/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the entire app.
 */

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Log to error tracking service if available
    if (window.errorLog) {
      window.errorLog({
        error: error.toString(),
        errorInfo: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorCount: this.state.errorCount + 1,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const currentTheme = this.props.currentTheme || {
        white: '#ffffff',
        danger: '#dc3545',
        text: '#333333',
        textLight: '#666666',
        border: '#e0e0e0',
        shadows: {
          md: '0 2px 8px rgba(0,0,0,0.1)',
        },
      };

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
          padding: '20px',
        }}>
          <div style={{
            background: currentTheme.white,
            borderRadius: '16px',
            padding: '40px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: currentTheme.shadows.md,
            border: `1px solid ${currentTheme.border}`,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '24px',
              color: currentTheme.danger,
            }}>
              <AlertTriangle size={48} />
              <h1 style={{
                fontSize: '24px',
                fontWeight: '700',
                margin: 0,
                color: currentTheme.text,
              }}>
                Something went wrong
              </h1>
            </div>

            <p style={{
              fontSize: '16px',
              lineHeight: '1.6',
              color: currentTheme.textLight,
              marginBottom: '24px',
            }}>
              We're sorry, but something unexpected happened. The error has been logged and we'll look into it.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{
                marginBottom: '24px',
                padding: '16px',
                background: '#f8f8f8',
                borderRadius: '8px',
                border: `1px solid ${currentTheme.border}`,
              }}>
                <summary style={{
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: currentTheme.text,
                  marginBottom: '12px',
                }}>
                  Error Details (Development Only)
                </summary>
                <pre style={{
                  fontSize: '12px',
                  color: currentTheme.textLight,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo && (
                    <>
                      {'\n\n'}
                      Component Stack:
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}

            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={this.handleReset}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: '#0056A4',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#004085';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#0056A4';
                }}
              >
                <RefreshCw size={18} />
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: currentTheme.white,
                  color: currentTheme.text,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8f8f8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = currentTheme.white;
                }}
              >
                <RefreshCw size={18} />
                Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: currentTheme.white,
                  color: currentTheme.text,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8f8f8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = currentTheme.white;
                }}
              >
                <Home size={18} />
                Go Home
              </button>
            </div>

            {this.state.errorCount > 3 && (
              <p style={{
                marginTop: '24px',
                padding: '16px',
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#856404',
              }}>
                Multiple errors detected. If this persists, please contact support or try clearing your browser cache.
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;