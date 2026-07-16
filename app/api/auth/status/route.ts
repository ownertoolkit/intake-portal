import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/auth/status
 *
 * Answers two questions for the /login page:
 *   - hasOwner: does this portal already have a claimed owner?
 *              (used to decide whether to show "Create owner account" or
 *              "Sign in")
 *   - isOwner: is the currently authenticated user the owner?
 *              (used after signin to decide whether to allow into the
 *              dashboard or bounce with a "portal is claimed by someone
 *              else" message)
 */
export async function GET() {
  const admin = createSupabaseAdminClient();
  const server = await createSupabaseServerClient();

  const [{ data: ownerRow, error: ownerErr }, { data: userData }] = await Promise.all([
    admin.from("owner_profile").select("user_id").limit(1).maybeSingle(),
    server.auth.getUser(),
  ]);

  if (ownerErr) {
    console.error("[api/auth/status] read owner_profile failed:", ownerErr);
    return NextResponse.json({ error: "Could not read owner status." }, { status: 500 });
  }

  const hasOwner = Boolean(ownerRow);
  const currentUserId = userData.user?.id ?? null;
  const isOwner = Boolean(ownerRow && currentUserId && ownerRow.user_id === currentUserId);

  return NextResponse.json({ hasOwner, isOwner });
}
