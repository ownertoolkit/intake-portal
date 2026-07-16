import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service_role key. Bypasses RLS.
 *
 * This module MUST NOT be imported into any component or file that ends up
 * in the browser bundle. It is used only by:
 *   - /api/inquiries         (insert new inquiry, sign upload URLs)
 *   - /api/auth/claim        (first-signin-wins owner enforcement)
 *
 * The service_role key never appears in a NEXT_PUBLIC_ variable.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  }
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. This is set automatically by the " +
        "Vercel–Supabase integration and MUST stay server-only (no NEXT_PUBLIC_ prefix).",
    );
  }
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
