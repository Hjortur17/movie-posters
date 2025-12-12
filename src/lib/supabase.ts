import { createClient } from "@supabase/supabase-js";

const getSupabaseUrl = (): string => {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    throw new Error("SUPABASE_URL is not set");
  }
  return url;
};

const getSupabaseAnonKey = (): string => {
  const key = process.env.SUPABASE_ANON_KEY;
  if (!key) {
    throw new Error("SUPABASE_ANON_KEY is not set");
  }
  return key;
};

export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
