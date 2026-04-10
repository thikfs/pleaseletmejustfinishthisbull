import { createClient } from "@supabase/supabase-js";

// Support both Vite-exposed env vars and "raw" names some hosts use.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ??
  (import.meta.env as any).SUPABASE_URL ??
  (import.meta.env as any).PUBLIC_SUPABASE_URL) as string | undefined;

const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ??
  (import.meta.env as any).SUPABASE_ANON_KEY ??
  (import.meta.env as any).PUBLIC_SUPABASE_ANON_KEY) as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }
  return supabase;
}
