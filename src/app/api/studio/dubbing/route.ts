import { NextResponse } from "next/server";
import { readForm } from "@/lib/studio/uploads";
import { startTranslation } from "@/lib/studio/translate";
import { authorize, begin, fail, mb, mediaSeconds, minutesOf, refundAuthz, requireStudioUser, tooBig, uploadedFile } from "@/lib/studio/run";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const form = await readForm(request, auth.userId);
  const file = uploadedFile(form, "file");
  const language = String(form.get("language") ?? "");
  if (!file || !language) return fail("Upload a file and choose a language.");
  if (tooBig(file)) return fail("That file is too large.");

  const seconds = await mediaSeconds(file);
  const z = await authorize(auth.userId, "dubbing", String(form.get("engine") ?? ""), { seconds, fileMb: mb(file) }, "Dubbing", minutesOf(seconds));
  if ("error" in z) return z.error;

  // lip sync only applies when the engine offers it
  const lipsync = form.get("lipsync") !== "false" && z.authz.engine.features.includes("lipsync");
  const mode = form.get("mode") === "precision" ? "precision" : "speed";
  const speakers = Number(form.get("speakers")) || undefined;
  const dubbing = { version: z.authz.engine.key === "v2" ? ("v2" as const) : ("v1" as const), watermark: z.authz.engine.options?.watermark === true };
  const job = await startTranslation({ provider: z.authz.engine.provider, file, language, lipsync, mode, speakers: speakers && speakers >= 1 && speakers <= 10 ? Math.trunc(speakers) : undefined, dubbing });
  if (!job.ok) {
    await refundAuthz(z.authz);
    return fail(job.error, 502);
  }

  // processing rows are finished by /api/studio/jobs/[id]
  const g = await begin(auth.userId, "dubbing", job.provider, file.name, { filename: file.name, targetLang: language, lipsync, version: dubbing.version, watermark: dubbing.watermark }, job.jobId, z.authz);
  return NextResponse.json({ id: g.id });
}
