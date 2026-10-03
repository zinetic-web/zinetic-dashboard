import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAvatarVideo, generatePhotoVideo, type Ratio, type VideoOptions } from "@/lib/studio/heygen";
import { authorize, begin, fail, refundAuthz, requireStudioUser } from "@/lib/studio/run";

export const runtime = "nodejs";

const RATIOS: Ratio[] = ["16:9", "9:16", "1:1", "4:5"];

export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const b = (await request.json().catch(() => null)) as {
    avatarId?: string;
    myAvatarId?: string;
    voiceId?: string;
    script?: string;
    ratio?: Ratio;
    engine?: string;
    resolution?: "720p" | "1080p";
    background?: string;
    captions?: boolean;
    speed?: number;
    pitch?: number;
    expressiveness?: "low" | "medium" | "high";
    motion?: string;
  } | null;
  const script = b?.script?.trim() ?? "";
  if (!script || !b?.voiceId || (!b.avatarId && !b.myAvatarId)) return fail("Choose an avatar, a voice and write a script.");
  const ratio = b.ratio && RATIOS.includes(b.ratio) ? b.ratio : "16:9";

  const options: VideoOptions = {
    resolution: b.resolution === "1080p" ? "1080p" : undefined,
    background: typeof b.background === "string" && /^#[0-9a-f]{6}$/i.test(b.background) ? { type: "color", value: b.background } : undefined,
    captions: Boolean(b.captions),
    speed: typeof b.speed === "number" ? b.speed : undefined,
    pitch: typeof b.pitch === "number" ? b.pitch : undefined,
  };

  let assetId: string | null = null;
  if (b.myAvatarId) {
    const { data } = await createAdminClient().from("studio_avatars").select("image_key").eq("id", b.myAvatarId).eq("user_id", auth.userId).single();
    if (!data) return fail("That avatar was not found.", 404);
    assetId = data.image_key;
  }

  const z = await authorize(auth.userId, "avatar-video", b.engine, { chars: script.length, seconds: Math.max(5, Math.round(script.length / 14)) }, "Avatar video", Math.max(0.1, Math.ceil((script.length / 800) * 100) / 100));
  if ("error" in z) return z.error;

  const job = assetId
    ? await generatePhotoVideo({
        assetId,
        voiceId: b.voiceId,
        script,
        ratio,
        ...options,
        expressiveness: b.expressiveness && ["low", "medium", "high"].includes(b.expressiveness) ? b.expressiveness : undefined,
        motion: b.motion?.trim().slice(0, 300) || undefined,
      })
    : await generateAvatarVideo({ avatarId: b.avatarId!, voiceId: b.voiceId, script, ratio, ...options });
  if (!job.ok) {
    await refundAuthz(z.authz);
    return fail(job.error, 502);
  }

  const g = await begin(auth.userId, "avatar-video", z.authz.engine.provider, script.slice(0, 80), { ...b, script }, job.videoId, z.authz);
  return NextResponse.json({ id: g.id });
}
