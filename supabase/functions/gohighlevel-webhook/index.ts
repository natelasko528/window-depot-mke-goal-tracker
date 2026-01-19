/**
 * Supabase Edge Function for GoHighLevel Webhook
 * Receives webhook events from GoHighLevel (Contact.Create, Contact.Update, AppointmentCreate, OpportunityCreate)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Parse webhook payload
    const payload = await req.json();
    
    // GoHighLevel webhook structure
    const eventType = payload.type;
    const locationId = payload.locationId || payload.location_id;
    const timestamp = new Date().toISOString();

    // Extract event-specific data
    let externalId = null;
    let dataType = null;
    let eventData = {};

    switch (eventType) {
      case 'Contact.Create':
      case 'Contact.Update':
        externalId = payload.contact?.id;
        dataType = 'contact';
        eventData = payload.contact || {};
        break;
      case 'AppointmentCreate':
      case 'Appointment.Update':
        externalId = payload.appointment?.id;
        dataType = 'appointment';
        eventData = payload.appointment || {};
        break;
      case 'OpportunityCreate':
      case 'Opportunity.Update':
        externalId = payload.opportunity?.id;
        dataType = 'opportunity';
        eventData = payload.opportunity || {};
        break;
      default:
        // Unknown event type - still store it
        eventData = payload;
    }

    // Validate webhook signature (if GoHighLevel provides it)
    // const signature = req.headers.get('x-ghl-signature');
    // if (!validateSignature(payload, signature)) {
    //   return new Response(
    //     JSON.stringify({ error: 'Invalid signature' }),
    //     { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    //   );
    // }

    // Store webhook event in database
    const { error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        source: 'gohighlevel',
        form_id: locationId, // Reusing form_id field for locationId
        submission_id: externalId,
        data: {
          type: eventType,
          locationId,
          ...eventData,
        },
        received_at: timestamp,
        processed: false,
        created_at: timestamp,
      });

    if (insertError) {
      console.error('Error inserting webhook event:', insertError);
    }

    // Update integration sync status for users with GoHighLevel connected at this location
    // Note: This requires matching locationId, which should be stored in integration_sync_status
    if (locationId) {
      const { error: updateError } = await supabase
        .from('integration_sync_status')
        .update({
          last_webhook_received: timestamp,
          updated_at: timestamp,
        })
        .eq('integration_type', 'gohighlevel')
        .eq('location_id', locationId);

      if (updateError) {
        console.error('Error updating sync status:', updateError);
      }
    }

    // If we have external ID and data type, also update integration_data
    if (externalId && dataType) {
      // Get user_id from locationId mapping (this would need to be stored elsewhere)
      // For now, we'll just store the event and let sync handle the data update
      console.log(`Received ${eventType} for ${dataType} ${externalId}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook received',
        eventType,
        locationId,
        externalId,
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
 * Validate GoHighLevel webhook signature (placeholder)
 * @param {object} payload - Webhook payload
 * @param {string} signature - Signature from header
 * @returns {boolean} True if signature is valid
 */
function validateSignature(payload, signature) {
  // Implement signature validation if GoHighLevel provides it
  // This is a placeholder - adjust based on GoHighLevel's signature method
  return true; // For now, accept all requests
}
