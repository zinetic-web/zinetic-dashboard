import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { readFile, signedUrl } from "@/lib/studio/storage";

export const runtime = "nodejs";

// RLS on studio_generations and studio_avatars means a user can only ever
// resolve their own rows (admins can see all).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  let key: string | null = null;
  let mime = "application/octet-stream";

  const { data: gen } = await supabase.from("studio_generations").select("file_key, mime_type").eq("id", id).maybeSingle();
  if (gen?.file_key) {
    key = gen.file_key;
    mime = gen.mime_type ?? mime;
  } else {
    const { data: avatar } = await supabase.from("studio_avatars").select("preview_file_key").eq("id", id).maybeSingle();
    if (avatar?.preview_file_key) {
      const pk: string = avatar.preview_file_key;
      key = pk;
      mime = pk.endsWith(".png") ? "image/png" : pk.endsWith(".webp") ? "image/webp" : "image/jpeg";
    }
  }
  if (!key) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const fileKey: string = key;

  // In R2 the browser fetches the file straight from the bucket with a short-lived private link: it
  // supports seeking, and large videos never pass through this function. The checks above already
  // proved the file belongs to the signed-in customer.
  const link = await signedUrl(fileKey, { contentType: mime }).catch(() => null);
  if (link) return NextResponse.redirect(link, { status: 302, headers: { "Cache-Control": "private, max-age=300" } });

  let data: Buffer;
  try {
    data = await readFile(fileKey);
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }

  const headers: Record<string, string> = {
    "Content-Type": mime,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  };

  // byte ranges let video and audio players seek
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range) {
    const start = range[1] ? parseInt(range[1], 10) : 0;
    const end = range[2] ? Math.min(parseInt(range[2], 10), data.length - 1) : data.length - 1;
    if (start <= end && start < data.length) {
      return new NextResponse(new Uint8Array(data.subarray(start, end + 1)), {
        status: 206,
        headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${data.length}`, "Content-Length": String(end - start + 1) },
      });
    }
  }
  return new NextResponse(new Uint8Array(data), { headers: { ...headers, "Content-Length": String(data.length) } });
}
