import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSslcommerzSession } from "@/lib/sslcommerz";
import { ensureAccount, quote } from "@/lib/checkout";
import { isComingSoon } from "@/lib/landing-services";

export const runtime = "nodejs";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * Starts a paid sign-up. The account is created here but stays pending: nothing is
 * unlocked until the payment has been verified (see lib/checkout.ts finalizeOrder).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    fullName?: string;
    email?: string;
    password?: string;
    service?: string;
    plan?: string;
    agreed?: boolean;
  } | null;

  const fullName = body?.fullName?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  if (!fullName || !email || !password) return fail("Please fill in all fields.");
  if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email address.");
  if (password.length < 8) return fail("Password must be at least 8 characters.");
  if (!body?.agreed) return fail("You must agree to the Terms, Privacy Policy and Refund Policy to continue.");

  if (isComingSoon(body.service ?? "")) return fail("This service is coming soon and cannot be purchased yet.");
  const q = quote(body.service ?? "", body.plan ?? "");
  if (!q) return fail("That plan is not available.");

  const admin = createAdminClient();

  // create the account (pending until paid), or reuse one left behind by an unpaid attempt
  const acct = await ensureAccount({ email, password, fullName });
  if ("error" in acct) return fail(acct.error, acct.error.startsWith("An account") ? 400 : 500);
  const userId = acct.userId;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const tranId = `zo_${userId.slice(0, 8)}_${Date.now()}`;
  const { error: orderError } = await admin.from("checkout_orders").insert({
    tran_id: tranId,
    user_id: userId,
    email,
    service: q.service.id,
    plan: q.tier.name,
    product: q.product,
    usd_price: q.usdPrice,
    usd_credit: q.usdCredit,
    bdt_amount: q.bdtAmount,
    site_origin: new URL(request.url).origin,
  });
  if (orderError) return fail("Could not start the order.", 500);

  const session = await createSslcommerzSession({
    tranId,
    amount: q.bdtAmount,
    customerName: fullName,
    customerEmail: email,
    productName: `${q.service.name} ${q.tier.name}`,
    urls: {
      success: `${appUrl}/api/payments/checkout/success`,
      fail: `${appUrl}/api/payments/checkout/fail`,
      cancel: `${appUrl}/api/payments/checkout/cancel`,
      ipn: `${appUrl}/api/payments/checkout/ipn`,
    },
  });
  if (!session.ok) {
    await admin.from("checkout_orders").update({ status: "failed" }).eq("tran_id", tranId);
    return fail(session.error, 502);
  }
  return NextResponse.json({ gatewayPageUrl: session.gatewayPageUrl });
}
