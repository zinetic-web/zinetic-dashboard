import { NextResponse } from "next/server";
import { readForm } from "@/lib/studio/uploads";
import { transcribe } from "@/lib/studio/elevenlabs";
import { authorize, begin, fail, failGeneration, finishWithResult, mb, mediaSeconds, minutesOf, requireStudioUser, tooBig, uploadedFile } from "@/lib/studio/run";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const form = await readForm(request, auth.userId);
  const file = uploadedFile(form, "file");
  if (!file) return fail("Upload an audio or video file.");
  if (tooBig(file)) return fail("That file is too large.");
  const language = String(form.get("language") ?? "") || undefined;

  const seconds = await mediaSeconds(file);
  const z = await authorize(auth.userId, "transcribe", String(form.get("engine") ?? ""), { seconds, fileMb: mb(file) }, "Speech to text", minutesOf(seconds));
  if ("error" in z) return z.error;
  // speaker labels are an engine feature: off when the engine does not list it
  const diarize = form.get("diarize") !== "false" && z.authz.engine.features.includes("speakers");

  const g = await begin(auth.userId, "transcribe", z.authz.engine.provider, file.name, { filename: file.name, language, diarize }, undefined, z.authz);
  const r = await transcribe({ file, filename: file.name, language, diarize, modelId: z.authz.engine.model ?? undefined });
  if (!r.ok) {
    await failGeneration(g, r.error);
    return fail(r.error, 502);
  }
  await finishWithResult(g, r.transcript);
  return NextResponse.json({ id: g.id, transcript: r.transcript });
}
