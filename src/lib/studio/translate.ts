import { randomUUID } from "crypto";
import { startDubbing } from "@/lib/studio/elevenlabs";
import { ASSET_LIMIT_MB, translateVideo, uploadAsset, type MediaSource } from "@/lib/studio/heygen";
import { saveFile, signedUrl, usesR2 } from "@/lib/studio/storage";

export type TranslationJob = { ok: true; provider: "elevenlabs" | "heygen"; jobId: string } | { ok: false; error: string };

/**
 * Gets a customer's file to HeyGen. Up to 32 MB it goes into HeyGen's asset store. Anything bigger
 * is parked in our own storage and HeyGen is given a private link that lasts a few hours (this
 * needs R2, which is how production stores media).
 */
export async function hostForHeyGen(file: File): Promise<{ ok: true; source: MediaSource } | { ok: false; error: string }> {
  if (file.size <= ASSET_LIMIT_MB * 1024 * 1024) {
    const up = await uploadAsset(file, file.name);
    return up.ok ? { ok: true, source: { assetId: up.assetId } } : up;
  }
  if (!usesR2) return { ok: false, error: `This engine accepts files up to ${ASSET_LIMIT_MB} MB right now.` };
  const key = `tmp/${randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_").slice(-60)}`;
  await saveFile(key, Buffer.from(await file.arrayBuffer()), file.type || "application/octet-stream");
  const url = await signedUrl(key, { seconds: 6 * 3600 });
  return url ? { ok: true, source: { url } } : { ok: false, error: "Could not prepare that file." };
}

/**
 * Dubbing and video translation are the same job on two providers, so both
 * tools start it here. The engine's provider decides who runs it.
 */
export async function startTranslation(opts: {
  provider: string;
  file: File;
  language: string;
  lipsync: boolean;
  /** HeyGen only: "precision" redraws faces more carefully and takes longer */
  mode?: "speed" | "precision";
  /** HeyGen only: how many people speak, when auto-detection gets it wrong */
  speakers?: number;
}): Promise<TranslationJob> {
  if (opts.provider === "elevenlabs") {
    const r = await startDubbing({ file: opts.file, filename: opts.file.name, targetLang: opts.language });
    return r.ok ? { ok: true, provider: "elevenlabs", jobId: r.dubbingId } : r;
  }
  if (opts.provider === "heygen") {
    if (!opts.file.type.startsWith("video")) return { ok: false, error: "This engine needs a video file. Audio files work with the other engine." };
    const hosted = await hostForHeyGen(opts.file);
    if (!hosted.ok) return hosted;
    const r = await translateVideo({ video: hosted.source, language: opts.language, audioOnly: !opts.lipsync, mode: opts.mode, speakers: opts.speakers });
    return r.ok ? { ok: true, provider: "heygen", jobId: r.translateId } : r;
  }
  return { ok: false, error: "This engine is not available." };
}
