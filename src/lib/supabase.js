import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

// Create a dummy client if credentials are missing to prevent errors
// The app will work in offline mode
let supabase;
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. App will work in offline mode only.');
  // Create a dummy client with placeholder values to prevent errors
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key', {
    auth: {
      persistSession: false,
    },
  });
  // Override methods to prevent actual API calls and handle method chaining
  const dummyQuery = {
    select: () => dummyQuery,
    order: () => dummyQuery,
    eq: () => dummyQuery,
    insert: () => ({ data: null, error: { message: 'Supabase not configured' } }),
    update: () => ({ data: null, error: { message: 'Supabase not configured' } }),
    delete: () => ({ data: null, error: { message: 'Supabase not configured' } }),
    upsert: () => ({ data: null, error: { message: 'Supabase not configured' } }),
    then: (resolve) => resolve({ data: null, error: { message: 'Supabase not configured' } }),
  };
  supabase.from = () => dummyQuery;
  supabase.channel = () => ({
    on: () => supabase.channel(),
    subscribe: () => ({ unsubscribe: () => {} }),
  });
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false, // We're not using auth
    },
  });
}

export { supabase };
export default supabase;
