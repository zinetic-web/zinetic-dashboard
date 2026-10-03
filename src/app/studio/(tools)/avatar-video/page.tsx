import { Suspense } from "react";
import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { createClient } from "@/lib/supabase/server";
import { hasHeyGen } from "@/lib/studio/heygen";
import { ToolPage } from "@/components/studio/tool-page";
import { WorkspaceSkeleton } from "@/components/studio/workspace-skeleton";
import { AvatarVideoForm } from "./form";

async function Loaded() {
  const { user } = await getDashboardSession();
  const supabase = await createClient();
  const { data: mine } = await supabase.from("studio_avatars").select("id, name").eq("user_id", user!.id).order("created_at", { ascending: false });
  return <AvatarVideoForm mine={(mine ?? []).map((m) => ({ id: m.id, name: m.name, image: `/api/studio/files/${m.id}` }))} />;
}

export default function Page() {
  return (
    <ToolPage toolId="avatar-video" notice={!hasHeyGen() ? "HeyGen is not connected yet. Add HEYGEN_API_KEY to the environment and restart." : null}>
      <Suspense fallback={<WorkspaceSkeleton />}>
        <Loaded />
      </Suspense>
    </ToolPage>
  );
}
