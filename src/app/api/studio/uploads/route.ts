import { NextResponse } from "next/server";
import { fail, MAX_UPLOAD_MB, requireStudioUser } from "@/lib/studio/run";
import { signedUploadUrl, usesR2 } from "@/lib/studio/storage";
import { uploadKey } from "@/lib/studio/uploads";

export const runtime = "nodejs";

const ALLOWED = /^(audio|video|image)\//;

/**
 * Hands the browser a private link to upload one file straight to storage. Big files never pass
 * through this server, which is what lets a 200 MB video work. Without cloud storage it says so,
 * and the browser sends the file with the request instead.
 */
export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const b = (await request.json().catch(() => null)) as { name?: string; type?: string; size?: number } | null;
  const name = b?.name?.trim() ?? "";
  const type = b?.type || "application/octet-stream";
  const size = Number(b?.size);
  if (!name || !Number.isFinite(size) || size <= 0) return fail("That file could not be read.");
  if (size > MAX_UPLOAD_MB * 1024 * 1024) return fail(`Files can be up to ${MAX_UPLOAD_MB} MB.`);
  if (!ALLOWED.test(type) && type !== "application/octet-stream") return fail("Upload an audio, video or image file.");
  if (!usesR2) return NextResponse.json({ mode: "server" });

  const key = uploadKey(auth.userId, name);
  const url = await signedUploadUrl(key, { contentType: type, size });
  if (!url) return NextResponse.json({ mode: "server" });
  return NextResponse.json({ mode: "direct", key, url, type });
}
