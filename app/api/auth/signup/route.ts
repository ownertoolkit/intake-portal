import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { validateEmail, validatePassword } from "@/lib/auth/passwords";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  email?: string;
  password?: string;
}

/**
 * POST /api/auth/signup
 *
 * Claims this portal as owner. First person to complete this call becomes
 * the permanent owner; subsequent calls are rejected.
 *
 * Flow:
 *   1. Validate email + password server-side (belt-and-suspenders).
 *   2. Check owner_profile is empty via service_role.
 *   3. If empty:
 *        - Create the auth user with email_confirm: true (no email round-trip).
 *        - Insert the owner_profile row pointing at the new user.
 *        - Sign the user in via the SSR client so the session cookie lands
 *          on the response before we return.
 *      If not empty: return 403.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const password = body.password ?? "";

  const emailCheck = validateEmail(email);
  if (!emailCheck.ok) {
    return NextResponse.json({ error: emailCheck.message }, { status: 400 });
  }
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) {
    return NextResponse.json({ error: passwordCheck.message }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: existingOwner, error: readErr } = await admin
    .from("owner_profile")
    .select("user_id")
    .limit(1)
    .maybeSingle();

  if (readErr) {
    console.error("[api/auth/signup] read owner_profile failed:", readErr);
    return NextResponse.json({ error: "Could not verify owner status." }, { status: 500 });
  }

  if (existingOwner) {
    return NextResponse.json(
      { error: "This portal already has an owner. Sign in with that email instead." },
      { status: 403 },
    );
  }

  // Create the auth user with email pre-confirmed (no email round-trip).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    console.error("[api/auth/signup] createUser failed:", createErr);
    const message =
      createErr?.message?.includes("already registered") || createErr?.message?.includes("exists")
        ? "An account with that email already exists. Try signing in instead."
        : "Could not create your account. Please try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Race safety: between our "empty?" check and the insert, another request
  // might have claimed ownership. If the insert fails on the unique
  // constraint, delete the user we just created and return 403.
  const { error: profileErr } = await admin
    .from("owner_profile")
    .insert({ user_id: created.user.id, email });

  if (profileErr) {
    console.error("[api/auth/signup] owner_profile insert failed:", profileErr);
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {
      /* best effort — the account will be orphaned if this also fails */
    });
    return NextResponse.json(
      { error: "This portal was just claimed. Please sign in instead." },
      { status: 409 },
    );
  }

  // Sign the new owner in so the session cookie is set on the response.
  const server = await createSupabaseServerClient();
  const { error: signInErr } = await server.auth.signInWithPassword({ email, password });
  if (signInErr) {
    console.error("[api/auth/signup] auto sign-in failed:", signInErr);
    return NextResponse.json(
      { error: "Account created — please sign in with your new password." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
