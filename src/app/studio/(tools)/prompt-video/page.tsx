import { hasHeyGen } from "@/lib/studio/heygen";
import { ToolPage } from "@/components/studio/tool-page";
import { PromptVideoForm } from "./form";

export default async function Page({ searchParams }: { searchParams: Promise<{ prompt?: string }> }) {
  const { prompt } = await searchParams;
  return (
    <ToolPage toolId="prompt-video" notice={!hasHeyGen() ? "HeyGen is not connected yet. Add HEYGEN_API_KEY to the environment and restart." : null}>
      <PromptVideoForm initialPrompt={(prompt ?? "").slice(0, 2000)} />
    </ToolPage>
  );
}
