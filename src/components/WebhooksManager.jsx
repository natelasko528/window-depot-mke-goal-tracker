/**
 * Webhooks Manager Component
 * Create and manage webhooks for event notifications
 */

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';

const WEBHOOK_EVENTS = [
  'daily_log.created',
  'daily_log.updated',
  'appointment.created',
  'appointment.updated',
  'goal.achieved',
  'feed_post.created',
  'user.created',
  'user.updated',
];

export default function WebhooksManager({ userId, currentTheme }) {
  const [webhooks, setWebhooks] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ url: '', events: [] });
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    loadWebhooks();
  }, [userId]);

  const loadWebhooks = async () => {
    try {
      const { data, error } = await supabase
        .from('user_webhooks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks(data || []);
    } catch (error) {
      console.error('Failed to load webhooks:', error);
    }
  };

  const handleCreate = async () => {
    if (!newWebhook.url || newWebhook.events.length === 0) {
      alert('Please provide URL and select at least one event');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_webhooks')
        .insert({
          user_id: userId,
          url: newWebhook.url,
          events: newWebhook.events,
          secret: crypto.randomUUID(),
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      await loadWebhooks();
      setShowCreate(false);
      setNewWebhook({ url: '', events: [] });
    } catch (error) {
      alert(`Failed to create webhook: ${error.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this webhook?')) return;

    try {
      const { error } = await supabase
        .from('user_webhooks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (error) throw error;
      await loadWebhooks();
    } catch (error) {
      alert(`Failed to delete webhook: ${error.message}`);
    }
  };

  const copySecret = async (secret) => {
    await navigator.clipboard.writeText(secret);
    setCopied(secret);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700' }}>Webhooks</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: '10px 20px',
            background: currentTheme.primary,
            color: currentTheme.white,
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '600'
          }}
        >
          <Plus size={18} />
          Create Webhook
        </button>
      </div>

      {showCreate && (
        <div style={{
          background: currentTheme.white,
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          border: `1px solid ${currentTheme.border}`,
          boxShadow: currentTheme.shadows.md
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>New Webhook</h3>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Webhook URL</label>
            <input
              type="url"
              value={newWebhook.url}
              onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
              placeholder="https://example.com/webhook"
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '8px'
              }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Events</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {WEBHOOK_EVENTS.map(event => (
                <label key={event} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newWebhook.events.includes(event)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewWebhook({ ...newWebhook, events: [...newWebhook.events, event] });
                      } else {
                        setNewWebhook({ ...newWebhook, events: newWebhook.events.filter(e => e !== event) });
                      }
                    }}
                  />
                  <span style={{ fontSize: '14px' }}>{event}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleCreate}
              style={{
                padding: '10px 20px',
                background: currentTheme.primary,
                color: currentTheme.white,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              style={{
                padding: '10px 20px',
                background: currentTheme.secondary,
                color: currentTheme.text,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '16px' }}>
        {webhooks.map(webhook => (
          <div
            key={webhook.id}
            style={{
              background: currentTheme.white,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${currentTheme.border}`,
              boxShadow: currentTheme.shadows.md
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>{webhook.url}</h3>
                <div style={{ fontSize: '14px', color: currentTheme.textLight }}>
                  Events: {webhook.events.join(', ')}
                </div>
                {webhook.last_triggered_at && (
                  <div style={{ fontSize: '12px', color: currentTheme.textLight, marginTop: '4px' }}>
                    Last triggered: {new Date(webhook.last_triggered_at).toLocaleString()}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDelete(webhook.id)}
                style={{
                  padding: '6px 12px',
                  background: currentTheme.danger,
                  color: currentTheme.white,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {webhooks.length === 0 && !showCreate && (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: currentTheme.white,
          borderRadius: '12px',
          color: currentTheme.textLight
        }}>
          <p>No webhooks configured. Create one to receive event notifications.</p>
        </div>
      )}
    </div>
  );
}
