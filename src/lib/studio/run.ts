import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { getMyProducts } from "@/lib/products-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveFile } from "@/lib/studio/storage";
import { limitError, providerCost, resolveEngine, type Engine, type Usage } from "@/lib/studio/engines";
import { consumeTrial, getTrial, getTrialConfig, restoreTrial, trialLimitError, trialMessage, trialState } from "@/lib/studio/trial";
import { consume, restore, summarize, entitlementRows, toolStatus } from "@/lib/studio/entitlements";
import { formatUnits, servicesForTool, serviceName } from "@/lib/studio/services";
import { providerSupports } from "@/lib/studio/engine-catalog";
import { duration, workDir } from "@/lib/studio/ffmpeg";
import { promises as fs } from "fs";
import path from "path";

export const MAX_UPLOAD_MB = 200;

export async function requireStudioUser() {
  const { user, profile } = await getDashboardSession();
  if (!user || !profile || profile.status !== "approved") {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (!(await getMyProducts(user.id)).has("studio")) {
    return {
      error: NextResponse.json({ error: "Your account does not include AI Studio." }, { status: 403 }),
    } as const;
  }
  return { userId: user.id } as const;
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function uploadedFile(form: FormData, field: string) {
  const f = form.get(field);
  if (!(f instanceof File) || f.size === 0) return null;
  return f;
}

export const tooBig = (f: File) => f.size > MAX_UPLOAD_MB * 1024 * 1024;

const EXT: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "video/mp4": "mp4",
  "audio/mp4": "m4a",
  "video/webm": "webm",
  "audio/webm": "webm",
};
export const extFor = (mime: string) => EXT[mime.split(";")[0].trim()] ?? "bin";

export type Generation = {
  id: string;
  userId: string;
  kind: string;
  provider: string;
  title: string;
};

/** Creates a generation row in "processing" state. */
export async function begin(
  userId: string,
  kind: string,
  provider: string,
  title: string,
  input: Record<string, unknown>,
  providerJobId?: string,
  authz?: Authz
): Promise<Generation> {
  const id = randomUUID();
  await createAdminClient()
    .from("studio_generations")
    .insert({
      id,
      user_id: userId,
      kind,
      provider,
      title,
      input,
      provider_job_id: providerJobId ?? null,
      engine_key: authz?.engine.key ?? null,
      service: authz?.service ?? null,
      units: authz?.units ?? 0,
      funding: authz?.funding ?? "plan",
      provider_cost: authz?.cost ?? 0,
    });
  return { id, userId, kind, provider, title };
}

export async function finishWithFile(g: Generation, data: Buffer, mime: string, result?: unknown) {
  const key = `${g.userId}/${g.id}.${extFor(mime)}`;
  await saveFile(key, data, mime);
  await createAdminClient()
    .from("studio_generations")
    .update({ status: "done", file_key: key, mime_type: mime, result: result ?? null })
    .eq("id", g.id);
}

export async function finishWithResult(g: Generation, result: unknown) {
  await createAdminClient().from("studio_generations").update({ status: "done", result }).eq("id", g.id);
}

/** Marks a run failed and gives back what it took, from the plan or the trial (once). */
export async function failGeneration(g: { id: string }, error: string) {
  const db = createAdminClient();
  await db.from("studio_generations").update({ status: "failed", error }).eq("id", g.id);
  const { data } = await db.from("studio_generations").select("user_id, service, units, refunded, funding, provider_cost").eq("id", g.id).single();
  if (!data || data.refunded) return;
  const { data: claimed } = await db.from("studio_generations").update({ refunded: true }).eq("id", g.id).eq("refunded", false).select("id");
  if (!claimed || claimed.length === 0) return;
  if (data.funding === "trial") await restoreTrial(data.user_id, Number(data.provider_cost));
  else if (data.service && Number(data.units) > 0) await restore(data.user_id, data.service, Number(data.units));
}

export type Authz = {
  engine: Engine;
  units: number;
  service: string;
  userId: string;
  /** which allowance paid for it */
  funding: "plan" | "trial";
  /** what the provider charges us for this run, estimated */
  cost: number;
};

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Minutes of media, for plans counted in minutes. A little is always counted, never zero. */
export const minutesOf = (seconds?: number) => Math.max(0.1, Math.ceil(((seconds ?? 60) / 60) * 100) / 100);

/**
 * Picks the engine, checks its limits and pays for the run: first from a plan the customer
 * bought for this service, otherwise from their shared free trial. Call it before talking to the
 * provider. If the provider then fails, call failGeneration (or refundAuthz when no row exists
 * yet) so the allowance is given back. `service` names which plan to draw from when a tool has
 * more than one.
 */
export async function authorize(
  userId: string,
  toolId: string,
  engineKey: string | null | undefined,
  usage: Usage,
  label: string,
  amount: number,
  service?: string | ((engine: Engine) => string)
): Promise<{ error: NextResponse } | { authz: Authz }> {
  const r = await resolveEngine(toolId, engineKey);
  if ("error" in r) return { error: fail(r.error) };
  if (!providerSupports(r.engine.provider, toolId)) return { error: fail("This engine is not set up correctly. Please contact support.", 500) };
  const limit = limitError(r.engine, usage);
  if (limit) return { error: fail(limit) };

  const serviceId = typeof service === "function" ? service(r.engine) : (service ?? servicesForTool(toolId)[0]?.id);
  if (!serviceId) return { error: fail("This tool cannot be used yet.", 500) };

  const cost = providerCost(r.engine, usage) ?? 0;

  // 1. a plan bought for this service. The engine's multiplier lets a costlier engine use more of it
  const units = round(amount * (Number(r.engine.credit_cost) || 1));
  if (await consume(userId, serviceId, units)) {
    return { authz: { engine: r.engine, units, service: serviceId, userId, funding: "plan", cost } };
  }

  // 2. the shared free trial, with its own tighter rules
  const [config, row] = await Promise.all([getTrialConfig(), getTrial(userId)]);
  const trial = trialState(row, config);
  const status = summarize(await entitlementRows(userId))[serviceId];

  if (trial.started) {
    if (!trial.active) {
      return { error: fail(status ? `Your ${serviceName(serviceId)} plan has run out. ${trialMessage(trial.why)} Add a plan from the menu to keep going.` : `${trialMessage(trial.why)} Pick a plan from the menu to keep going.`, 402) };
    }
    if (!r.engine.trial_allowed || r.engine.provider_rate === null) {
      return { error: fail("This engine is not part of the free trial. Choose another version, or pick a plan from the menu.", 403) };
    }
    const cap = trialLimitError(toolId, usage, config);
    if (cap) return { error: fail(cap) };
    const result = await consumeTrial(userId, cost);
    if (result !== "ok") return { error: fail(`${trialMessage(result as never)} Pick a plan from the menu to keep going.`, 402) };
    return { authz: { engine: r.engine, units: 0, service: serviceId, userId, funding: "trial", cost } };
  }

  if (!status) return { error: fail(`You have not bought ${serviceName(serviceId)} yet. Open it from the menu to get a plan or start your free trial.`, 403) };
  return {
    error: fail(
      status.active
        ? `This needs ${formatUnits(units, status.unit)} and you have ${formatUnits(status.remaining, status.unit)} left on ${serviceName(serviceId)}. Add more from the menu.`
        : `Your ${serviceName(serviceId)} plan has run out or expired. Add more from the menu to keep going.`,
      402
    ),
  };
}

export const refundAuthz = (a: Authz) => (a.funding === "trial" ? restoreTrial(a.userId, a.cost) : restore(a.userId, a.service, a.units));

/** True when this customer can use the tool at all right now. */
export async function toolOpen(userId: string, toolId: string) {
  return toolStatus(toolId, summarize(await entitlementRows(userId)));
}

/** Length of an uploaded audio or video file in seconds, or undefined if it cannot be read. */
export async function mediaSeconds(file: File): Promise<number | undefined> {
  const work = await workDir();
  try {
    const p = path.join(work.dir, "probe" + (path.extname(file.name) || ".bin"));
    await fs.writeFile(p, Buffer.from(await file.arrayBuffer()));
    return await duration(p);
  } catch {
    return undefined;
  } finally {
    await work.done();
  }
}

export const mb = (f: File) => f.size / 1024 / 1024;
