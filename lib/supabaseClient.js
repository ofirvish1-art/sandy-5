import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This only throws in the browser console during dev — it tells you
  // straight away if .env.local is missing, instead of failing silently.
  console.warn(
    "Supabase env vars are missing. Copy .env.local.example to .env.local and fill in your project URL + anon key."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
