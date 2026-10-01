import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAccount, signInLink } from "@/lib/checkout";
import { grantEntitlement } from "@/lib/studio/entitlements";
import { TRIALS, TRIAL_PLAN, studioService } from "@/lib/studio/services";
import { TOOLS } from "@/lib/studio/tools";

export const runtime = "nodejs";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * Starts a free trial of one AI Studio service. No payment: the account is approved straight
 * away, given the small trial plan, and signed in on the Studio at that tool.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    fullName?: string;
    email?: string;
    password?: string;
    service?: string;
    agreed?: boolean;
  } | null;

  const fullName = body?.fullName?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  const service = body?.service ?? "";
  if (!fullName || !email || !password) return fail("Please fill in all fields.");
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email address.");
  if (password.length < 8) return fail("Password must be at least 8 characters.");
  if (!body?.agreed) return fail("You must agree to the Terms, Privacy Policy and Refund Policy to continue.");
  if (!studioService(service) || !(service in TRIALS)) return fail("There is no free trial for that service.");

  const acct = await ensureAccount({ email, password, fullName });
  if ("error" in acct) return fail(acct.error, acct.error.startsWith("An account") ? 400 : 500);

  const db = createAdminClient();
  await db.from("profiles").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", acct.userId);
  await db.from("user_products").upsert({ user_id: acct.userId, product: "studio" }, { onConflict: "user_id,product" });
  const granted = await grantEntitlement({ userId: acct.userId, service, plan: TRIAL_PLAN, source: "trial", amount: TRIALS[service], days: null });
  if (granted.error) return fail("Could not start your free trial. Please try again.", 500);

  const tool = TOOLS.find((t) => t.id === studioService(service)?.tool);
  const origin = (process.env.NEXT_PUBLIC_STUDIO_URL ?? "").replace(/\/$/, "");
  const link = await signInLink(email, origin, `${tool?.href ?? "/studio"}?trial=1`);
  return NextResponse.json({ link: link ?? `${origin}/login` });
}
