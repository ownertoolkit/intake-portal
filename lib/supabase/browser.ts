"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Uses the public anon key. Every read/write
 * is gated by RLS on the server, so the anon key is safe to expose here.
 *
 * Owner-authenticated calls carry the user's JWT cookie automatically; RLS
 * policies then evaluate `is_owner()` against that JWT.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "The Vercel–Supabase integration sets these automatically.",
    );
  }
  return createBrowserClient(url, key);
}
