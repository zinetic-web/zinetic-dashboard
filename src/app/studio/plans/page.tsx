import Link from "next/link";
import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { TOOLS } from "@/lib/studio/tools";
import { entitlementRows, summarize } from "@/lib/studio/entitlements";
import { planOption } from "@/lib/studio/plans";
import { STUDIO_SERVICES, serviceName } from "@/lib/studio/services";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, UsageBar } from "@/components/studio/plans";
import { ServicePlans } from "./service-plans";

export default async function MyPlansPage() {
  const { user } = await getDashboardSession();
  const summary = summarize(await entitlementRows(user!.id));

  // one row per thing that can be bought: what is active first, then everything else
  const rows = STUDIO_SERVICES.map((s) => ({ s, st: summary[s.id], tool: TOOLS.find((t) => t.id === s.tool)! })).sort(
    (a, b) => Number(Boolean(b.st?.active)) - Number(Boolean(a.st?.active))
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">My plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">What you bought, how much is left, and what you can add. Each service is its own plan.</p>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {rows.map(({ s, st, tool }) => {
          const Icon = tool.icon;
          const option = planOption(s.id);
          return (
            <li key={s.id}>
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg border bg-muted/40 [&_svg]:size-4.5">
                        <Icon />
                      </span>
                      <div>
                        <CardTitle className="text-base">{serviceName(s.id)}</CardTitle>
                        <CardDescription>{tool.blurb}</CardDescription>
                      </div>
                    </div>
                    <StatusBadge active={Boolean(st?.active)} hasPlan={Boolean(st)} />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {st ? (
                    <UsageBar usage={{ ...st, serviceName: serviceName(s.id) }} compact />
                  ) : (
                    <p className="text-sm text-muted-foreground">You have not bought this yet.</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    {st?.active && tool.href && (
                      <Button variant="outline" size="sm" render={<Link href={tool.href} />}>
                        Open
                      </Button>
                    )}
                    {option && <ServicePlans option={option} label={st ? "Add more" : "Get a plan"} />}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
