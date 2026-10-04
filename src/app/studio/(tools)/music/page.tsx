import { hasElevenLabs, listFinetunes } from "@/lib/studio/elevenlabs";
import { ToolPage } from "@/components/studio/tool-page";
import { MusicForm } from "./form";

export default async function Page() {
  return (
    <ToolPage toolId="music" notice={!hasElevenLabs() ? "ElevenLabs is not connected yet. Add ELEVENLABS_API_KEY to the environment and restart." : null}>
      <MusicForm finetunes={await listFinetunes()} />
    </ToolPage>
  );
}
