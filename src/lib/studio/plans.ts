import { SERVICES, planKey, type Tier } from "@/lib/landing-services";
import { USD_TO_BDT_RATE } from "@/lib/currency";
import { formatUnits, parseQuota, servicesForTool, validityDays } from "@/lib/studio/services";

export type PlanTier = {
  /** what an order stores: the plan name, plus the version when it is not the first */
  key: string;
  name: string;
  usd: number;
  bdt: number;
  /** what the plan promises, as the customer will see it deducted: "30,000 characters" */
  amount: string;
  /** "30 days", "1 year" or null when it never expires */
  validity: string | null;
};

export type PlanVersion = { id: string; label: string; note: string | null; tiers: PlanTier[] };

export type PlanOption = {
  service: string;
  serviceName: string;
  /** plans of the first (default) version */
  tiers: PlanTier[];
  /** services sold in several versions: choose one, then its plans */
  versions: PlanVersion[] | null;
};

function toTiers(serviceId: string, tiers: Tier[], versionId: string | null): PlanTier[] {
  const out: PlanTier[] = [];
  for (const t of tiers) {
    const q = parseQuota(serviceId, t);
    if (!q) continue;
    const days = validityDays(t.period);
    out.push({
      key: planKey(t.name, versionId),
      name: t.name,
      usd: t.price,
      bdt: Math.round(t.price * USD_TO_BDT_RATE),
      amount: serviceId === "avatar-creator" ? `1 avatar (${t.quota.toLowerCase()})` : formatUnits(q.amount, q.unit),
      validity: days === 30 ? "30 days" : days === 365 ? "1 year" : null,
    });
  }
  return out;
}

/** The plans on sale for one pricing-page service, ready to show and buy. Plain data, safe for the browser. */
export function planOption(serviceId: string): PlanOption | null {
  const svc = SERVICES.find((s) => s.id === serviceId);
  if (!svc) return null;
  const versions = svc.versions
    ? svc.versions.map((v, i) => ({ id: v.id, label: v.label, note: v.note ?? null, tiers: toTiers(serviceId, v.tiers, i === 0 ? null : v.id) }))
    : null;
  const tiers = versions ? versions[0].tiers : toTiers(serviceId, svc.tiers, null);
  return tiers.length ? { service: serviceId, serviceName: svc.name, tiers, versions } : null;
}

export const planOptionsForTool = (toolId: string) => servicesForTool(toolId).map((s) => planOption(s.id)).filter((p): p is PlanOption => p !== null);
