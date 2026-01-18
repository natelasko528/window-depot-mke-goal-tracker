import React, { useState, useEffect, useRef } from 'react';
import { X, Copy, Download, Save, Trash2, Eye, EyeOff } from 'lucide-react';

const THEME = {
  primary: '#0056A4',
  secondary: '#F5F7FA',
  text: '#1A1A2E',
  textLight: '#6B7280',
  border: '#E5E7EB',
  white: '#FFFFFF',
  danger: '#DC3545',
  warning: '#FFC107',
  success: '#28A745',
};

// Global log storage
const logs = [];
const logListeners = [];

// Console interceptors
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};

const addLog = (level, ...args) => {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => {
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  }).join(' ');

  const logEntry = {
    id: `${timestamp}-${Math.random()}`,
    timestamp,
    level,
    message,
    raw: args,
  };

  logs.push(logEntry);
  
  // Keep only last 1000 logs
  if (logs.length > 1000) {
    logs.shift();
  }

  // Notify listeners
  logListeners.forEach(listener => listener([...logs]));

  // Also call original console method
  originalConsole[level]?.(...args);
};

// Intercept console methods
console.log = (...args) => addLog('log', ...args);
console.error = (...args) => addLog('error', ...args);
console.warn = (...args) => addLog('warn', ...args);
console.info = (...args) => addLog('info', ...args);
console.debug = (...args) => addLog('debug', ...args);

function DebugLogger() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [logEntries, setLogEntries] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'error', 'warn', 'info', 'log'
  const [searchTerm, setSearchTerm] = useState('');
  const logEndRef = useRef(null);
  const logsContainerRef = useRef(null);

  useEffect(() => {
    // Subscribe to log updates
    const listener = (updatedLogs) => {
      setLogEntries(updatedLogs);
    };
    
    logListeners.push(listener);
    setLogEntries([...logs]);

    // Auto-scroll to bottom
    if (logEndRef.current && !isMinimized) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }

    return () => {
      const index = logListeners.indexOf(listener);
      if (index > -1) {
        logListeners.splice(index, 1);
      }
    };
  }, [isMinimized]);

  const filteredLogs = logEntries.filter(log => {
    if (filter !== 'all' && log.level !== filter) return false;
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleCopy = () => {
    const text = filteredLogs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
      alert('Logs copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const handleDownload = () => {
    const text = filteredLogs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = () => {
    const data = JSON.stringify(logEntries, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (window.confirm('Clear all debug logs?')) {
      logs.length = 0;
      setLogEntries([]);
      logListeners.forEach(listener => listener([]));
    }
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return THEME.danger;
      case 'warn': return THEME.warning;
      case 'info': return THEME.success;
      default: return THEME.textLight;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: THEME.primary,
          color: THEME.white,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}
        title="Open Debug Logger"
      >
        🐛
      </button>
    );
  }

  if (isMinimized) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: THEME.white,
          border: `2px solid ${THEME.border}`,
          borderRadius: '8px',
          padding: '8px 12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '12px', color: THEME.text }}>
          Debug Log ({logEntries.length} entries)
        </span>
        <button
          onClick={() => setIsMinimized(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
          }}
          title="Restore"
        >
          <Eye size={16} color={THEME.text} />
        </button>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
          }}
          title="Close"
        >
          <X size={16} color={THEME.text} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '600px',
        maxHeight: '70vh',
        background: THEME.white,
        border: `2px solid ${THEME.border}`,
        borderRadius: '12px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${THEME.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: THEME.secondary,
          borderRadius: '12px 12px 0 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: '600', color: THEME.text }}>
            🐛 Debug Logger ({logEntries.length} entries)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setIsMinimized(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="Minimize"
          >
            <EyeOff size={16} color={THEME.text} />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
            }}
            title="Close"
          >
            <X size={16} color={THEME.text} />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div
        style={{
          padding: '8px 16px',
          borderBottom: `1px solid ${THEME.border}`,
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '150px',
            padding: '6px 10px',
            border: `1px solid ${THEME.border}`,
            borderRadius: '6px',
            fontSize: '12px',
          }}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            border: `1px solid ${THEME.border}`,
            borderRadius: '6px',
            fontSize: '12px',
          }}
        >
          <option value="all">All</option>
          <option value="error">Errors</option>
          <option value="warn">Warnings</option>
          <option value="info">Info</option>
          <option value="log">Logs</option>
        </select>
        <button
          onClick={handleCopy}
          style={{
            padding: '6px 12px',
            background: THEME.secondary,
            border: `1px solid ${THEME.border}`,
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
          }}
          title="Copy to clipboard"
        >
          <Copy size={14} />
          Copy
        </button>
        <button
          onClick={handleDownload}
          style={{
            padding: '6px 12px',
            background: THEME.secondary,
            border: `1px solid ${THEME.border}`,
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
          }}
          title="Download as text"
        >
          <Download size={14} />
          Download
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '6px 12px',
            background: THEME.secondary,
            border: `1px solid ${THEME.border}`,
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
          }}
          title="Save as JSON"
        >
          <Save size={14} />
          Save JSON
        </button>
        <button
          onClick={handleClear}
          style={{
            padding: '6px 12px',
            background: THEME.danger,
            color: THEME.white,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
          }}
          title="Clear all logs"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Logs */}
      <div
        ref={logsContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          maxHeight: '50vh',
          fontFamily: 'monospace',
          fontSize: '11px',
          background: '#1E1E1E',
          color: '#D4D4D4',
        }}
      >
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: THEME.textLight }}>
            No logs to display
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              style={{
                marginBottom: '4px',
                padding: '4px 8px',
                borderRadius: '4px',
                background: log.level === 'error' ? 'rgba(220, 53, 69, 0.1)' : 'transparent',
                borderLeft: `3px solid ${getLevelColor(log.level)}`,
              }}
            >
              <span style={{ color: '#808080', marginRight: '8px' }}>
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span
                style={{
                  color: getLevelColor(log.level),
                  fontWeight: '600',
                  marginRight: '8px',
                }}
              >
                [{log.level.toUpperCase()}]
              </span>
              <span style={{ color: '#D4D4D4', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
}

export default DebugLogger;