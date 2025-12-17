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
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    null
  );
};

// Only create Supabase client if credentials are available
const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseAnonKey();

if (!supabaseUrl || !supabaseKey) {
  if (typeof window === "undefined") {
    // Server-side: log warning
    console.warn(
      "Supabase not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY environment variables."
    );
  }
}

export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
