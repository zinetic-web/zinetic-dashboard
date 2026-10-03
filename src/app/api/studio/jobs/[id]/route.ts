import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { dubbingStatus, downloadDub } from "@/lib/studio/elevenlabs";
import { lipsyncStatus, translateStatus, videoStatus, type JobState } from "@/lib/studio/heygen";
import { failGeneration, finishWithFile } from "@/lib/studio/run";

export const runtime = "nodejs";
export const maxDuration = 300;

type Row = {
  id: string;
  user_id: string;
  kind: string;
  provider: string;
  title: string;
  status: string;
  provider_job_id: string | null;
  input: { targetLang?: string };
  error: string | null;
};

// Long-running tools (video, dubbing) return straight away with a processing
// row. The page polls this route, which asks the provider, and once the file
// is ready it is pulled into local storage and the row flips to done.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getDashboardSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data } = await db.from("studio_generations").select("*").eq("id", id).eq("user_id", user.id).single();
  const row = data as Row | null;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.status !== "processing" || !row.provider_job_id) {
    return NextResponse.json({ status: row.status, error: row.error });
  }

  const g = { id: row.id, userId: row.user_id, kind: row.kind, provider: row.provider, title: row.title };

  // dubbing and video translation run on either provider, the row remembers which
  if (row.provider === "elevenlabs") {
    const s = await dubbingStatus(row.provider_job_id);
    if (s.status === "failed") {
      await failGeneration(g, s.error ?? "Failed");
      return NextResponse.json({ status: "failed", error: s.error });
    }
    if (s.status === "done") {
      const file = await downloadDub(row.provider_job_id, row.input.targetLang ?? "en");
      if (!file.ok) {
        await failGeneration(g, file.error);
        return NextResponse.json({ status: "failed", error: file.error });
      }
      await finishWithFile(g, file.audio, file.mime);
      return NextResponse.json({ status: "done" });
    }
    return NextResponse.json({ status: "processing" });
  }

  const isTranslation = row.kind === "dubbing" || row.kind === "video-translation" || row.kind === "translation-lipsync";
  const s: JobState = isTranslation ? await translateStatus(row.provider_job_id) : row.kind === "lip-sync" ? await lipsyncStatus(row.provider_job_id) : await videoStatus(row.provider_job_id);

  if (s.status === "failed") {
    await failGeneration(g, s.error ?? "Failed");
    return NextResponse.json({ status: "failed", error: s.error });
  }
  if (s.status === "done" && s.url) {
    try {
      const res = await fetch(s.url);
      if (!res.ok) throw new Error("download");
      await finishWithFile(g, Buffer.from(await res.arrayBuffer()), res.headers.get("content-type") ?? "video/mp4");
      return NextResponse.json({ status: "done" });
    } catch {
      return NextResponse.json({ status: "processing" });
    }
  }
  return NextResponse.json({ status: "processing" });
}
