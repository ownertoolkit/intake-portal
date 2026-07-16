import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Magic-link callback. Supabase redirects here with a `code` search param.
 * We exchange it for a session, then run the same claim logic inline (so
 * the entire login is a single round trip — the app never redirects
 * partway through auth).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const server = await createSupabaseServerClient();
  const { error: exchangeError } = await server.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("[auth/callback] exchange failed:", exchangeError);
    return NextResponse.redirect(new URL("/login?error=exchange_failed", request.url));
  }

  const {
    data: { user },
  } = await server.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login?error=no_user", request.url));
  }

  const admin = createSupabaseAdminClient();
  const { data: existing, error: readError } = await admin
    .from("owner_profile")
    .select("user_id")
    .limit(1)
    .maybeSingle();

  if (readError) {
    console.error("[auth/callback] read owner_profile failed:", readError);
    await server.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=lookup_failed", request.url));
  }

  if (!existing) {
    const { error: insertError } = await admin
      .from("owner_profile")
      .insert({ user_id: user.id, email: user.email ?? "" });
    if (insertError) {
      console.error("[auth/callback] claim insert failed:", insertError);
      await server.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=claim_failed", request.url));
    }
  } else if (existing.user_id !== user.id) {
    await server.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=already_claimed", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
