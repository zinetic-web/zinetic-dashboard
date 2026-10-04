import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import { LuAudioLines } from "react-icons/lu";
import { createAdminClient } from "@/lib/supabase/admin";
import { seriesByDay, fmtNum } from "@/lib/admin/stats";
import { TOOLS } from "@/lib/studio/tools";
import { formatUnits, servicesForTool, serviceName } from "@/lib/studio/services";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, HBars } from "@/components/admin-panel/charts";
import { StatCard } from "@/components/admin-panel/stat-card";
import { heygenBalance } from "@/lib/studio/heygen";
import { cn } from "@/lib/utils";

type Row = {
  id: string;
  kind: string;
  provider: string;
  engine_key: string | null;
  service: string | null;
  units: number;
  status: string;
  title: string | null;
  error: string | null;
  created_at: string;
  user_id: string;
  profiles: { full_name: string | null; email: string } | null;
};

const toolOf = (kind: string) => TOOLS.find((t) => t.id === kind || (kind === "sfx" && t.id === "sound-effects") || (kind === "translation-lipsync" && t.id === "video-translation"));

export default async function AdminStudioPage({ searchParams }: { searchParams: Promise<{ status?: string; tool?: string }> }) {
  const sp = await searchParams;
  const status = ["done", "failed", "processing"].includes(sp.status ?? "") ? sp.status! : "all";
  const db = createAdminClient();
  // eslint-disable-next-line react-hooks/purity -- server component, evaluated fresh per request
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  let list = db
    .from("studio_generations")
    .select("id, kind, provider, engine_key, service, units, status, title, error, created_at, user_id, profiles:user_id(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") list = list.eq("status", status);
  if (sp.tool) list = list.eq("kind", sp.tool);

  const [{ data }, { data: recent }, hgBalance] = await Promise.all([list, db.from("studio_generations").select("kind, status, created_at, user_id").gte("created_at", since), heygenBalance()]);
  const rows = (data ?? []) as unknown as Row[];
  const r30 = recent ?? [];

  const total = r30.length;
  const failed = r30.filter((r) => r.status === "failed").length;
  const customers = new Set(r30.map((r) => r.user_id)).size;
  const byTool: Record<string, number> = {};
  for (const r of r30) byTool[r.kind] = (byTool[r.kind] ?? 0) + 1;

  const tab = (id: string, label: string) => (
    <Link
      key={id}
      href={id === "all" ? "/admin/studio" : `/admin/studio?status=${id}`}
      className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", status === id ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">AI Studio usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every run across all customers, what it drew from their plan, and what failed.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Runs, last 30 days" value={fmtNum(total)} spark={seriesByDay(r30, (r) => r.created_at, () => 1, 30).map((p) => p.value)} icon={<LuAudioLines />} />
        <StatCard label="Succeeded" value={total ? `${Math.round(((total - failed) / total) * 100)}%` : "-"} sub={`${fmtNum(total - failed)} runs`} />
        <StatCard label="Failed" value={fmtNum(failed)} sub="credited back to the plan automatically" href="/admin/studio?status=failed" tone={failed ? "attention" : "default"} />
        <StatCard label="Customers using it" value={fmtNum(customers)} sub="last 30 days" />
        <StatCard label="HeyGen credit left" value={hgBalance === null ? "-" : `$${hgBalance.toFixed(2)}`} sub={hgBalance !== null && hgBalance < 10 ? "Low: top up so videos keep working" : "pays for every video and translation"} tone={hgBalance !== null && hgBalance < 10 ? "attention" : "default"} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Runs per day</CardTitle>
            <CardDescription>Last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={seriesByDay(r30, (r) => r.created_at, () => 1, 30)} height={190} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By tool</CardTitle>
            <CardDescription>Which tools get used.</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(byTool).length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No runs yet.</p>
            ) : (
              <HBars items={Object.entries(byTool).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => ({ label: toolOf(k)?.name ?? k, value: v }))} />
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Runs</CardTitle>
              <CardDescription>Latest 200{sp.tool ? ` for ${toolOf(sp.tool)?.name ?? sp.tool}` : ""}.</CardDescription>
            </div>
            <div className="flex rounded-lg border bg-muted/40 p-1">
              {tab("all", "All")}
              {tab("done", "Done")}
              {tab("failed", "Failed")}
              {tab("processing", "Processing")}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No runs match.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Tool</TableHead>
                  <TableHead>Engine</TableHead>
                  <TableHead className="text-right">Used from plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Input</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const svc = r.service ? servicesForTool(toolOf(r.kind)?.id ?? "").find((s) => s.id === r.service) : null;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground"><LocalTime iso={r.created_at} mode="short" /></TableCell>
                      <TableCell>
                        <Link href={`/admin/customers/${r.user_id}`} className="hover:underline">
                          {r.profiles?.full_name || r.profiles?.email}
                        </Link>
                      </TableCell>
                      <TableCell>{toolOf(r.kind)?.name ?? r.kind}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.engine_key ?? "-"} ({r.provider})
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{svc && Number(r.units) > 0 ? formatUnits(Number(r.units), svc.unit) : r.service ? `${Number(r.units)} · ${serviceName(r.service)}` : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "failed" ? "destructive" : r.status === "done" ? "secondary" : "outline"}>{r.status === "done" ? "Done" : r.status === "failed" ? "Failed" : "Processing"}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">{r.status === "failed" ? (r.error ?? "") : (r.title ?? "")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
