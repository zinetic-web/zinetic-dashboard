import { createClient } from "@/lib/supabase/server";
import { TOOLS } from "@/lib/studio/tools";
import type { HistoryRow } from "@/components/studio/ui";

const KIND_TOOL: Record<string, string> = { sfx: "sound-effects", "translation-lipsync": "video-translation" };

/** Latest generations of the given kinds for the signed-in (or impersonated) user. */
export async function recentGenerations(userId: string, kinds: string[], limit = 6): Promise<(HistoryRow & { sub: string })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("studio_generations")
    .select("id, kind, title, status, mime_type, error, created_at, input")
    .eq("user_id", userId)
    .in("kind", kinds)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => {
    const input = (r.input ?? {}) as { voiceName?: string };
    const tool = TOOLS.find((t) => t.id === (KIND_TOOL[r.kind] ?? r.kind));
    return { id: r.id, title: r.title, status: r.status, mime_type: r.mime_type, error: r.error, created_at: r.created_at, sub: input.voiceName || tool?.name || "" };
  });
}
