import { NextResponse } from "next/server";
import { composeMusic, listFinetunes } from "@/lib/studio/elevenlabs";
import { authorize, begin, fail, failGeneration, finishWithFile, refundAuthz, requireStudioUser } from "@/lib/studio/run";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const b = (await request.json().catch(() => null)) as { prompt?: string; seconds?: number; engine?: string; instrumental?: boolean; finetuneId?: string; seed?: number } | null;
  const prompt = b?.prompt?.trim() ?? "";
  if (!prompt) return fail("Describe the song you want.");
  const seconds = Math.min(300, Math.max(10, Number(b?.seconds) || 30));

  // a ready-made style has to be a real one, and it only works with the v2 model
  let finetuneId: string | undefined;
  if (b?.finetuneId) {
    const known = (await listFinetunes()).some((f) => f.id === b.finetuneId);
    if (!known) return fail("That style is not available.");
    finetuneId = b.finetuneId;
  }

  const z = await authorize(auth.userId, "music", b?.engine, { chars: prompt.length, seconds }, "Music generator", 1);
  if ("error" in z) return z.error;
  if (finetuneId && !z.authz.engine.features.includes("finetunes")) {
    await refundAuthz(z.authz);
    return fail("Ready-made styles need the Music v2 engine. Pick it from the engine list.");
  }

  const g = await begin(auth.userId, "music", z.authz.engine.provider, prompt.slice(0, 80), { prompt, seconds, instrumental: Boolean(b?.instrumental), finetuneId: finetuneId ?? null, seed: b?.seed ?? null }, undefined, z.authz);
  const r = await composeMusic({
    prompt,
    seconds,
    modelId: z.authz.engine.model ?? undefined,
    instrumental: Boolean(b?.instrumental),
    finetuneId,
    seed: typeof b?.seed === "number" ? b.seed : undefined,
  });
  if (!r.ok) {
    await failGeneration(g, r.error);
    return fail(r.error, 502);
  }
  await finishWithFile(g, r.audio, r.mime);
  return NextResponse.json({ id: g.id });
}
