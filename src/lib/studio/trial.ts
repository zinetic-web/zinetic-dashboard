import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type TrialConfig = {
  enabled: boolean;
  days: number;
  max_generations: number;
  max_spend: number;
  limits: Record<string, { maxChars?: number; maxSeconds?: number }>;
};

export const TRIAL_CONFIG_TAG = "studio-trial-config";

const DEFAULTS: TrialConfig = { enabled: true, days: 7, max_generations: 2, max_spend: 0.2, limits: {} };

/** The trial rules, as set in the admin. Cached for a minute and cleared when an admin saves. */
export const getTrialConfig = unstable_cache(
  async (): Promise<TrialConfig> => {
    const { data } = await createAdminClient().from("studio_trial_config").select("*").maybeSingle();
    if (!data) return DEFAULTS;
    return {
      enabled: data.enabled,
      days: Number(data.days),
      max_generations: Number(data.max_generations),
      max_spend: Number(data.max_spend),
      limits: (data.limits ?? {}) as TrialConfig["limits"],
    };
  },
  ["studio-trial-config"],
  { revalidate: 60, tags: [TRIAL_CONFIG_TAG] }
);

export type TrialRow = {
  user_id: string;
  service: string | null;
  started_at: string;
  expires_at: string;
  generations_used: number;
  spend_used: number;
  ended: boolean;
};

export async function getTrial(userId: string): Promise<TrialRow | null> {
  const { data } = await createAdminClient().from("studio_trials").select("*").eq("user_id", userId).maybeSingle();
  return data ? { ...(data as TrialRow), generations_used: Number(data.generations_used), spend_used: Number(data.spend_used) } : null;
}

export type TrialState = {
  /** has a trial at all */
  started: boolean;
  /** can be used right now */
  active: boolean;
  why: "none" | "disabled" | "ended" | "expired" | "generations" | "spend" | "ok";
  generationsLeft: number;
  spendLeft: number;
  expiresAt: string | null;
};

export function trialState(row: TrialRow | null, config: TrialConfig, now = Date.now()): TrialState {
  if (!row) return { started: false, active: false, why: config.enabled ? "none" : "disabled", generationsLeft: 0, spendLeft: 0, expiresAt: null };
  const generationsLeft = Math.max(config.max_generations - row.generations_used, 0);
  const spendLeft = Math.max(Math.round((config.max_spend - row.spend_used) * 10000) / 10000, 0);
  let why: TrialState["why"] = "ok";
  if (!config.enabled) why = "disabled";
  else if (row.ended) why = "ended";
  else if (new Date(row.expires_at).getTime() <= now) why = "expired";
  else if (generationsLeft <= 0) why = "generations";
  else if (spendLeft <= 0) why = "spend";
  return { started: true, active: why === "ok", why, generationsLeft, spendLeft, expiresAt: row.expires_at };
}

/** Starts the trial for an account, once. Returns an error if they already had one. */
export async function startTrial(userId: string, service: string | null): Promise<{ error: string | null }> {
  const config = await getTrialConfig();
  if (!config.enabled) return { error: "Free trials are not open right now." };
  const expires = new Date(Date.now() + config.days * 86_400_000).toISOString();
  const { error } = await createAdminClient().from("studio_trials").insert({ user_id: userId, service, expires_at: expires });
  if (error) return { error: error.code === "23505" ? "You have already used your free trial." : error.message };
  return { error: null };
}

export async function consumeTrial(userId: string, cost: number): Promise<string> {
  const { data, error } = await createAdminClient().rpc("studio_trial_consume", { p_user: userId, p_cost: cost });
  return error ? "none" : String(data);
}

export async function restoreTrial(userId: string, cost: number) {
  await createAdminClient().rpc("studio_trial_restore", { p_user: userId, p_cost: cost });
}

/** Per-request caps for a tool while on the trial (a long file would burn the whole allowance in one go). */
export function trialLimitError(toolId: string, usage: { chars?: number; seconds?: number }, config: TrialConfig): string | null {
  const l = config.limits[toolId];
  if (!l) return null;
  if (l.maxChars && usage.chars && usage.chars > l.maxChars) return `The free trial allows up to ${l.maxChars.toLocaleString()} characters per request here.`;
  if (l.maxSeconds && usage.seconds && usage.seconds > l.maxSeconds) {
    return `The free trial allows up to ${l.maxSeconds >= 60 ? `${Math.round(l.maxSeconds / 60)} minute${l.maxSeconds >= 120 ? "s" : ""}` : `${l.maxSeconds} seconds`} per request here.`;
  }
  return null;
}

export const trialMessage = (why: TrialState["why"]) =>
  ({
    none: "Start your free trial from the menu to try this.",
    disabled: "Free trials are not open right now.",
    ended: "Your free trial has ended.",
    expired: "Your free trial has expired.",
    generations: "You have used both of your free trial generations.",
    spend: "Your free trial allowance is used up.",
    ok: "",
  })[why];

/**
 * Called once a new customer has confirmed their email. If they signed up for the free trial
 * (their sign-up carries which service they came in through) the account is approved, AI Studio
 * is opened and the trial clock starts. Safe to call again: a trial is only ever started once.
 */
export async function activateTrialIfRequested(userId: string): Promise<boolean> {
  const db = createAdminClient();
  const { data } = await db.auth.admin.getUserById(userId);
  const service = data?.user?.user_metadata?.trial_service as string | undefined;
  if (!service || !data.user?.email_confirmed_at) return false;

  await db.from("profiles").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", userId).eq("status", "pending");
  await db.from("user_products").upsert({ user_id: userId, product: "studio" }, { onConflict: "user_id,product" });
  const res = await startTrial(userId, service);
  return !res.error;
}

/** Everything the screens need about a customer's trial, in one plain object. */
export async function trialInfo(userId: string | null) {
  const config = await getTrialConfig();
  const row = userId ? await getTrial(userId) : null;
  const st = trialState(row, config);
  return {
    started: st.started,
    active: st.active,
    why: st.why,
    generationsLeft: st.generationsLeft,
    generationsMax: config.max_generations,
    spendLeft: st.spendLeft,
    spendMax: config.max_spend,
    expiresAt: st.expiresAt,
    days: config.days,
    enabled: config.enabled,
  };
}
