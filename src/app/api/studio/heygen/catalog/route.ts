import { NextResponse } from "next/server";
import { listAgentStyles, listLooks, listTranslateLanguages, listVoicePage } from "@/lib/studio/heygen";
import { requireStudioUser } from "@/lib/studio/run";

export const runtime = "nodejs";

const text = (v: string | null, max = 60) => (v && v.length <= max ? v : undefined);

// Avatars, voices, styles and languages, read on the server so the provider key stays private.
// Long lists come back a page at a time, with `next` to ask for the following page.
export async function GET(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;
  const sp = new URL(request.url).searchParams;
  const type = sp.get("type");
  const token = text(sp.get("token"), 2000);

  if (type === "looks") return NextResponse.json(await listLooks({ avatarType: text(sp.get("avatarType")), token, limit: 48 }));
  if (type === "voices") return NextResponse.json(await listVoicePage({ language: text(sp.get("language")), gender: text(sp.get("gender"), 10), token, limit: 50 }));
  if (type === "styles") return NextResponse.json(await listAgentStyles({ tag: text(sp.get("tag")), token }));
  if (type === "languages") return NextResponse.json({ items: await listTranslateLanguages() });
  return NextResponse.json({ error: "Unknown catalog" }, { status: 400 });
}
