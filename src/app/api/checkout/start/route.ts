import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSslcommerzSession } from "@/lib/sslcommerz";
import { quote } from "@/lib/checkout";
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
  let userId = "";
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (created.data?.user) {
    userId = created.data.user.id;
  } else {
    const { data: existing } = await admin.from("profiles").select("id, status").eq("email", email).maybeSingle();
    if (!existing) return fail(created.error?.message ?? "Could not create your account.", 500);
    const { count: paid } = await admin
      .from("checkout_orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", existing.id)
      .eq("status", "paid");
    if (existing.status !== "pending" || (paid ?? 0) > 0) {
      return fail("An account with this email already exists. Log in to your account instead.");
    }
    await admin.auth.admin.updateUserById(existing.id, { password, user_metadata: { full_name: fullName } });
    userId = existing.id;
  }
  await admin.from("profiles").update({ full_name: fullName }).eq("id", userId);

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const tranId = `zo_${userId.slice(0, 8)}_${Date.now()}`;
  const { error: orderError } = await admin.from("checkout_orders").insert({
    tran_id: tranId,
    user_id: userId,
    email,
    service: q.service.id,
    plan: q.plan,
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
    productName: `${q.service.name} ${q.label}`,
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
