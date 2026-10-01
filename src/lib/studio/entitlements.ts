import { createAdminClient } from "@/lib/supabase/admin";
import { SERVICES } from "@/lib/landing-services";
import { STUDIO_SERVICES, parseQuota, servicesForTool, validityDays, type Unit } from "@/lib/studio/services";

export type EntitlementRow = {
  id: string;
  user_id: string;
  service: string;
  plan: string;
  unit: Unit;
  quota: number;
  used: number;
  expires_at: string | null;
  source: "purchase" | "admin" | "trial";
  note: string | null;
  created_at: string;
};

export type ServiceStatus = {
  service: string;
  unit: Unit;
  /** can be used right now */
  active: boolean;
  total: number;
  used: number;
  remaining: number;
  /** soonest expiry among plans that still have something left */
  expiresAt: string | null;
  plan: string | null;
};

const num = (r: Record<string, unknown>): EntitlementRow => ({
  ...(r as unknown as EntitlementRow),
  quota: Number(r.quota),
  used: Number(r.used),
});

export async function entitlementRows(userId: string): Promise<EntitlementRow[]> {
  const { data } = await createAdminClient().from("studio_entitlements").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  return (data ?? []).map(num);
}

/** One status per service the customer has ever had, folding every plan they bought for it together. */
export function summarize(rows: EntitlementRow[], now = Date.now()): Record<string, ServiceStatus> {
  const out: Record<string, ServiceStatus> = {};
  for (const r of rows) {
    const live = !r.expires_at || new Date(r.expires_at).getTime() > now;
    const s = (out[r.service] ??= { service: r.service, unit: r.unit, active: false, total: 0, used: 0, remaining: 0, expiresAt: null, plan: null });
    if (!live) continue;
    s.total += r.quota;
    s.used += r.used;
    const left = r.quota - r.used;
    if (left > 0) {
      s.remaining += left;
      s.active = true;
      if (r.expires_at && (!s.expiresAt || r.expires_at < s.expiresAt)) s.expiresAt = r.expires_at;
    }
    s.plan ??= r.plan;
  }
  return out;
}

/** What a customer can do in one Studio tool: its services, and whether any is usable. */
export function toolStatus(toolId: string, summary: Record<string, ServiceStatus>) {
  const services = servicesForTool(toolId).map((s) => summary[s.id]).filter(Boolean);
  return { services, active: services.some((s) => s.active) };
}

/** Which tools are open for the customer, for every tool at once (the sidebar lock icons). */
export function accessByTool(summary: Record<string, ServiceStatus>): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const s of STUDIO_SERVICES) out[s.tool] = out[s.tool] || Boolean(summary[s.id]?.active);
  return out;
}

export async function consume(userId: string, service: string, amount: number): Promise<boolean> {
  const { error } = await createAdminClient().rpc("studio_consume", { p_user: userId, p_service: service, p_amount: amount });
  return !error;
}

export async function restore(userId: string, service: string, amount: number) {
  await createAdminClient().rpc("studio_restore", { p_user: userId, p_service: service, p_amount: amount });
}

/** Records a purchase, or an admin grant, as usable plan amount. */
export async function grantEntitlement(opts: {
  userId: string;
  service: string;
  plan: string;
  source: "purchase" | "admin" | "trial";
  orderId?: string;
  /** override what the plan promises (admin grants) */
  amount?: number;
  /** override the validity in days, 0 or null for none (admin grants) */
  days?: number | null;
  note?: string;
}): Promise<{ error: string | null }> {
  const svc = STUDIO_SERVICES.find((s) => s.id === opts.service);
  const tier = SERVICES.find((s) => s.id === opts.service)?.tiers.find((t) => t.name === opts.plan);
  if (!svc) return { error: "That service is not part of AI Studio." };

  const parsed = tier ? parseQuota(opts.service, tier) : null;
  const amount = opts.amount ?? parsed?.amount;
  if (!amount || amount <= 0) return { error: "Enter how much to grant." };

  const days = opts.days !== undefined ? opts.days : tier ? validityDays(tier.period) : null;
  const expires = days ? new Date(Date.now() + days * 86_400_000).toISOString() : null;

  const { error } = await createAdminClient().from("studio_entitlements").insert({
    user_id: opts.userId,
    service: opts.service,
    plan: opts.plan,
    unit: svc.unit,
    quota: amount,
    expires_at: expires,
    source: opts.source,
    order_id: opts.orderId ?? null,
    note: opts.note ?? null,
  });
  return { error: error?.message ?? null };
}

/** Services whose free trial this customer has already taken (it is once per account). */
export const trialsTaken = (rows: EntitlementRow[]) => rows.filter((r) => r.source === "trial").map((r) => r.service);

/** True when the customer has a paid or granted plan for the service that can still be used. */
export function hasPaidAccess(rows: EntitlementRow[], service: string, now = Date.now()) {
  return rows.some((r) => r.service === service && r.source !== "trial" && r.quota - r.used > 0 && (!r.expires_at || new Date(r.expires_at).getTime() > now));
}
