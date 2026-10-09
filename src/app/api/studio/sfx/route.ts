import { NextResponse } from "next/server";
import { soundEffect } from "@/lib/studio/elevenlabs";
import { authorize, begin, fail, failGeneration, finishWithFile, requireStudioUser } from "@/lib/studio/run";

export const runtime = "nodejs";

/** A generation covers up to 20 seconds of sound. Longer effects use a little more, so the provider cost stays covered. */
const sfxUnits = (seconds?: number) => (seconds && seconds > 20 ? Math.round((seconds / 20) * 100) / 100 : 1);

export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const b = (await request.json().catch(() => null)) as { text?: string; seconds?: number; loop?: boolean; engine?: string } | null;
  const text = b?.text?.trim() ?? "";
  if (!text) return fail("Describe the sound you need.");
  const seconds = b?.seconds ? Math.min(30, Math.max(0.5, Number(b.seconds))) : undefined;

  const z = await authorize(auth.userId, "sound-effects", b?.engine, { chars: text.length, seconds: seconds ?? 5 }, "Sound effects", sfxUnits(seconds));
  if ("error" in z) return z.error;

  const g = await begin(auth.userId, "sfx", z.authz.engine.provider, text.slice(0, 80), { text, seconds, loop: Boolean(b?.loop) }, undefined, z.authz);
  const r = await soundEffect({ text, durationSeconds: seconds, loop: b?.loop, modelId: z.authz.engine.model ?? undefined });
  if (!r.ok) {
    await failGeneration(g, r.error);
    return fail(r.error, 502);
  }
  await finishWithFile(g, r.audio, r.mime);
  return NextResponse.json({ id: g.id });
}
