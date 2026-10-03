import { SERVICES } from "@/lib/landing-services";
import { USD_TO_BDT_RATE } from "@/lib/currency";
import { formatUnits, parseQuota, servicesForTool, validityDays } from "@/lib/studio/services";

export type PlanTier = {
  name: string;
  usd: number;
  bdt: number;
  /** what the plan promises, as the customer will see it deducted: "30,000 characters" */
  amount: string;
  /** "30 days", "1 year" or null when it never expires */
  validity: string | null;
};

export type PlanOption = { service: string; serviceName: string; tiers: PlanTier[] };

/** The plans on sale for one pricing-page service, ready to show and buy. Plain data, safe for the browser. */
export function planOption(serviceId: string): PlanOption | null {
  const svc = SERVICES.find((s) => s.id === serviceId);
  if (!svc) return null;
  const tiers: PlanTier[] = [];
  for (const t of svc.tiers) {
    const q = parseQuota(serviceId, t);
    if (!q) continue;
    const days = validityDays(t.period);
    tiers.push({
      name: t.name,
      usd: t.price,
      bdt: Math.round(t.price * USD_TO_BDT_RATE),
      amount: svc.id === "avatar-creator" ? `1 avatar (${t.quota.toLowerCase()})` : formatUnits(q.amount, q.unit),
      validity: days === 30 ? "30 days" : days === 365 ? "1 year" : null,
    });
  }
  return tiers.length ? { service: serviceId, serviceName: svc.name, tiers } : null;
}

export const planOptionsForTool = (toolId: string) => servicesForTool(toolId).map((s) => planOption(s.id)).filter((p): p is PlanOption => p !== null);
