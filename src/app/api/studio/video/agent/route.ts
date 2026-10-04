import { NextResponse } from "next/server";
import { generateFromPrompt } from "@/lib/studio/heygen";
import { authorize, begin, fail, refundAuthz, requireStudioUser } from "@/lib/studio/run";

export const runtime = "nodejs";

const DURATIONS = [15, 30, 45, 60, 90];
const MAX_CHARS = 8000;

/**
 * HeyGen's guide: "the prompt is the whole interface". So the length goes first, the picture of what the
 * video is comes next, and a pasted script is marked as the exact words to use.
 */
function brief(text: string, opts: { seconds?: number; orientation?: string; script: boolean }) {
  const shape = opts.orientation === "portrait" ? "vertical 9:16" : opts.orientation === "landscape" ? "wide 16:9" : "";
  const head = [opts.seconds ? `Make a ${opts.seconds}-second` : "Make a", shape, "video."].filter(Boolean).join(" ");
  return opts.script
    ? `${head}\n\nUse this exact script as the narration, word for word, with one scene for each paragraph:\n\n${text}`
    : `${head}\n\n${text}`;
}

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
    seconds?: number;
    script?: boolean;
  } | null;
  const text = b?.prompt?.trim() ?? "";
  if (!text) return fail("Describe the video you want.");
  if (text.length > MAX_CHARS) return fail(`Keep it under ${MAX_CHARS.toLocaleString()} characters.`);
  const seconds = b?.seconds && DURATIONS.includes(b.seconds) ? b.seconds : undefined;
  const orientation = b?.orientation === "portrait" || b?.orientation === "landscape" ? b.orientation : undefined;

  const z = await authorize(auth.userId, "prompt-video", b?.engine, { chars: text.length, seconds: seconds ?? 60 }, "Prompt to video", 1);
  if ("error" in z) return z.error;

  const job = await generateFromPrompt({
    prompt: brief(text, { seconds, orientation, script: Boolean(b?.script) }),
    orientation,
    avatarId: b?.avatarId || undefined,
    voiceId: b?.voiceId || undefined,
    styleId: b?.styleId || undefined,
  });
  if (!job.ok) {
    await refundAuthz(z.authz);
    return fail(job.error, 502);
  }
  const g = await begin(auth.userId, "prompt-video", z.authz.engine.provider, text.slice(0, 80), { prompt: text, seconds, orientation, script: Boolean(b?.script), styleId: b?.styleId ?? null }, job.videoId, z.authz);
  return NextResponse.json({ id: g.id });
}
