import { NextResponse } from "next/server";
import { searchLibrary, type LibraryQuery } from "@/lib/studio/elevenlabs";
import { requireStudioUser } from "@/lib/studio/run";

export const runtime = "nodejs";

const SORTS = ["trending", "created_date", "usage_character_count_1y", "cloned_by_count"] as const;
const text = (v: string | null, max = 60) => (v && v.length <= max ? v : undefined);

// The public voice library, searched on the server so the provider key never reaches the browser.
export async function GET(request: Request) {
  const auth = await requireStudioUser();
  if ("error" in auth) return auth.error;

  const sp = new URL(request.url).searchParams;
  const sort = sp.get("sort") as (typeof SORTS)[number] | null;
  const query: LibraryQuery = {
    search: text(sp.get("q"), 100),
    language: text(sp.get("language"), 10),
    gender: text(sp.get("gender"), 20),
    age: text(sp.get("age"), 20),
    accent: text(sp.get("accent"), 30),
    category: text(sp.get("category"), 30),
    useCase: text(sp.get("useCase"), 40),
    featured: sp.get("featured") === "1",
    sort: sort && SORTS.includes(sort) ? sort : "trending",
    page: Number(sp.get("page")) || 0,
    pageSize: 30,
  };
  return NextResponse.json(await searchLibrary(query));
}
