import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * First-signin-wins owner claim.
 *
 * Called by /auth/callback after Supabase has verified the magic link and
 * put a session on the cookie. Behavior:
 *   - If no owner row exists yet, insert the current user as the owner.
 *   - If the owner row exists and IS the current user, no-op.
 *   - If the owner row exists and is a different user, sign out and return 403.
 *
 * Uses service_role because owner_profile is not writable from the
 * authenticated role.
 */
export async function POST() {
  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { data: existing, error: readError } = await admin
    .from("owner_profile")
    .select("user_id")
    .limit(1)
    .maybeSingle();

  if (readError) {
    console.error("[api/auth/claim] read owner_profile failed:", readError);
    return NextResponse.json({ error: "Could not verify owner status." }, { status: 500 });
  }

  if (!existing) {
    const { error: insertError } = await admin
      .from("owner_profile")
      .insert({ user_id: user.id, email: user.email ?? "" });
    if (insertError) {
      console.error("[api/auth/claim] claim insert failed:", insertError);
      return NextResponse.json({ error: "Could not claim this portal." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, role: "owner", firstClaim: true });
  }

  if (existing.user_id === user.id) {
    return NextResponse.json({ ok: true, role: "owner", firstClaim: false });
  }

  // Someone other than the owner reached the auth callback. Sign them out
  // and tell the caller to redirect to /login with an error.
  await server.auth.signOut();
  return NextResponse.json({ error: "This portal is already claimed." }, { status: 403 });
}
