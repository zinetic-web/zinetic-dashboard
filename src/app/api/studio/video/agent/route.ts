import { NextResponse } from "next/server";
import { generateFromPrompt } from "@/lib/studio/heygen";
import { authorize, begin, fail, refundAuthz, requireStudioUser } from "@/lib/studio/run";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const b = (await request.json().catch(() => null)) as {
    prompt?: string;
    engine?: string;
    orientation?: "landscape" | "portrait";
    avatarId?: string;
    voiceId?: string;
    styleId?: string;
  } | null;
  const prompt = b?.prompt?.trim() ?? "";
  if (!prompt) return fail("Describe the video you want.");

  const z = await authorize(auth.userId, "prompt-video", b?.engine, { chars: prompt.length, seconds: 60 }, "Prompt to video", 1);
  if ("error" in z) return z.error;

  const job = await generateFromPrompt({
    prompt,
    orientation: b?.orientation === "portrait" || b?.orientation === "landscape" ? b.orientation : undefined,
    avatarId: b?.avatarId || undefined,
    voiceId: b?.voiceId || undefined,
    styleId: b?.styleId || undefined,
  });
  if (!job.ok) {
    await refundAuthz(z.authz);
    return fail(job.error, 502);
  }
  const g = await begin(auth.userId, "prompt-video", z.authz.engine.provider, prompt.slice(0, 80), { prompt, ...(b ?? {}) }, job.videoId, z.authz);
  return NextResponse.json({ id: g.id });
}
