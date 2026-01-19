/**
 * REST API Edge Function
 * Main entry point for API requests
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getAuthenticatedUser, checkRateLimit, createErrorResponse, createSuccessResponse } from './_shared/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/functions/v1/api', '');

    // Health check (no auth required)
    if (path === '/health' && req.method === 'GET') {
      return createSuccessResponse({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Authenticate request
    const auth = await getAuthenticatedUser(req);
    if (!auth) {
      return createErrorResponse('Unauthorized: Invalid or missing API key', 401);
    }

    // Rate limiting (100 requests per minute per key)
    if (!checkRateLimit(auth.keyId, 100, 60000)) {
      return createErrorResponse('Rate limit exceeded', 429);
    }

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Route requests
    let response: Response;

    // Users endpoints
    if (path.startsWith('/v1/users')) {
      response = await handleUsersRequest(req, supabase, auth, path);
    }
    // Daily logs endpoints
    else if (path.startsWith('/v1/daily-logs')) {
      response = await handleDailyLogsRequest(req, supabase, auth, path);
    }
    // Appointments endpoints
    else if (path.startsWith('/v1/appointments')) {
      response = await handleAppointmentsRequest(req, supabase, auth, path);
    }
    // Webhooks endpoints
    else if (path.startsWith('/v1/webhooks')) {
      response = await handleWebhooksRequest(req, supabase, auth, path);
    }
    // Unknown endpoint
    else {
      response = createErrorResponse('Not found', 404);
    }

    // Add CORS headers to response
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('API error:', error);
    return createErrorResponse(error.message || 'Internal server error', 500);
  }
});

// Users handlers
async function handleUsersRequest(
  req: Request,
  supabase: any,
  auth: { userId: string },
  path: string
): Promise<Response> {
  // GET /v1/users - List users
  if (path === '/v1/users' && req.method === 'GET') {
    const { data, error } = await supabase.from('users').select('*').order('name');

    if (error) {
      return createErrorResponse(`Database error: ${error.message}`, 500);
    }

    return createSuccessResponse({
      users: data || [],
      count: (data || []).length,
    });
  }

  // GET /v1/users/:id - Get user
  const userMatch = path.match(/^\/v1\/users\/([^\/]+)$/);
  if (userMatch && req.method === 'GET') {
    const userId = userMatch[1];
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

    if (error) {
      return createErrorResponse('User not found', 404);
    }

    return createSuccessResponse(data);
  }

  // PUT /v1/users/:id/goals - Update user goals
  const goalsMatch = path.match(/^\/v1\/users\/([^\/]+)\/goals$/);
  if (goalsMatch && req.method === 'PUT') {
    const userId = goalsMatch[1];
    const body = await req.json();

    const { data, error } = await supabase
      .from('users')
      .update({ goals: body.goals })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return createErrorResponse(`Failed to update goals: ${error.message}`, 500);
    }

    return createSuccessResponse(data);
  }

  return createErrorResponse('Not found', 404);
}

// Daily logs handlers
async function handleDailyLogsRequest(
  req: Request,
  supabase: any,
  auth: { userId: string },
  path: string
): Promise<Response> {
  // GET /v1/daily-logs - List daily logs
  if (path === '/v1/daily-logs' && req.method === 'GET') {
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    const date = url.searchParams.get('date');

    let query = supabase.from('daily_logs').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (date) {
      query = query.eq('date', date);
    }

    query = query.order('date', { ascending: false }).limit(100);

    const { data, error } = await query;

    if (error) {
      return createErrorResponse(`Database error: ${error.message}`, 500);
    }

    return createSuccessResponse({
      daily_logs: data || [],
      count: (data || []).length,
    });
  }

  // POST /v1/daily-logs - Create daily log
  if (path === '/v1/daily-logs' && req.method === 'POST') {
    const body = await req.json();

    const { data, error } = await supabase
      .from('daily_logs')
      .insert({
        user_id: body.user_id || auth.userId,
        date: body.date || new Date().toISOString().split('T')[0],
        reviews: body.reviews || 0,
        demos: body.demos || 0,
        callbacks: body.callbacks || 0,
      })
      .select()
      .single();

    if (error) {
      return createErrorResponse(`Failed to create daily log: ${error.message}`, 500);
    }

    return createSuccessResponse(data, 201);
  }

  return createErrorResponse('Not found', 404);
}

// Appointments handlers
async function handleAppointmentsRequest(
  req: Request,
  supabase: any,
  auth: { userId: string },
  path: string
): Promise<Response> {
  // GET /v1/appointments - List appointments
  if (path === '/v1/appointments' && req.method === 'GET') {
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    let query = supabase.from('appointments').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (startDate) {
      query = query.gte('appointment_date', startDate);
    }
    if (endDate) {
      query = query.lte('appointment_date', endDate);
    }

    query = query.order('appointment_date', { ascending: false }).limit(100);

    const { data, error } = await query;

    if (error) {
      return createErrorResponse(`Database error: ${error.message}`, 500);
    }

    return createSuccessResponse({
      appointments: data || [],
      count: (data || []).length,
    });
  }

  // POST /v1/appointments - Create appointment
  if (path === '/v1/appointments' && req.method === 'POST') {
    const body = await req.json();

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        user_id: body.user_id || auth.userId,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        customer_email: body.customer_email,
        appointment_date: body.appointment_date,
        product_interests: body.product_interests || [],
        notes: body.notes,
      })
      .select()
      .single();

    if (error) {
      return createErrorResponse(`Failed to create appointment: ${error.message}`, 500);
    }

    return createSuccessResponse(data, 201);
  }

  return createErrorResponse('Not found', 404);
}

// Webhooks handlers
async function handleWebhooksRequest(
  req: Request,
  supabase: any,
  auth: { userId: string },
  path: string
): Promise<Response> {
  // GET /v1/webhooks - List webhooks
  if (path === '/v1/webhooks' && req.method === 'GET') {
    const { data, error } = await supabase
      .from('user_webhooks')
      .select('id, url, events, status, last_triggered_at, created_at')
      .eq('user_id', auth.userId);

    if (error) {
      return createErrorResponse(`Database error: ${error.message}`, 500);
    }

    return createSuccessResponse({
      webhooks: data || [],
      count: (data || []).length,
    });
  }

  // POST /v1/webhooks - Create webhook
  if (path === '/v1/webhooks' && req.method === 'POST') {
    const body = await req.json();

    // Generate secret
    const secret = crypto.randomUUID();

    const { data, error } = await supabase
      .from('user_webhooks')
      .insert({
        user_id: auth.userId,
        url: body.url,
        events: body.events || [],
        secret,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      return createErrorResponse(`Failed to create webhook: ${error.message}`, 500);
    }

    // Return webhook without secret in response
    const { secret: _, ...webhookData } = data;
    return createSuccessResponse({ ...webhookData, secret }, 201); // Include secret only on creation
  }

  // DELETE /v1/webhooks/:id - Delete webhook
  const webhookMatch = path.match(/^\/v1\/webhooks\/([^\/]+)$/);
  if (webhookMatch && req.method === 'DELETE') {
    const webhookId = webhookMatch[1];

    const { error } = await supabase
      .from('user_webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('user_id', auth.userId); // Ensure user owns the webhook

    if (error) {
      return createErrorResponse(`Failed to delete webhook: ${error.message}`, 500);
    }

    return createSuccessResponse({ success: true });
  }

  return createErrorResponse('Not found', 404);
}
