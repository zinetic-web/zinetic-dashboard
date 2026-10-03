import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { advanceJob, type JobRow } from "@/lib/studio/jobs";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Finishes studio runs that are still waiting on a provider, whether or not anyone has the page open:
 * stores ready files, fails stuck or failed runs and gives their allowance back. Called every minute
 * by Supabase's pg_cron (see supabase/add_studio_jobs_cron.sql) with the same secret as the other cron.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data } = await createAdminClient()
    .from("studio_generations")
    .select("*")
    .eq("status", "processing")
    .not("provider_job_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(15);
  const rows = (data ?? []) as JobRow[];

  const results = await Promise.allSettled(rows.map((r) => advanceJob(r)));
  const done = results.filter((r) => r.status === "fulfilled" && r.value.status === "done").length;
  const failed = results.filter((r) => r.status === "fulfilled" && r.value.status === "failed").length;
  return NextResponse.json({ checked: rows.length, done, failed });
}
