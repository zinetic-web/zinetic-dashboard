import { NextResponse } from "next/server";
import { textToSpeech, type VoiceSettings } from "@/lib/studio/elevenlabs";
import { authorize, begin, fail, failGeneration, finishWithFile, requireStudioUser } from "@/lib/studio/run";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const body = (await request.json().catch(() => null)) as { text?: string; voiceId?: string; engine?: string; settings?: VoiceSettings; language?: string; seed?: number; voiceName?: string } | null;
  const text = body?.text?.trim() ?? "";
  const voiceId = body?.voiceId?.trim() ?? "";
  if (!text || !voiceId) return fail("Enter some text and pick a voice.");

  const z = await authorize(auth.userId, "voice", body?.engine, { chars: text.length }, "Voice generator", text.length);
  if ("error" in z) return z.error;

  const g = await begin(auth.userId, "voice", z.authz.engine.provider, text.slice(0, 80), { text, voiceId, voiceName: typeof body?.voiceName === "string" ? body.voiceName.slice(0, 80) : null, settings: body?.settings ?? null, language: body?.language ?? null }, undefined, z.authz);
  const language = typeof body?.language === "string" && /^[a-z]{2,3}$/.test(body.language) ? body.language : undefined;
  const r = await textToSpeech({
    text,
    voiceId,
    modelId: z.authz.engine.model ?? undefined,
    settings: body?.settings,
    languageCode: language,
    seed: typeof body?.seed === "number" ? body.seed : undefined,
  });
  if (!r.ok) {
    await failGeneration(g, r.error);
    return fail(r.error, 502);
  }
  await finishWithFile(g, r.audio, r.mime);
  return NextResponse.json({ id: g.id });
}
