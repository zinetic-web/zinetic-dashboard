import { createAdminClient } from "@/lib/supabase/admin";
import { dubbingStatus, dubbingV2Status, downloadDub, downloadSigned } from "@/lib/studio/elevenlabs";
import { lipsyncStatus, translateStatus, videoStatus, type JobState } from "@/lib/studio/heygen";
import { failGeneration, finishWithFile } from "@/lib/studio/run";

export type JobRow = {
  id: string;
  user_id: string;
  kind: string;
  provider: string;
  title: string;
  status: string;
  provider_job_id: string | null;
  input: { targetLang?: string };
  error: string | null;
  created_at: string;
};

export type Advance = { status: "processing" | "done" | "failed"; error?: string | null; progress?: number; stage?: string };

// How long a job may stay unfinished before it is given up on and its allowance given back.
// A prompt video takes 5 to 10 times its own length, so it gets the longest wait.
const GIVE_UP_MINUTES: Record<string, number> = {
  "prompt-video": 150,
  "avatar-video": 90,
  "video-translation": 240,
  "translation-lipsync": 240,
  dubbing: 240,
  "lip-sync": 240,
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Downloads a finished video from the provider and stores it, trying a few times before giving up for now. */
async function store(g: { id: string; userId: string; kind: string; provider: string; title: string }, url: string): Promise<string | null> {
  let last = "download";
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download ${res.status}`);
      await finishWithFile(g, Buffer.from(await res.arrayBuffer()), res.headers.get("content-type") ?? "video/mp4");
      return null;
    } catch (e) {
      last = e instanceof Error ? e.message : "save";
      await wait(1500);
    }
  }
  return last;
}

/**
 * Asks the provider where a job stands and acts on it: stores the file when it is ready, fails the run
 * (and gives back what it cost) when the provider failed or the job has taken too long. Called both
 * by the page while it is open and by the background job, so a run finishes even if nobody is looking.
 */
export async function advanceJob(row: JobRow): Promise<Advance> {
  if (row.status !== "processing" || !row.provider_job_id) return { status: row.status as Advance["status"], error: row.error };

  const db = createAdminClient();
  const g = { id: row.id, userId: row.user_id, kind: row.kind, provider: row.provider, title: row.title };
  const ageMin = (Date.now() - new Date(row.created_at).getTime()) / 60000;
  const tooLong = ageMin > (GIVE_UP_MINUTES[row.kind] ?? 120);
  const giveUp = async (why: string): Promise<Advance> => {
    await failGeneration(g, why);
    return { status: "failed", error: why };
  };

  // dubbing and video translation run on either provider, the row remembers which
  if (row.provider === "elevenlabs" && row.provider_job_id.startsWith("v2:")) {
    const s = await dubbingV2Status(row.provider_job_id.slice(3));
    if (s.status === "failed") return giveUp(s.error ?? "Dubbing failed.");
    if (s.status === "done" && s.url) {
      // the link is only good for about an hour, so it is downloaded and stored at once
      const file = await downloadSigned(s.url);
      if (!file.ok) return tooLong ? giveUp(file.error) : { status: "processing", stage: "Saving your file" };
      await finishWithFile(g, file.audio, file.mime);
      return { status: "done" };
    }
    return tooLong ? giveUp("This took much longer than expected and was stopped. Nothing was used from your plan.") : { status: "processing", stage: "Dubbing in progress" };
  }

  if (row.provider === "elevenlabs") {
    const s = await dubbingStatus(row.provider_job_id);
    if (s.status === "failed") return giveUp(s.error ?? "Dubbing failed.");
    if (s.status === "done") {
      const file = await downloadDub(row.provider_job_id, row.input.targetLang ?? "en");
      if (!file.ok) return tooLong ? giveUp(file.error) : { status: "processing", stage: "Saving your file" };
      await finishWithFile(g, file.audio, file.mime);
      return { status: "done" };
    }
    return tooLong ? giveUp("This took much longer than expected and was stopped. Nothing was used from your plan.") : { status: "processing", stage: "Dubbing in progress" };
  }

  const isTranslation = row.kind === "dubbing" || row.kind === "video-translation" || row.kind === "translation-lipsync";
  const s: JobState = isTranslation ? await translateStatus(row.provider_job_id) : row.kind === "lip-sync" ? await lipsyncStatus(row.provider_job_id) : await videoStatus(row.provider_job_id);

  if (s.status === "failed") return giveUp(s.error ?? "The provider could not finish this.");
  if (s.status === "done" && s.url) {
    const problem = await store(g, s.url);
    if (!problem) return { status: "done" };
    await db.from("studio_generations").update({ error: `Could not save the finished file (${problem}). Trying again.` }).eq("id", row.id);
    return tooLong ? giveUp("Your file was made, but we could not save it. Nothing was used from your plan. Please try again.") : { status: "processing", stage: "Saving your file" };
  }
  return tooLong
    ? giveUp("This took much longer than expected and was stopped. Nothing was used from your plan. Please try again.")
    : { status: "processing", progress: s.progress, stage: s.stage };
}
