import { createClient } from "@supabase/supabase-js";

// Set these in frontend/.env locally (see .env.example) and in the Vercel project settings.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!url || !key) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY (see frontend/.env.example)");
}

export const supabase = createClient(url, key);
