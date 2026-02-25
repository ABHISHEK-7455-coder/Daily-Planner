import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Dev-time guard ────────────────────────────────────────────
if (import.meta.env.DEV) {
  if (!supabaseUrl || supabaseUrl.includes("your-project-ref")) {
    console.error(
      "%c⛔ VITE_SUPABASE_URL is missing!\n" +
      "1. Go to supabase.com → your project → Settings → API\n" +
      "2. Copy Project URL\n" +
      "3. Add to .env: VITE_SUPABASE_URL=https://xxxx.supabase.co\n" +
      "4. Restart dev server: npm run dev",
      "color:red;font-weight:bold;font-size:13px"
    );
  }
  if (!supabaseAnonKey || supabaseAnonKey.includes("your-anon")) {
    console.error(
      "%c⛔ VITE_SUPABASE_ANON_KEY is missing!\n" +
      "1. Go to supabase.com → your project → Settings → API\n" +
      "2. Copy 'anon public' key\n" +
      "3. Add to .env: VITE_SUPABASE_ANON_KEY=eyJhbGci...\n" +
      "4. Restart dev server: npm run dev",
      "color:red;font-weight:bold;font-size:13px"
    );
  }
  console.log(
    "[Supabase] URL:", supabaseUrl ? supabaseUrl.slice(0, 35) + "..." : "❌ MISSING",
    "\n[Supabase] Key:", supabaseAnonKey ? supabaseAnonKey.slice(0, 20) + "..." : "❌ MISSING"
  );
}

export const supabase = createClient(
  supabaseUrl     || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);