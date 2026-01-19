/**
 * Webhook Dispatcher Edge Function
 * Receives events and dispatches them to subscribed webhooks with signing and retry logic
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Initial delay, doubles with each retry

/**
 * Sign webhook payload with HMAC-SHA256
 */
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Deliver webhook with retry logic
 */
async function deliverWebhook(
  webhook: any,
  eventType: string,
  payload: any,
  attempt: number = 1
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const payloadString = JSON.stringify(payload);
    const signature = await signPayload(payloadString, webhook.secret);
    const timestamp = Date.now();

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': eventType,
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': timestamp.toString(),
        'X-Webhook-Id': webhook.id,
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const success = response.ok;
    const status = response.status;

    if (!success && attempt < MAX_RETRIES) {
      // Retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)));
      return await deliverWebhook(webhook, eventType, payload, attempt + 1);
    }

    return { success, status, error: success ? undefined : `HTTP ${status}` };
  } catch (error) {
    if (attempt < MAX_RETRIES) {
      // Retry on network errors
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt - 1)));
      return await deliverWebhook(webhook, eventType, payload, attempt + 1);
    }
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse event
    const { event_type, user_id, payload, source } = await req.json();

    if (!event_type || !payload) {
      return new Response(
        JSON.stringify({ error: 'Missing event_type or payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find webhooks subscribed to this event
    const { data: webhooks, error } = await supabase
      .from('user_webhooks')
      .select('*')
      .eq('status', 'active')
      .contains('events', [event_type]);

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Database error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter by user_id if provided
    const filteredWebhooks = user_id
      ? (webhooks || []).filter((w: any) => w.user_id === user_id)
      : webhooks || [];

    if (filteredWebhooks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No webhooks subscribed to this event',
          delivered: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deliver to all subscribed webhooks
    const deliveryResults = await Promise.allSettled(
      filteredWebhooks.map(async (webhook: any) => {
        const result = await deliverWebhook(webhook, event_type, payload);
        
        // Log delivery
        await supabase.from('webhook_delivery_logs').insert({
          webhook_id: webhook.id,
          event_type,
          payload,
          response_status: result.status,
          success: result.success,
          error_message: result.error,
          delivery_time_ms: 0, // Could track this if needed
        });

        // Update webhook stats
        const updateData: any = {
          last_triggered_at: new Date().toISOString(),
        };

        if (result.success) {
          // Reset failure count on success
          if (webhook.failure_count > 0) {
            updateData.failure_count = 0;
          }
        } else {
          // Increment failure count
          updateData.failure_count = (webhook.failure_count || 0) + 1;

          // Disable webhook after 10 consecutive failures
          if (updateData.failure_count >= 10) {
            updateData.status = 'disabled';
          }
        }

        await supabase
          .from('user_webhooks')
          .update(updateData)
          .eq('id', webhook.id);

        return { webhook_id: webhook.id, ...result };
      })
    );

    const successful = deliveryResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = deliveryResults.length - successful;

    return new Response(
      JSON.stringify({
        success: true,
        event_type,
        delivered: successful,
        failed,
        total: deliveryResults.length,
        results: deliveryResults.map(r =>
          r.status === 'fulfilled' ? r.value : { error: r.reason }
        ),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook dispatcher error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
