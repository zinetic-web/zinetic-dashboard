import { ToolPage } from "@/components/studio/tool-page";
import { hasHeyGen } from "@/lib/studio/heygen";
import { LipSyncForm } from "./form";

export default function Page() {
  return (
    <ToolPage toolId="lip-sync" notice={!hasHeyGen() ? "HeyGen is not connected yet. Add HEYGEN_API_KEY to the environment and restart." : null}>
      <LipSyncForm />
    </ToolPage>
  );
}
