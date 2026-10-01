import { createAdminClient } from "@/lib/supabase/admin";
import { validateSslcommerzTransaction } from "@/lib/sslcommerz";
import { SERVICES, isComingSoon } from "@/lib/landing-services";
import { CHECK_PRICE, PRICING_PLANS } from "@/lib/pricing-plans";
import { grantEntitlement } from "@/lib/studio/entitlements";
import { studioService } from "@/lib/studio/services";
import { TOOLS } from "@/lib/studio/tools";

const RATE = Number(process.env.NEXT_PUBLIC_USD_TO_BDT_RATE ?? 122);

export type CheckoutProduct = "cms" | "studio" | "distribution";

/** Which dashboard a purchased service belongs to. */
export function productFor(serviceId: string): CheckoutProduct {
  if (serviceId === "mcn-checker") return "cms";
  if (serviceId === "distribution") return "distribution";
  return "studio";
}

/**
 * The price is always worked out here from the service catalog, never taken from
 * the browser. usdCredit is what lands in the wallet: the face value of the
 * checks for a checker bundle (the discount is the bonus), otherwise what was paid.
 */
export function quote(serviceId: string, planName: string) {
  if (isComingSoon(serviceId)) return null;
  const service = SERVICES.find((s) => s.id === serviceId);
  const tier = service?.tiers.find((t) => t.name === planName);
  if (!service || !tier) return null;

  const bundle = serviceId === "mcn-checker" ? PRICING_PLANS.find((p) => p.label === tier.name) : undefined;
  const usdCredit = bundle ? bundle.checks * CHECK_PRICE : tier.price;
  return {
    service,
    tier,
    usdPrice: tier.price,
    usdCredit,
    bdtAmount: Math.round(tier.price * RATE * 100) / 100,
    product: productFor(serviceId),
  };
}

type Order = {
  id: string;
  tran_id: string;
  user_id: string | null;
  email: string;
  service: string;
  plan: string;
  product: CheckoutProduct;
  usd_credit: number;
  bdt_amount: number;
  status: string;
  site_origin: string | null;
  return_path: string | null;
  finalized_at: string | null;
};

export async function getOrder(tranId: string): Promise<Order | null> {
  const { data } = await createAdminClient().from("checkout_orders").select("*").eq("tran_id", tranId).maybeSingle();
  return (data as Order | null) ?? null;
}

export type FinalizeResult = { ok: true; order: Order } | { ok: false; held?: boolean; error: string; order?: Order };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Confirms a payment with SSLCommerz and, only then, approves the account,
 * unlocks the dashboard and credits the wallet. Safe to call twice (the browser
 * redirect and the server notification both arrive): one caller does the work,
 * the other waits for it.
 */
export async function finalizeOrder(tranId: string, valId: string, raw: Record<string, unknown>): Promise<FinalizeResult> {
  const admin = createAdminClient();
  const order = await getOrder(tranId);
  if (!order) return { ok: false, error: "Unknown order." };

  if (order.status === "paid") return waitForFinalized(tranId);

  const v = await validateSslcommerzTransaction(valId);
  if (!v.ok) {
    await admin.from("checkout_orders").update({ status: "failed", raw_ipn: raw }).eq("id", order.id).in("status", ["pending", "held"]);
    return { ok: false, error: v.error, order };
  }
  if (v.tranId !== tranId || Math.abs(v.amount - Number(order.bdt_amount)) > 0.01) {
    await admin.from("checkout_orders").update({ status: "failed", raw_ipn: raw }).eq("id", order.id).in("status", ["pending", "held"]);
    return { ok: false, error: "The payment did not match the order.", order };
  }
  // SSLCommerz flags some payments for manual review: hold them instead of unlocking
  if (v.riskLevel === "1") {
    await admin.from("checkout_orders").update({ status: "held", val_id: valId, card_type: v.cardType, raw_ipn: raw }).eq("id", order.id).eq("status", "pending");
    return { ok: false, held: true, error: "Your payment is being reviewed.", order };
  }

  // only one caller gets to flip pending to paid, that caller does the grants
  const { data: claimed } = await admin
    .from("checkout_orders")
    .update({ status: "paid", val_id: valId, card_type: v.cardType, raw_ipn: raw, paid_at: new Date().toISOString() })
    .eq("id", order.id)
    .in("status", ["pending", "held"])
    .select("id");
  if (!claimed || claimed.length === 0) return waitForFinalized(tranId);

  if (!order.user_id) return { ok: false, error: "The order has no account.", order };

  await admin.from("profiles").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", order.user_id);
  await admin.from("user_products").upsert({ user_id: order.user_id, product: order.product }, { onConflict: "user_id,product" });
  if (order.product === "studio") {
    // AI Studio sells the service itself: record exactly what was bought, it is deducted as it is used
    await grantEntitlement({ userId: order.user_id, service: order.service, plan: order.plan, source: "purchase", orderId: order.id });
  } else {
    // the Channel Checker keeps its credit wallet
    await admin.rpc("wallet_topup", {
      p_user: order.user_id,
      p_usd: Number(order.usd_credit),
      p_note: `Plan purchase: ${order.plan} (${order.service})`,
    });
  }
  await admin.from("checkout_orders").update({ finalized_at: new Date().toISOString() }).eq("id", order.id);

  return { ok: true, order: { ...order, status: "paid" } };
}

