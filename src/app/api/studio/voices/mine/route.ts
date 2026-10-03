import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { addLibraryVoice } from "@/lib/studio/elevenlabs";
import { fail, requireStudioUser } from "@/lib/studio/run";

export const runtime = "nodejs";

const COLUMNS = "voice_id, name, gender, age, accent, language, locale, use_case, description, preview_url, source";

/** The voices this customer has saved. */
export async function GET() {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;
  const { data } = await createAdminClient().from("studio_voices").select(COLUMNS).eq("user_id", auth.userId).order("created_at", { ascending: false });
  return NextResponse.json({ voices: data ?? [] });
}

type Body = {
  voiceId?: string;
  ownerId?: string;
  name?: string;
  gender?: string;
  age?: string;
  accent?: string;
  language?: string;
  locale?: string;
  useCase?: string;
  description?: string;
  previewUrl?: string;
};

/** Saves a library voice to "My voices", and makes it usable for speech. */
export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;
  const b = (await request.json().catch(() => null)) as Body | null;
  if (!b?.voiceId || !b.ownerId || !b.name) return fail("Pick a voice first.");

  const added = await addLibraryVoice({ ownerId: b.ownerId, voiceId: b.voiceId, name: b.name.slice(0, 80) });
  if (!added.ok) return fail(added.error, 502);

  const { error } = await createAdminClient().from("studio_voices").upsert({
    user_id: auth.userId,
    voice_id: b.voiceId,
    name: b.name.slice(0, 80),
    gender: b.gender ?? null,
    age: b.age ?? null,
    accent: b.accent ?? null,
    language: b.language ?? null,
    locale: b.locale ?? null,
    use_case: b.useCase ?? null,
    description: b.description?.slice(0, 300) ?? null,
    preview_url: b.previewUrl ?? null,
    source: "library",
  });
  if (error) return fail("Could not save the voice.", 500);
  return NextResponse.json({ ok: true });
}

/** Removes a voice from this customer's list only. */
export async function DELETE(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("Missing voice.");
  await createAdminClient().from("studio_voices").delete().eq("user_id", auth.userId).eq("voice_id", id);
  return NextResponse.json({ ok: true });
}
