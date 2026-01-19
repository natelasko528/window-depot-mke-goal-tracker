/**
 * API Authentication Utilities
 * Validates API keys and provides user context
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Hash API key for storage comparison
 */
async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Extract API key from Authorization header
 */
export function extractApiKey(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Validate API key and return user context
 */
export async function validateApiKey(apiKey: string): Promise<{
  valid: boolean;
  userId?: string;
  keyId?: string;
  error?: string;
}> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Hash the provided key
    const keyHash = await hashApiKey(apiKey);

    // Look up key in database
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, user_id, expires_at, name')
      .eq('key_hash', keyHash)
      .single();

    if (error || !data) {
      return {
        valid: false,
        error: 'Invalid API key',
      };
    }

    // Check if key is expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return {
        valid: false,
        error: 'API key expired',
      };
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    return {
      valid: true,
      userId: data.user_id,
      keyId: data.id,
    };
  } catch (error) {
    console.error('API key validation error:', error);
    return {
      valid: false,
      error: 'Authentication error',
    };
  }
}

/**
 * Get authenticated user from request
 */
export async function getAuthenticatedUser(
  request: Request
): Promise<{ userId: string; keyId: string } | null> {
  const authHeader = request.headers.get('Authorization');
  const apiKey = extractApiKey(authHeader);

  if (!apiKey) {
    return null;
  }

  const validation = await validateApiKey(apiKey);
  if (!validation.valid || !validation.userId) {
    return null;
  }

  return {
    userId: validation.userId,
    keyId: validation.keyId || '',
  };
}

/**
 * Rate limiting storage (simple in-memory, consider Redis for production)
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check rate limit for API key
 */
export function checkRateLimit(keyId: string, limit: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(keyId);

  if (!record || now > record.resetAt) {
    // New window
    rateLimitStore.set(keyId, {
      count: 1,
      resetAt: now + windowMs,
    });
    return true;
  }

  if (record.count >= limit) {
    return false; // Rate limited
  }

  record.count++;
  return true;
}

/**
 * Create error response
 */
export function createErrorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({
      error: message,
      status,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Create success response
 */
export function createSuccessResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
