import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { LocalTime } from "@/components/local-time";
import { createClient } from "@/lib/supabase/server";
import { TOOLS } from "@/lib/studio/tools";
import { AudioPlayer } from "@/components/studio/audio-player";
import { VideoPlayer } from "@/components/studio/video-player";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Row = {
  id: string;
  kind: string;
  title: string | null;
  status: string;
  mime_type: string | null;
  result: { text?: string } | null;
  error: string | null;
  created_at: string;
};

const KIND_TOOL: Record<string, string> = {
  sfx: "sound-effects",
  "translation-lipsync": "video-translation",
};
const toolName = (kind: string) => TOOLS.find((t) => t.id === (KIND_TOOL[kind] ?? kind))?.name ?? kind;

export default async function LibraryPage() {
  const { user } = await getDashboardSession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("studio_generations")
    .select("id, kind, title, status, mime_type, result, error, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">Everything you have generated, newest first.</p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">Nothing here yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Make something in any tool and it will land here.</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card size="sm" className="h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="line-clamp-1 text-sm">{r.title ?? "Untitled"}</CardTitle>
                      <CardDescription>
                        {toolName(r.kind)} · <LocalTime iso={r.created_at} />
                      </CardDescription>
                    </div>
                    {r.status !== "done" && <Badge variant={r.status === "failed" ? "destructive" : "secondary"}>{r.status === "failed" ? "Failed" : "Processing"}</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {r.status === "done" && r.mime_type?.startsWith("audio") && <AudioPlayer compact src={`/api/studio/files/${r.id}`} seed={r.id} name="audio.mp3" />}
                  {r.status === "done" && r.mime_type?.startsWith("video") && <VideoPlayer compact src={`/api/studio/files/${r.id}`} name="video.mp4" />}
                  {r.status === "done" && r.kind === "transcribe" && r.result?.text && <p className="line-clamp-4 text-sm text-muted-foreground">{r.result.text}</p>}
                  {r.status === "failed" && <p className="text-xs text-destructive">{r.error ?? "Failed"}</p>}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
