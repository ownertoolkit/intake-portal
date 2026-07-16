import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Server-side Supabase client scoped to the current request's cookies.
 * Uses the public anon key + the caller's session, so RLS applies as the
 * authenticated user (or anonymously if no session).
 *
 * For operations that need to bypass RLS (owner claim, inquiry insertion,
 * signing upload URLs), use lib/supabase/admin.ts instead.
 */
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "The Vercel–Supabase integration sets these automatically.",
    );
  }
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookies are read-only.
          // The middleware refreshes the session cookies on every request,
          // so this is safe to ignore in that context.
        }
      },
    },
  });
}
