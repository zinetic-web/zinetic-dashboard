import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { startTrial } from "@/lib/studio/trial";

export const runtime = "nodejs";

// A signed-in customer starts the shared free trial. Their email is already confirmed
// (they could not sign in otherwise), and a trial can only be started once per account.
export async function POST() {
  const { user, profile } = await getDashboardSession();
  if (!user || !profile || profile.status !== "approved") return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const res = await startTrial(user.id, null);
  if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
  await createAdminClient().from("user_products").upsert({ user_id: user.id, product: "studio" }, { onConflict: "user_id,product" });
  return NextResponse.json({ ok: true });
}
