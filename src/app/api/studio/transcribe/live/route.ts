import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { realtimeScribeToken } from "@/lib/studio/elevenlabs";
import { providerCost, resolveEngine } from "@/lib/studio/engines";
import { restore } from "@/lib/studio/entitlements";
import { LIVE_MAX_SECONDS } from "@/lib/studio/limits";
import { authorize, begin, fail, failGeneration, finishWithResult, minutesOf, refundAuthz, requireStudioUser } from "@/lib/studio/run";

export const runtime = "nodejs";

/**
 * Live transcription from the microphone (Scribe v2 Realtime). "start" takes the session's
 * allowance and returns a one-time token for the browser. "finish" reports how long it really ran,
 * stores the text and gives back the part that was not used.
 */
export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const b = (await request.json().catch(() => null)) as { action?: string; id?: string; seconds?: number; text?: string; words?: unknown } | null;

  if (b?.action === "start") {
    const z = await authorize(auth.userId, "transcribe", "realtime", { seconds: LIVE_MAX_SECONDS }, "Live transcription", minutesOf(LIVE_MAX_SECONDS));
    if ("error" in z) return z.error;
    const t = await realtimeScribeToken();
    if (!t.ok) {
      await refundAuthz(z.authz);
      return fail(t.error, 502);
    }
    const g = await begin(auth.userId, "transcribe", z.authz.engine.provider, "Live transcription", { live: true, startedAt: Date.now() }, undefined, z.authz);
    return NextResponse.json({ id: g.id, token: t.token, maxSeconds: LIVE_MAX_SECONDS, modelId: z.authz.engine.model ?? "scribe_v2_realtime" });
  }

  if (b?.action === "finish" && b.id) {
    const db = createAdminClient();
    const { data: row } = await db.from("studio_generations").select("id, user_id, status, service, units, input, created_at, engine_key").eq("id", b.id).eq("user_id", auth.userId).maybeSingle();
    if (!row || row.status !== "processing") return fail("That session has already ended.");

    // one caller ends a session, so the unused part is only ever given back once
    const { data: claimed } = await db.from("studio_generations").update({ status: "done" }).eq("id", row.id).eq("status", "processing").select("id");
    if (!claimed || claimed.length === 0) return fail("That session has already ended.");

    // never trust the browser's clock: a session cannot have run longer than it has existed
    const elapsed = (Date.now() - new Date(row.created_at).getTime()) / 1000 + 5;
    const seconds = Math.max(1, Math.min(Number(b.seconds) || 0, elapsed, LIVE_MAX_SECONDS));
    const text = typeof b.text === "string" ? b.text.slice(0, 200_000) : "";

    const r = await resolveEngine("transcribe", "realtime");
    const engine = "engine" in r ? r.engine : null;
    const cc = engine ? Number(engine.credit_cost) || 1 : 1;
    const paid = Number(row.units);
    const used = Math.min(paid, Math.round(minutesOf(seconds) * cc * 1000) / 1000);
    const back = Math.round((paid - used) * 1000) / 1000;
    if (back > 0 && row.service) await restore(auth.userId, row.service, back);

    const cost = engine ? (providerCost(engine, { seconds }) ?? 0) : 0;
    await db.from("studio_generations").update({ units: used, provider_cost: cost, input: { ...(row.input as object), seconds: Math.round(seconds) } }).eq("id", row.id);
    await finishWithResult({ id: row.id, userId: auth.userId, kind: "transcribe", provider: "elevenlabs", title: "Live transcription" }, { language: "", text, words: [], live: true, seconds: Math.round(seconds) });
    return NextResponse.json({ id: row.id, seconds: Math.round(seconds), used });
  }

  if (b?.action === "cancel" && b.id) {
    // only your own session that is still open
    const { data: row } = await createAdminClient().from("studio_generations").select("id, status").eq("id", b.id).eq("user_id", auth.userId).maybeSingle();
    if (row?.status === "processing") await failGeneration({ id: row.id }, "The session was cancelled before it started.");
    return NextResponse.json({ ok: true });
  }

  return fail("Unknown request.");
}
