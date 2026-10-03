import { NextResponse } from "next/server";
import { readForm } from "@/lib/studio/uploads";
import { startLipsync } from "@/lib/studio/heygen";
import { hostForHeyGen } from "@/lib/studio/translate";
import { authorize, begin, fail, mb, mediaSeconds, minutesOf, refundAuthz, requireStudioUser, tooBig, uploadedFile } from "@/lib/studio/run";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const form = await readForm(request, auth.userId);
  const video = uploadedFile(form, "video");
  const audio = uploadedFile(form, "audio");
  if (!video || !audio) return fail("Upload a video and the audio to match it to.");
  if (!video.type.startsWith("video")) return fail("The first file must be a video.");
  if (!audio.type.startsWith("audio")) return fail("The second file must be audio.");
  if (tooBig(video) || tooBig(audio)) return fail("That file is too large.");

  const seconds = await mediaSeconds(video);
  const z = await authorize(auth.userId, "lip-sync", String(form.get("engine") ?? ""), { seconds, fileMb: mb(video) }, "Lip sync", minutesOf(seconds));
  if ("error" in z) return z.error;

  const [v, a] = await Promise.all([hostForHeyGen(video), hostForHeyGen(audio)]);
  if (!v.ok || !a.ok) {
    await refundAuthz(z.authz);
    return fail(!v.ok ? v.error : !a.ok ? a.error : "Could not prepare the files.", 502);
  }

  const job = await startLipsync({ video: v.source, audio: a.source, mode: form.get("mode") === "precision" ? "precision" : "speed", enhance: form.get("enhance") === "true" });
  if (!job.ok) {
    await refundAuthz(z.authz);
    return fail(job.error, 502);
  }
  const g = await begin(auth.userId, "lip-sync", z.authz.engine.provider, video.name, { video: video.name, audio: audio.name }, job.lipsyncId, z.authz);
  return NextResponse.json({ id: g.id });
}
