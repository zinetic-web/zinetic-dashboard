import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { createSslcommerzSession } from "@/lib/sslcommerz";
import { quote } from "@/lib/checkout";
import { studioService } from "@/lib/studio/services";
import { TOOLS } from "@/lib/studio/tools";

export const runtime = "nodejs";

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** A signed-in customer adds an AI Studio service. Same payment as checkout, no new account. */
export async function POST(request: Request) {
  const { user, profile } = await getDashboardSession();
  if (!user || !profile || profile.status !== "approved") return fail("Please sign in again.", 401);

  const body = (await request.json().catch(() => null)) as { service?: string; plan?: string; agreed?: boolean } | null;
  if (!body?.agreed) return fail("You must agree to the Terms, Privacy Policy and Refund Policy to continue.");
  const q = quote(body.service ?? "", body.plan ?? "");
  if (!q || q.product !== "studio") return fail("That plan is not available.");

  const tool = TOOLS.find((t) => t.id === studioService(q.service.id)?.tool);
  const admin = createAdminClient();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const tranId = `zo_${user.id.slice(0, 8)}_${Date.now()}`;

  const { error } = await admin.from("checkout_orders").insert({
    tran_id: tranId,
    user_id: user.id,
    email: profile.email,
    service: q.service.id,
    plan: q.tier.name,
    product: q.product,
    usd_price: q.usdPrice,
    usd_credit: q.usdCredit,
    bdt_amount: q.bdtAmount,
    site_origin: new URL(request.url).origin,
    return_path: tool?.href ?? "/studio/plans",
  });
  if (error) return fail("Could not start the order.", 500);

  const session = await createSslcommerzSession({
    tranId,
    amount: q.bdtAmount,
    customerName: profile.full_name ?? profile.email,
    customerEmail: profile.email,
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
