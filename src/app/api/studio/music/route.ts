import { NextResponse } from "next/server";
import { composeMusic } from "@/lib/studio/elevenlabs";
import { entitlementRows, hasPaidAccess } from "@/lib/studio/entitlements";
import { authorize, begin, fail, failGeneration, finishWithFile, requireStudioUser } from "@/lib/studio/run";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const b = (await request.json().catch(() => null)) as { prompt?: string; seconds?: number; engine?: string } | null;
  const prompt = b?.prompt?.trim() ?? "";
  if (!prompt) return fail("Describe the song you want.");
  // someone on the free trial gets one track of up to a minute
  const trialOnly = !hasPaidAccess(await entitlementRows(auth.userId), "music-generator");
  const seconds = Math.min(trialOnly ? 60 : 300, Math.max(10, Number(b?.seconds) || 30));

  const z = await authorize(auth.userId, "music", b?.engine, { chars: prompt.length, seconds }, "Music generator", 1);
  if ("error" in z) return z.error;

  const g = await begin(auth.userId, "music", z.authz.engine.provider, prompt.slice(0, 80), { prompt, seconds }, undefined, z.authz);
  const r = await composeMusic({ prompt, seconds, modelId: z.authz.engine.model ?? undefined });
  if (!r.ok) {
    await failGeneration(g, r.error);
    return fail(r.error, 502);
  }
  await finishWithFile(g, r.audio, r.mime);
  return NextResponse.json({ id: g.id });
}
