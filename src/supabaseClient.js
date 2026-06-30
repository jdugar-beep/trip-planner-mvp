import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || supabaseUrl === "your_project_url") {
  throw new Error("Missing VITE_SUPABASE_URL. Add your Supabase project URL before building the app.");
}

if (!supabaseAnonKey || supabaseAnonKey === "your_publishable_or_anon_key") {
  throw new Error("Missing VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY. Add your public Supabase anon/publishable key before building the app.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
