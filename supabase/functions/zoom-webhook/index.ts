/**
 * Supabase Edge Function for Zoom Webhook
 * Receives webhook events from Zoom (meeting.created, meeting.updated, meeting.deleted, meeting.started, meeting.ended)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-zm-request-timestamp, x-zm-signature',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get webhook secret from environment (should be set when creating Zoom app)
    const webhookSecret = Deno.env.get('ZOOM_WEBHOOK_SECRET') || '';

    // Get request body as text for signature verification
    const bodyText = await req.text();
    const payload = JSON.parse(bodyText);

    // Zoom webhook structure
    const event = payload.event;
    const eventType = payload.event || payload.eventType;
    const timestamp = req.headers.get('x-zm-request-timestamp') || new Date().toISOString();
    const signature = req.headers.get('x-zm-signature');

    // Verify webhook signature
    if (webhookSecret && signature) {
      if (!validateZoomSignature(bodyText, signature, webhookSecret, timestamp)) {
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Extract event-specific data
    let externalId = null;
    let dataType = 'meeting';
    let eventData = {};

    if (eventType) {
      // Zoom sends events in different formats depending on event type
      eventData = payload.payload?.object || payload.object || payload;
      
      // Extract meeting ID
      if (eventData.id) {
        externalId = String(eventData.id);
      } else if (eventData.uuid) {
        externalId = eventData.uuid;
      }

      // Map event types
      const eventMap: Record<string, string> = {
        'meeting.created': 'meeting',
        'meeting.updated': 'meeting',
        'meeting.deleted': 'meeting',
        'meeting.started': 'meeting',
        'meeting.ended': 'meeting',
      };

      dataType = eventMap[eventType] || 'meeting';
    }

    // Store webhook event in database
    const { error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        source: 'zoom',
        submission_id: externalId, // Reusing submission_id field for meeting ID
        data: {
          event: eventType,
          ...eventData,
        },
        received_at: timestamp,
        processed: false,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error inserting webhook event:', insertError);
    }

    // Update integration sync status for all users with Zoom connected
    // Note: Zoom webhooks don't include user_id, so we update all Zoom integrations
    const { error: updateError } = await supabase
      .from('integration_sync_status')
      .update({
        last_webhook_received: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('integration_type', 'zoom');

    if (updateError) {
      console.error('Error updating sync status:', updateError);
    }

    // For Zoom validation requests (when setting up webhook)
    if (eventType === 'endpoint.url_validation') {
      const plainToken = payload.payload?.plainToken;
      if (plainToken) {
        const encryptedToken = await encryptToken(plainToken, webhookSecret);
        return new Response(
          JSON.stringify({
            plainToken: encryptedToken,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook received',
        event: eventType,
        meetingId: externalId,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Validate Zoom webhook signature
 * @param {string} body - Request body as string
 * @param {string} signature - Signature from x-zm-signature header
 * @param {string} secret - Webhook secret
 * @param {string} timestamp - Timestamp from x-zm-request-timestamp header
 * @returns {boolean} True if signature is valid
 */
function validateZoomSignature(body: string, signature: string, secret: string, timestamp: string): boolean {
  try {
    // Zoom signature format: HMAC-SHA256 hash of the request body
    // Signature is in format: version=0&signature=<hash>
    const encoder = new TextEncoder();
    const message = encoder.encode(`v0:${timestamp}:${body}`);
    
    // Use Web Crypto API for HMAC
    // Note: This is a simplified version - actual implementation needs proper HMAC
    // For production, use a proper crypto library
    
    // For now, return true if secret is set (validation should be implemented properly)
    return true; // Placeholder - implement proper HMAC validation
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

/**
 * Encrypt token for Zoom URL validation
 * @param {string} plainToken - Plain token from Zoom
 * @param {string} secret - Webhook secret
 * @returns {Promise<string>} Encrypted token
 */
async function encryptToken(plainToken: string, secret: string): Promise<string> {
  // Zoom uses HMAC-SHA256 for token encryption
  // This is a placeholder - implement proper HMAC
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(plainToken);
    
    // Use Web Crypto API (simplified)
    // For production, implement proper HMAC-SHA256
    return plainToken; // Placeholder
  } catch (error) {
    console.error('Token encryption error:', error);
    return plainToken;
  }
}
