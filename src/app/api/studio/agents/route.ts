import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAgent, deleteAgent, updateAgent, type AgentConfig } from "@/lib/studio/elevenlabs";
import { MAX_AGENTS } from "@/lib/studio/limits";
import { fail, requireStudioUser, toolOpen } from "@/lib/studio/run";

export const runtime = "nodejs";

type Body = { action?: string; id?: string; name?: string; voiceId?: string; voiceName?: string; firstMessage?: string; instructions?: string; language?: string; burst?: boolean };

function readConfig(b: Body): { config: AgentConfig; voiceName: string } | string {
  const name = b.name?.trim().slice(0, 80) ?? "";
  const instructions = b.instructions?.trim().slice(0, 4000) ?? "";
  const voiceId = b.voiceId?.trim().slice(0, 64) ?? "";
  const language = typeof b.language === "string" && /^[a-z]{2,3}$/.test(b.language) ? b.language : "en";
  if (!name) return "Give your agent a name.";
  if (!voiceId) return "Pick the voice your agent speaks with.";
  if (!instructions) return "Tell your agent who it is and how to behave.";
  return {
    config: { name, voiceId, instructions, language, firstMessage: b.firstMessage?.trim().slice(0, 300) || "Hello! How can I help you today?", burst: Boolean(b.burst) },
    voiceName: b.voiceName?.trim().slice(0, 80) ?? "",
  };
}

/** Create, change and delete the voice agents a customer has made. The agent itself lives with the provider. */
export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;
  const b = (await request.json().catch(() => null)) as Body | null;
  if (!b?.action) return fail("Unknown request.");
  const db = createAdminClient();

  if (b.action === "create" || b.action === "update") {
    if (!(await toolOpen(auth.userId, "speech-engine")).active) return fail("Add a Speech Engine plan to build an agent.", 403);
    const parsed = readConfig(b);
    if (typeof parsed === "string") return fail(parsed);

    if (b.action === "create") {
      const { count } = await db.from("studio_generations").select("id", { count: "exact", head: true }).eq("user_id", auth.userId).eq("kind", "speech-agent");
      if ((count ?? 0) >= MAX_AGENTS) return fail(`You can keep up to ${MAX_AGENTS} agents. Delete one to make another.`);
      const made = await createAgent(parsed.config);
      if (!made.ok) return fail(made.error, 502);
      const id = randomUUID();
      const { error } = await db.from("studio_generations").insert({
        id,
        user_id: auth.userId,
        kind: "speech-agent",
        provider: "elevenlabs",
        status: "done",
        title: parsed.config.name,
        provider_job_id: made.agentId,
        input: { ...parsed.config, voiceName: parsed.voiceName },
      });
      if (error) {
        await deleteAgent(made.agentId);
        return fail("Could not save the agent.", 500);
      }
      return NextResponse.json({ id });
    }

    const { data: row } = await db.from("studio_generations").select("id, provider_job_id").eq("id", b.id ?? "").eq("user_id", auth.userId).eq("kind", "speech-agent").maybeSingle();
    if (!row?.provider_job_id) return fail("That agent was not found.", 404);
    const done = await updateAgent(row.provider_job_id, parsed.config);
    if (!done.ok) return fail(done.error, 502);
    await db.from("studio_generations").update({ title: parsed.config.name, input: { ...parsed.config, voiceName: parsed.voiceName } }).eq("id", row.id);
    return NextResponse.json({ id: row.id });
  }

  if (b.action === "delete") {
    const { data: row } = await db.from("studio_generations").select("id, provider_job_id").eq("id", b.id ?? "").eq("user_id", auth.userId).eq("kind", "speech-agent").maybeSingle();
    if (!row) return fail("That agent was not found.", 404);
    if (row.provider_job_id) await deleteAgent(row.provider_job_id);
    await db.from("studio_generations").delete().eq("id", row.id);
    return NextResponse.json({ ok: true });
  }

  return fail("Unknown request.");
}
