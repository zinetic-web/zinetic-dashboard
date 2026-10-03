import { NextResponse } from "next/server";
import { readForm } from "@/lib/studio/uploads";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadAsset } from "@/lib/studio/heygen";
import { saveFile } from "@/lib/studio/storage";
import { authorize, extFor, fail, mb, refundAuthz, requireStudioUser, tooBig, uploadedFile } from "@/lib/studio/run";

export const runtime = "nodejs";

// Creates a reusable photo avatar: the photo goes to the provider (its image key is
// what photo videos use) and a copy stays in our own storage for the preview.
export async function POST(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const form = await readForm(request, auth.userId);
  const photo = uploadedFile(form, "photo");
  const name = String(form.get("name") ?? "").trim();
  if (!photo || !name) return fail("Add a name and a clear front-facing photo.");
  if (!photo.type.startsWith("image/")) return fail("The avatar must be an image.");
  if (tooBig(photo)) return fail("That photo is too large.");

  const z = await authorize(auth.userId, "avatar-creator", String(form.get("engine") ?? ""), { fileMb: mb(photo) }, "Avatar creator", 1);
  if ("error" in z) return z.error;

  const up = await uploadAsset(photo, photo.name || "avatar.jpg");
  if (!up.ok) {
    await refundAuthz(z.authz);
    return fail(up.error, 502);
  }

  const id = randomUUID();
  const ext = extFor(photo.type);
  const fileKey = `${auth.userId}/avatars/${id}.${ext === "bin" ? "jpg" : ext}`;
  await saveFile(fileKey, Buffer.from(await photo.arrayBuffer()), photo.type || "image/jpeg");
  await createAdminClient()
    .from("studio_avatars")
    .insert({ id, user_id: auth.userId, name, image_key: up.assetId, preview_file_key: fileKey });
  return NextResponse.json({ id });
}
