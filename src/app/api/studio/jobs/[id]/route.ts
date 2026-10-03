import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { advanceJob, type JobRow } from "@/lib/studio/jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

// Long-running tools (video, dubbing) return straight away with a processing row. The page polls
// this route, which asks the provider and, once the file is ready, stores it and finishes the row.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getDashboardSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await createAdminClient().from("studio_generations").select("*").eq("id", id).eq("user_id", user.id).single();
  const row = data as JobRow | null;
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const r = await advanceJob(row);
  return NextResponse.json({ ...r, startedAt: row.created_at });
}
