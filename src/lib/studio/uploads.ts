import { randomUUID } from "crypto";
import { deleteFile, readFile } from "@/lib/studio/storage";
import { MAX_UPLOAD_MB } from "@/lib/studio/run";

/** Where customers' uploads wait, under their own folder, until a tool picks them up. */
export const uploadKey = (userId: string, filename: string) => `uploads/${userId}/${randomUUID()}-${filename.replace(/[^\w.-]+/g, "_").slice(-80)}`;

type Meta = { key?: string; name?: string; type?: string; size?: number };
type Body = { fields?: Record<string, string>; uploads?: Record<string, Meta> };

/**
 * The inputs of a tool request as a FormData, however they arrived. A browser with cloud storage
 * uploads files straight to R2 and sends only their keys; otherwise the files come in the request
 * itself. Either way the tool routes read the same thing. Uploaded files are removed from storage
 * once they have been read.
 */
export async function readForm(request: Request, userId: string): Promise<FormData> {
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) return request.formData();

  const out = new FormData();
  try {
    const body = (await request.json()) as Body;
    for (const [k, v] of Object.entries(body.fields ?? {})) out.append(k, String(v));
    for (const [field, meta] of Object.entries(body.uploads ?? {})) {
      // a customer can only ever pick up their own uploads
      if (!meta.key || !meta.key.startsWith(`uploads/${userId}/`) || meta.key.includes("..")) continue;
      const bytes = await readFile(meta.key);
      if (bytes.length > MAX_UPLOAD_MB * 1024 * 1024) continue;
      out.append(field, new File([new Uint8Array(bytes)], meta.name || "upload", { type: meta.type || "application/octet-stream" }));
      void deleteFile(meta.key).catch(() => {});
    }
  } catch (e) {
    console.error("Could not read the uploaded files", e);
  }
  return out;
}
