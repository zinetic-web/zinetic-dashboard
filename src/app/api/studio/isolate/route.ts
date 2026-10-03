import { NextResponse } from "next/server";
import { readForm } from "@/lib/studio/uploads";
import { isolateAudio } from "@/lib/studio/elevenlabs";
import { authorize, begin, fail, failGeneration, finishWithFile, mb, mediaSeconds, minutesOf, requireStudioUser, tooBig, uploadedFile } from "@/lib/studio/run";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const form = await readForm(request, auth.userId);
  const file = uploadedFile(form, "audio");
  if (!file) return fail("Upload the audio you want cleaned.");
  if (tooBig(file)) return fail("That file is too large.");

  const seconds = await mediaSeconds(file);
  const z = await authorize(auth.userId, "audio-cleaner", String(form.get("engine") ?? ""), { seconds, fileMb: mb(file) }, "Audio cleaner", minutesOf(seconds));
  if ("error" in z) return z.error;

  const g = await begin(auth.userId, "audio-cleaner", z.authz.engine.provider, file.name, { filename: file.name }, undefined, z.authz);
  const r = await isolateAudio({ audio: file, filename: file.name });
  if (!r.ok) {
    await failGeneration(g, r.error);
    return fail(r.error, 502);
  }
  await finishWithFile(g, r.audio, r.mime);
  return NextResponse.json({ id: g.id });
}
