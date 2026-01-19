/**
 * Supabase Edge Function for Jotform Webhook
 * Receives form submission events from Jotform and updates the database
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
    
    // Jotform webhook sends data in specific format
    // Adjust based on actual Jotform webhook payload structure
    const formId = payload.formID || payload.form_id;
    const submissionId = payload.submissionID || payload.submission_id;
    const submissionData = payload.rawRequest || payload.data || {};
    const timestamp = payload.createdAt || payload.created_at || new Date().toISOString();

    // Validate webhook (optional: add signature validation)
    // const signature = req.headers.get('x-jotform-signature');
    // if (!validateSignature(payload, signature)) {
    //   return new Response(
    //     JSON.stringify({ error: 'Invalid signature' }),
    //     { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    //   );
    // }

    // Store webhook event in database
    // Note: You may need to create a webhook_events table in Supabase
    const { error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        source: 'jotform',
        form_id: formId,
        submission_id: submissionId,
        data: submissionData,
        received_at: timestamp,
        processed: false,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error inserting webhook event:', insertError);
      // If table doesn't exist, log the event instead
      console.log('Jotform webhook event:', {
        formId,
        submissionId,
        data: submissionData,
        timestamp,
      });
    }

    // Update integration sync status for users with Jotform connected
    // This triggers a real-time update that clients can listen to
    const { error: updateError } = await supabase
      .from('integration_sync_status')
      .upsert({
        integration_type: 'jotform',
        last_webhook_received: new Date().toISOString(),
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'integration_type',
      });

    if (updateError) {
      console.error('Error updating sync status:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook received',
        formId,
        submissionId,
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
 * Validate Jotform webhook signature (optional)
 * @param {object} payload - Webhook payload
 * @param {string} signature - Signature from header
 * @returns {boolean} True if signature is valid
 */
function validateSignature(payload, signature) {
  // Implement signature validation if Jotform provides it
  // This is a placeholder - adjust based on Jotform's signature method
  return true; // For now, accept all requests
}
