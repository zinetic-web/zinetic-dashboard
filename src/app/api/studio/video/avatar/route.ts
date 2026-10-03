import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAvatarVideo, generatePhotoVideo } from "@/lib/studio/heygen";
import { authorize, begin, fail, refundAuthz, requireStudioUser } from "@/lib/studio/run";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const b = (await request.json().catch(() => null)) as {
    avatarId?: string;
    myAvatarId?: string;
    voiceId?: string;
    script?: string;
    ratio?: "16:9" | "9:16" | "1:1";
    engine?: string;
  } | null;
  const script = b?.script?.trim() ?? "";
  if (!script || !b?.voiceId || (!b.avatarId && !b.myAvatarId)) return fail("Choose an avatar, a voice and write a script.");

  let imageKey: string | null = null;
  if (b.myAvatarId) {
    const { data } = await createAdminClient()
      .from("studio_avatars")
      .select("image_key")
      .eq("id", b.myAvatarId)
      .eq("user_id", auth.userId)
      .single();
    if (!data) return fail("That avatar was not found.", 404);
    imageKey = data.image_key;
  }

  const z = await authorize(auth.userId, "avatar-video", b.engine, { chars: script.length, seconds: Math.max(5, Math.round(script.length / 14)) }, "Avatar video", Math.max(0.1, Math.ceil((script.length / 800) * 100) / 100));
  if ("error" in z) return z.error;

  const job = imageKey
    ? await generatePhotoVideo({ imageKey, voiceId: b.voiceId, script })
    : await generateAvatarVideo({ avatarId: b.avatarId!, voiceId: b.voiceId, script, ratio: b.ratio ?? "16:9" });
  if (!job.ok) {
    await refundAuthz(z.authz);
    return fail(job.error, 502);
  }

  const g = await begin(auth.userId, "avatar-video", z.authz.engine.provider, script.slice(0, 80), { ...b, script }, job.videoId, z.authz);
  return NextResponse.json({ id: g.id });
}
