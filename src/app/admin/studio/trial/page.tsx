import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTrialConfig, trialState } from "@/lib/studio/trial";
import { TOOLS } from "@/lib/studio/tools";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatCard } from "@/components/admin-panel/stat-card";
import { TrialSettings } from "@/components/admin-panel/trial-settings";
import { TrialRowActions } from "@/components/admin-panel/trial-row-actions";

type Row = {
  user_id: string;
  service: string | null;
  started_at: string;
  expires_at: string;
  generations_used: number;
  spend_used: number;
  ended: boolean;
  profiles: { full_name: string | null; email: string } | null;
};

export default async function TrialPage() {
  const config = await getTrialConfig();
  const { data } = await createAdminClient()
    .from("studio_trials")
    .select("user_id, service, started_at, expires_at, generations_used, spend_used, ended, profiles:user_id(full_name, email)")
    .order("started_at", { ascending: false })
    .limit(300);
  const rows = (data ?? []) as unknown as Row[];
  const states = rows.map((r) => trialState({ ...r, generations_used: Number(r.generations_used), spend_used: Number(r.spend_used) }, config));
  const active = states.filter((s) => s.active).length;
  const spend = rows.reduce((n, r) => n + Number(r.spend_used), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Free trial</h1>
        <p className="mt-1 text-sm text-muted-foreground">The shared trial every new AI Studio customer can take once. Set the rules, and watch what it costs you.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Trials started" value={rows.length} />
        <StatCard label="Running now" value={active} />
        <StatCard label="Provider cost spent" value={`$${spend.toFixed(2)}`} sub="across all trials" />
        <StatCard label="Cost cap each" value={`$${config.max_spend.toFixed(2)}`} sub={`${config.max_generations} generations, ${config.days} days`} />
      </section>

      <TrialSettings
        config={{ enabled: config.enabled, days: config.days, max_generations: config.max_generations, max_spend: config.max_spend, limits: config.limits }}
        tools={TOOLS.filter((t) => t.href).map((t) => ({ id: t.id, name: t.name }))}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trial accounts</CardTitle>
          <CardDescription>Reset gives someone a fresh trial. It is the only way a trial starts again.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nobody has taken the trial yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Generations</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.user_id}>
                    <TableCell>
                      <Link href={`/admin/customers/${r.user_id}`} className="hover:underline">
                        {r.profiles?.full_name || r.profiles?.email}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(r.started_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={states[i].active ? "default" : "outline"}>{states[i].active ? "Running" : states[i].why === "ended" ? "Ended" : states[i].why === "expired" ? "Expired" : "Used up"}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.generations_used} / {config.max_generations}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">${Number(r.spend_used).toFixed(3)}</TableCell>
                    <TableCell className="text-right">
                      <TrialRowActions userId={r.user_id} ended={r.ended} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