async function waitForFinalized(tranId: string): Promise<FinalizeResult> {
  for (let i = 0; i < 20; i++) {
    const o = await getOrder(tranId);
    if (o?.finalized_at) return { ok: true, order: o };
    await wait(300);
  }
  const o = await getOrder(tranId);
  return o ? { ok: true, order: o } : { ok: false, error: "Unknown order." };
}

/** Where a paid customer lands, and which host it is on. */
export function destinationFor(order: Order): { origin: string; path: string } | null {
  const strip = (u?: string) => (u ?? "").replace(/\/$/, "");
  if (order.product === "cms") return { origin: strip(process.env.NEXT_PUBLIC_APP_URL), path: "/dashboard" };
  if (order.product === "studio") {
    // straight to the tool they bought
    const tool = TOOLS.find((t) => t.id === studioService(order.service)?.tool);
    return { origin: strip(process.env.NEXT_PUBLIC_STUDIO_URL), path: `${tool?.href ?? "/studio"}?payment=success` };
  }
  return null;
}

/**
 * A one-time sign-in link for the paid customer, so they arrive already logged in
 * on the dashboard's own domain. It is single use and expires, and only ever
 * built after the payment has been verified.
 */
export async function signInLink(email: string, origin: string, path: string): Promise<string | null> {
  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email });
  const token = data?.properties?.hashed_token;
  if (error || !token) return null;
  return `${origin}/auth/confirm?token_hash=${encodeURIComponent(token)}&type=magiclink&next=${encodeURIComponent(path)}`;
}

/**
 * Creates the account for a new sign-up (paid or free trial). If the email is already in use
 * the person is told to log in, except when it is a leftover from an abandoned attempt
 * (still waiting, nothing paid, no trial taken), which is reused with the new password.
 */
export async function ensureAccount(input: { email: string; password: string; fullName: string }): Promise<{ userId: string } | { error: string }> {
  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  let userId = created.data?.user?.id ?? "";

  if (!userId) {
    const { data: existing } = await admin.from("profiles").select("id, status").eq("email", input.email).maybeSingle();
    if (!existing) return { error: created.error?.message ?? "Could not create your account." };
    const [{ count: paid }, { count: ents }] = await Promise.all([
      admin.from("checkout_orders").select("id", { count: "exact", head: true }).eq("user_id", existing.id).eq("status", "paid"),
      admin.from("studio_entitlements").select("id", { count: "exact", head: true }).eq("user_id", existing.id),
    ]);
    if (existing.status !== "pending" || (paid ?? 0) > 0 || (ents ?? 0) > 0) {
      return { error: "An account with this email already exists. Log in to your account instead." };
    }
    await admin.auth.admin.updateUserById(existing.id, { password: input.password, user_metadata: { full_name: input.fullName } });
    userId = existing.id;
  }
  await admin.from("profiles").update({ full_name: input.fullName }).eq("id", userId);
  return { userId };
}
