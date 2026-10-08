import { hasElevenLabs, listFinetunes } from "@/lib/studio/elevenlabs";
import { ToolPage } from "@/components/studio/tool-page";
import { MusicForm } from "./form";

export default async function Page({ searchParams }: { searchParams: Promise<{ prompt?: string }> }) {
  const { prompt } = await searchParams;
  return (
    <ToolPage toolId="music" notice={!hasElevenLabs() ? "ElevenLabs is not connected yet. Add ELEVENLABS_API_KEY to the environment and restart." : null}>
      <MusicForm finetunes={await listFinetunes()} initialPrompt={(prompt ?? "").slice(0, 1500)} />
    </ToolPage>
  );
}
