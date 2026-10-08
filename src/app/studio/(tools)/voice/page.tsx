import { Suspense } from "react";
import { listVoices, hasElevenLabs } from "@/lib/studio/elevenlabs";
import { ToolPage } from "@/components/studio/tool-page";
import { WorkspaceSkeleton } from "@/components/studio/workspace-skeleton";
import { VoiceForm } from "./voice-form";

async function Loaded({ text }: { text: string }) {
  return <VoiceForm voices={await listVoices()} initialText={text} />;
}

export default async function VoicePage({ searchParams }: { searchParams: Promise<{ text?: string }> }) {
  const { text } = await searchParams;
  return (
    <ToolPage toolId="voice" notice={!hasElevenLabs() ? "ElevenLabs is not connected yet. Add ELEVENLABS_API_KEY to the environment and restart." : null}>
      <Suspense fallback={<WorkspaceSkeleton />}>
        <Loaded text={(text ?? "").slice(0, 2000)} />
      </Suspense>
    </ToolPage>
  );
}
