import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { agentSignedUrl, conversationFacts } from "@/lib/studio/elevenlabs";
import { providerCost, resolveEngine } from "@/lib/studio/engines";
import { consume, restore } from "@/lib/studio/entitlements";
import { SESSION_MAX_SECONDS } from "@/lib/studio/limits";
import { authorize, begin, fail, failGeneration, finishWithResult, minutesOf, refundAuthz, requireStudioUser } from "@/lib/studio/run";

export const runtime = "nodejs";
export const maxDuration = 60;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * A conversation with one of the customer's voice agents. "start" reserves the session from the plan and
 * returns a one-time link for the browser. "finish" asks the provider how long it really ran, charges that
 * (twice, when the provider billed it as a burst call), stores the transcript and gives back the rest.
 */
export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;
  const b = (await request.json().catch(() => null)) as { action?: string; agent?: string; id?: string; seconds?: number; conversationId?: string; text?: string } | null;
  const db = createAdminClient();

  if (b?.action === "start") {
    const { data: agent } = await db.from("studio_generations").select("id, title, provider_job_id, input").eq("id", b.agent ?? "").eq("user_id", auth.userId).eq("kind", "speech-agent").maybeSingle();
    if (!agent?.provider_job_id) return fail("Pick one of your agents first.", 404);

    const z = await authorize(auth.userId, "speech-engine", null, { seconds: SESSION_MAX_SECONDS }, "Speech Engine", minutesOf(SESSION_MAX_SECONDS));
    if ("error" in z) return z.error;
    const link = await agentSignedUrl(agent.provider_job_id);
    if (!link.ok) {
      await refundAuthz(z.authz);
      return fail(link.error, 502);
    }
    const burst = Boolean((agent.input as { burst?: boolean }).burst);
    const g = await begin(auth.userId, "speech-engine", "elevenlabs", `Talk with ${agent.title}`.slice(0, 80), { agent: agent.id, agentName: agent.title, burst }, undefined, z.authz);
    return NextResponse.json({ id: g.id, signedUrl: link.url, maxSeconds: SESSION_MAX_SECONDS });
  }

  if (b?.action === "finish" && b.id) {
    const { data: row } = await db.from("studio_generations").select("id, status, service, units, input, created_at").eq("id", b.id).eq("user_id", auth.userId).eq("kind", "speech-engine").maybeSingle();
    if (!row || row.status !== "processing") return fail("That conversation has already ended.");
    // one caller ends a conversation, so the unused part is only ever given back once
    const { data: claimed } = await db.from("studio_generations").update({ status: "done" }).eq("id", row.id).eq("status", "processing").select("id");
    if (!claimed || claimed.length === 0) return fail("That conversation has already ended.");

    // the provider's own record of the call is what we charge by. The browser's clock is only a fallback.
    const elapsed = (Date.now() - new Date(row.created_at).getTime()) / 1000 + 5;
    let seconds = Math.max(1, Math.min(Number(b.seconds) || 0, elapsed, SESSION_MAX_SECONDS));
    let burst = false;
    if (b.conversationId && /^[\w-]{6,80}$/.test(b.conversationId)) {
      for (let i = 0; i < 4; i++) {
        const facts = await conversationFacts(b.conversationId);
        if (facts?.seconds != null && facts.status !== "initiated" && facts.status !== "in-progress") {
          seconds = Math.max(1, Math.min(facts.seconds, SESSION_MAX_SECONDS));
          burst = facts.burst;
          break;
        }
        await wait(1500);
      }
    }

    const r = await resolveEngine("speech-engine", null);
    const engine = "engine" in r ? r.engine : null;
    const cc = engine ? Number(engine.credit_cost) || 1 : 1;
    const paid = Number(row.units);
    const base = Math.round(minutesOf(seconds) * cc * 1000) / 1000;
    const used = Math.min(paid, base);
    const back = Math.round((paid - used) * 1000) / 1000;
    if (back > 0 && row.service) await restore(auth.userId, row.service, back);
    // a burst call is billed to us at twice the rate, so it takes twice as much of the plan. If the plan has less left, it keeps what it has.
    let extra = 0;
    if (burst && row.service && (await consume(auth.userId, row.service, base))) extra = base;

    const cost = engine ? (providerCost(engine, { seconds }) ?? 0) * (burst ? 2 : 1) : 0;
    await db.from("studio_generations").update({ units: used + extra, provider_cost: cost, input: { ...(row.input as object), seconds: Math.round(seconds), burst, conversationId: b.conversationId ?? null } }).eq("id", row.id);
    const text = typeof b.text === "string" ? b.text.slice(0, 200_000) : "";
    await finishWithResult({ id: row.id, userId: auth.userId, kind: "speech-engine", provider: "elevenlabs", title: "Conversation" }, { language: "", text, words: [], seconds: Math.round(seconds), burst });
    return NextResponse.json({ id: row.id, seconds: Math.round(seconds), burst });
  }

  if (b?.action === "cancel" && b.id) {
    const { data: row } = await db.from("studio_generations").select("id, status").eq("id", b.id).eq("user_id", auth.userId).eq("kind", "speech-engine").maybeSingle();
    if (row?.status === "processing") await failGeneration({ id: row.id }, "The conversation was cancelled before it started.");
    return NextResponse.json({ ok: true });
  }

  return fail("Unknown request.");
}
