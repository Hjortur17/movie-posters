import { createClient } from "@supabase/supabase-js";

const getSupabaseUrl = (): string | null => {
  return (
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null
  );
};

const getSupabaseAnonKey = (): string | null => {
  return (
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    null
  );
};

// Only create Supabase client if credentials are available
const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseAnonKey();

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
