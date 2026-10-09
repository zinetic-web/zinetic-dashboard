import { Suspense } from "react";
import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { listVoices, hasElevenLabs } from "@/lib/studio/elevenlabs";
import { ToolPage } from "@/components/studio/tool-page";
import { WorkspaceSkeleton } from "@/components/studio/workspace-skeleton";
import { SpeechEngine, type AgentRow } from "@/components/studio/speech-engine";
import { MAX_AGENTS } from "@/lib/studio/limits";

async function Loaded() {
  const { user } = await getDashboardSession();
  const voices = await listVoices();
  let agents: AgentRow[] = [];
  if (user) {
    const { data } = await createAdminClient().from("studio_generations").select("id, title, input, created_at").eq("user_id", user.id).eq("kind", "speech-agent").order("created_at", { ascending: false });
    agents = (data ?? []).map((r) => {
      const i = (r.input ?? {}) as Partial<AgentRow>;
      return { id: r.id, name: r.title, voiceId: i.voiceId ?? "", voiceName: i.voiceName ?? "", firstMessage: i.firstMessage ?? "", instructions: i.instructions ?? "", language: i.language ?? "en", burst: Boolean(i.burst) };
    });
  }
  return <SpeechEngine agents={agents} voices={voices} maxAgents={MAX_AGENTS} />;
}

export default function Page() {
  return (
    <ToolPage toolId="speech-engine" notice={!hasElevenLabs() ? "ElevenLabs is not connected yet. Add ELEVENLABS_API_KEY to the environment and restart." : null}>
      <Suspense fallback={<WorkspaceSkeleton />}>
        <Loaded />
      </Suspense>
    </ToolPage>
  );
}
