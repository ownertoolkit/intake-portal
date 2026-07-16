"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Uses the public anon key. Every read/write
 * is gated by RLS on the server, so the anon key is safe to expose here.
 *
 * Owner-authenticated calls carry the user's JWT cookie automatically; RLS
 * policies then evaluate `is_owner()` against that JWT.
 *
 * Missing env vars are tolerated at construction time so Next.js can
 * statically prerender client-component pages during a first build before
 * the Vercel–Supabase integration has set the vars. Actual network calls
 * still fail loudly at runtime — the placeholder URL does not resolve.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  return createBrowserClient(url, key);
}
