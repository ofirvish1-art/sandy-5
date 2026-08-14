import { createClient } from "@supabase/supabase-js"
import type { Database } from "./types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaces immediately in the browser console if .env.local is missing,
  // instead of failing later with an opaque fetch error.
  console.warn(
    "Supabase env vars are missing. Copy .env.local.example to .env.local and fill in the project URL + anon key.",
  )
}

export const supabase = createClient<Database>(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const SUPABASE_CONFIGURED = Boolean(supabaseUrl && supabaseAnonKey)
