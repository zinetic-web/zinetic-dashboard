import { NextResponse } from "next/server";
import { startTranslation } from "@/lib/studio/translate";
import { authorize, begin, fail, mb, mediaSeconds, minutesOf, refundAuthz, requireStudioUser, tooBig, uploadedFile } from "@/lib/studio/run";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const form = await request.formData();
  const file = uploadedFile(form, "video");
  const language = String(form.get("language") ?? "");
  if (!file || !language) return fail("Upload a file and choose a language.");
  if (tooBig(file)) return fail("That file is too large.");

  const seconds = await mediaSeconds(file);
  const wantLipsync = form.get("lipsync") !== "false";
  const z = await authorize(
    auth.userId,
    "video-translation",
    String(form.get("engine") ?? ""),
    { seconds, fileMb: mb(file) },
    "Video translation",
    minutesOf(seconds),
    (engine) => (wantLipsync && engine.features.includes("lipsync") ? "translation-lipsync" : "video-translation")
  );
  if ("error" in z) return z.error;

  // lip sync only applies when the engine offers it
  const lipsync = form.get("lipsync") !== "false" && z.authz.engine.features.includes("lipsync");
  const mode = form.get("mode") === "precision" ? "precision" : "speed";
  const speakers = Number(form.get("speakers")) || undefined;
  const job = await startTranslation({ provider: z.authz.engine.provider, file, language, lipsync, mode, speakers: speakers && speakers >= 1 && speakers <= 10 ? Math.trunc(speakers) : undefined });
  if (!job.ok) {
    await refundAuthz(z.authz);
    return fail(job.error, 502);
  }

  // processing rows are finished by /api/studio/jobs/[id]
  const g = await begin(auth.userId, "video-translation", job.provider, file.name, { filename: file.name, targetLang: language, lipsync }, job.jobId, z.authz);
  return NextResponse.json({ id: g.id });
}
