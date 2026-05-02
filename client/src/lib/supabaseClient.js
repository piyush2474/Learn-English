import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let client = null;

export function isSupabaseConfigured() {
  return Boolean(url && anonKey && typeof url === 'string' && typeof anonKey === 'string');
}

/**
 * Browser client for Storage only. Use RLS policies on the bucket (see mediaUpload.js header).
 */
export function getSupabase() {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return client;
}
