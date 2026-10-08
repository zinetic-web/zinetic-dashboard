import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { createClient } from "@/lib/supabase/server";
import { LibraryView, type LibraryRow } from "@/components/studio/library-view";

export default async function LibraryPage() {
  const { user } = await getDashboardSession();
  const supabase = await createClient();
  const { data } = await supabase
    .from("studio_generations")
    .select("id, kind, title, status, mime_type, result, error, created_at, input")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = (data ?? []) as LibraryRow[];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">Everything you have made, in one place.</p>
      </div>
      <LibraryView rows={rows} />
    </div>
  );
}
