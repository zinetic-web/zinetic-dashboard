import { NextResponse } from "next/server";
import { readForm } from "@/lib/studio/uploads";
import { ENTITY_KINDS, transcribe } from "@/lib/studio/elevenlabs";
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

  // add-ons: key terms (+20%) and entity detection (+30%) are extra provider cost, so they use a little more of the plan
  const keyterms = String(form.get("keyterms") ?? "")
    .split(/[\n,]/)
    .map((t) => t.trim().replace(/[<>{}\[\]\\]/g, ""))
    .filter((t) => t && t.length <= 50 && t.split(/\s+/).length <= 5)
    .slice(0, 100);
  const allowed = new Set<string>(ENTITY_KINDS.map((k) => k.value));
  const entities = form.getAll("entities").map(String).filter((e) => allowed.has(e));
  const entityList = entities.includes("all") ? ["all"] : entities;
  const extra = (keyterms.length ? 0.2 : 0) + (entityList.length ? 0.3 : 0);

  const seconds = await mediaSeconds(file);
  const engineKey = String(form.get("engine") ?? "");
  if (engineKey === "realtime") return fail("Live transcription runs from the microphone on the Speech to text page.");
  const z = await authorize(auth.userId, "transcribe", engineKey, { seconds, fileMb: mb(file) }, "Speech to text", Math.round(minutesOf(seconds) * (1 + extra) * 1000) / 1000);
  if ("error" in z) return z.error;
  // speaker labels are an engine feature: off when the engine does not list it
  const diarize = form.get("diarize") !== "false" && z.authz.engine.features.includes("speakers");

  const g = await begin(auth.userId, "transcribe", z.authz.engine.provider, file.name, { filename: file.name, language, diarize, keyterms: keyterms.length, entities: entityList }, undefined, z.authz);
  const r = await transcribe({ file, filename: file.name, language, diarize, modelId: z.authz.engine.model ?? undefined, keyterms, entities: entityList });
  if (!r.ok) {
    await failGeneration(g, r.error);
    return fail(r.error, 502);
  }
  await finishWithResult(g, r.transcript);
  return NextResponse.json({ id: g.id, transcript: r.transcript });
}
