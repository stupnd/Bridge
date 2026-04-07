import { createClient } from "@supabase/supabase-js";

const url = "https://ikknzseleljgjrcyxthn.supabase.co"
const key = "sb_publishable_A50E7AdAbDtp1Y2yy5zsmQ__7zdnXO4"

if (!url || !key) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY");
}

export const supabase = createClient(url, key);