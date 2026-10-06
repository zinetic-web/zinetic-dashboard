"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { audit, labelFor } from "@/lib/admin/audit";
import { CHECK_PRICE } from "@/lib/pricing-plans";
import { formatCredits } from "@/lib/credits";

const refresh = (userId?: string) => {
  revalidatePath("/admin");
  revalidatePath("/admin/customers");
  if (userId) revalidatePath(`/admin/customers/${userId}`);
};

type Wallet = { balance: number | null } | { error: string };

/**
 * Changes a customer's Channel Checker balance and writes the ledger row. Uses the database function
 * when it works. If that function is the older version with the type bug (error 42804), it does the same
 * thing in two safe steps instead, so admin top-ups never depend on a database patch. `balance: null`
 * means the change would have gone below zero.
 */
async function adjustWallet(userId: string, usd: number, note: string, adminId: string): Promise<Wallet> {
  const db = createAdminClient();
  const rpc = await db.rpc("wallet_adjust", { p_user: userId, p_usd: usd, p_note: note, p_admin: adminId });
  if (!rpc.error) return { balance: rpc.data === null ? null : Number(rpc.data) };
  if (rpc.error.code !== "42804") return { error: rpc.error.message };

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data: row } = await db.from("profiles").select("wallet_balance").eq("id", userId).single();
    if (!row) return { error: "Customer not found." };
    const current = Number(row.wallet_balance);
    const next = Math.round((current + usd) * 100) / 100;
    if (next < 0) return { balance: null };
    // only succeeds if nobody changed the balance in between
    const { data: updated } = await db.from("profiles").update({ wallet_balance: next }).eq("id", userId).eq("wallet_balance", current).select("id");
    if (!updated || updated.length === 0) continue;
    const { error } = await db.from("wallet_transactions").insert({ user_id: userId, type: usd >= 0 ? "topup" : "adjustment", amount: usd, note, created_by: adminId });
    if (error) {
      await db.from("profiles").update({ wallet_balance: current }).eq("id", userId).eq("wallet_balance", next);
      return { error: error.message };
    }
    return { balance: next };
  }
  return { error: "The balance changed while saving. Please try again." };
}

/**
 * Adds or removes Channel Checker credits for one customer, with a note that appears on
 * their transaction list. Credits are the unit customers see (1 credit = one check).
 */
export async function adjustCheckerCredits(userId: string, credits: number, note?: string) {
  const admin = await requireAdmin();
  if (!Number.isFinite(credits) || credits === 0) return { error: "Enter a number of credits, positive to add or negative to remove." };
  const usd = Math.round(credits * CHECK_PRICE * 100) / 100;

  const result = await adjustWallet(userId, usd, note?.trim() || (credits > 0 ? "Credits added by admin" : "Credits removed by admin"), admin.id);
  if ("error" in result) return { error: result.error };
  if (result.balance === null) return { error: "That would take the balance below zero." };
  const data = result.balance;

  await audit(admin, credits > 0 ? "checker_credits_add" : "checker_credits_remove", { id: userId, label: await labelFor(userId) }, {
    credits,
    note: note ?? null,
    balance: formatCredits(Number(data)),
  });
  refresh(userId);
  return { error: null };
}

/** Approves or rejects several waiting sign-ups at once. Approving also opens the Channel Checker. */
export async function bulkReview(ids: string[], decision: "approved" | "rejected") {
  const admin = await requireAdmin();
  if (ids.length === 0) return { error: "Choose at least one customer." };
  const db = createAdminClient();

  const { error } = await db
    .from("profiles")
    .update({ status: decision, reviewed_at: new Date().toISOString(), reviewed_by: admin.id })
    .in("id", ids)
    .eq("role", "user");
  if (error) return { error: error.message };

  if (decision === "approved") {
    await db
      .from("user_products")
      .upsert(ids.map((id) => ({ user_id: id, product: "cms", granted_by: admin.id })), { onConflict: "user_id,product", ignoreDuplicates: true });
  }
  await audit(admin, decision === "approved" ? "bulk_approve" : "bulk_reject", null, { count: ids.length, ids });
  refresh();
  return { error: null };
}

export async function setAdminNote(userId: string, note: string) {
  const admin = await requireAdmin();
  const { error } = await createAdminClient().from("profiles").update({ admin_note: note.trim() || null }).eq("id", userId);
  if (error) return { error: error.message };
  await audit(admin, "note", { id: userId, label: await labelFor(userId) }, {});
  refresh(userId);
  return { error: null };
}

export type TrialConfigInput = {
  enabled: boolean;
  days: number;
  max_generations: number;
  max_spend: number;
  limits: Record<string, { maxChars?: number; maxSeconds?: number }>;
};

/** Saves the free-trial rules. They apply to every trial from the next request, existing trials included. */
export async function saveTrialConfig(input: TrialConfigInput) {
  const admin = await requireAdmin();
  if (!(input.days >= 1 && input.days <= 365)) return { error: "Days must be between 1 and 365." };
  if (!(input.max_generations >= 1 && input.max_generations <= 100)) return { error: "Generations must be between 1 and 100." };
  if (!(input.max_spend > 0 && input.max_spend <= 100)) return { error: "The cost cap must be more than $0 and at most $100." };

  const { error } = await createAdminClient()
    .from("studio_trial_config")
    .upsert({ id: true, enabled: input.enabled, days: input.days, max_generations: input.max_generations, max_spend: input.max_spend, limits: input.limits, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };

  revalidateTag("studio-trial-config", { expire: 0 });
  revalidatePath("/admin/studio/trial");
  await audit(admin, "trial_config", null, { days: input.days, generations: input.max_generations, spend: input.max_spend, enabled: input.enabled });
  return { error: null };
}

/** Gives a customer a fresh trial: usage back to zero and a new start date. The only way a trial resets. */
export async function resetTrial(userId: string) {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: config } = await db.from("studio_trial_config").select("days").maybeSingle();
  const days = Number(config?.days ?? 7);
  const { error } = await db
    .from("studio_trials")
    .update({ generations_used: 0, spend_used: 0, ended: false, started_at: new Date().toISOString(), expires_at: new Date(Date.now() + days * 86_400_000).toISOString() })
    .eq("user_id", userId);
  if (error) return { error: error.message };
  await audit(admin, "trial_reset", { id: userId, label: await labelFor(userId) });
  revalidatePath("/admin/studio/trial");
  refresh(userId);
  return { error: null };
}

export async function endTrial(userId: string) {
  const admin = await requireAdmin();
  const { error } = await createAdminClient().from("studio_trials").update({ ended: true }).eq("user_id", userId);
  if (error) return { error: error.message };
  await audit(admin, "trial_end", { id: userId, label: await labelFor(userId) });
  revalidatePath("/admin/studio/trial");
  refresh(userId);
  return { error: null };
}
