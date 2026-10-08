import Link from "next/link";
import {
  LuAudioLines,
  LuCircleCheck,
  LuClock,
  LuDisc3,
  LuHistory,
  LuReceipt,
  LuShieldCheck,
  LuTriangleAlert,
  LuUserPlus,
  LuUsers,
} from "react-icons/lu";
import { getSessionProfile } from "@/lib/supabase/session";
import { fmtBdt, fmtNum, loadOverview, parseRange, pct } from "@/lib/admin/stats";
import { productUrl, getProduct } from "@/lib/products";
import { TOOLS } from "@/lib/studio/tools";
import { serviceName } from "@/lib/studio/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, HBars } from "@/components/admin-panel/charts";
import { StatCard } from "@/components/admin-panel/stat-card";
import { QuickReview } from "@/components/admin-panel/quick-review";
import { cn } from "@/lib/utils";

const ago = (iso: string) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

const PRODUCT_LABEL: Record<string, string> = { cms: "Channel Checker", studio: "AI Studio", distribution: "Music Distribution", topup: "Checker top-ups" };
const ACTION_LABEL: Record<string, string> = {
  approve: "approved",
  reject: "rejected",
  block: "blocked",
  unblock: "unblocked",
  delete: "deleted",
  bulk_approve: "approved several customers",
  bulk_reject: "rejected several customers",
  checker_credits_add: "added Checker credits for",
  checker_credits_remove: "removed Checker credits from",
  grant_service: "granted a Studio service to",
  revoke_service: "removed a Studio service",
  dashboard_on: "opened a dashboard for",
  dashboard_off: "closed a dashboard for",
  note: "wrote a note on",
};

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseRange((await searchParams).range);
  const [{ profile }, o] = await Promise.all([getSessionProfile(), loadOverview(range)]);

  const toolName = (kind: string) => TOOLS.find((t) => t.id === kind || (kind === "sfx" && t.id === "sound-effects"))?.name ?? kind;
  const failRate = o.studio.runs ? (o.studio.failed / o.studio.runs) * 100 : 0;
  const attention = o.pending.length + (o.held > 0 ? 1 : 0) + (o.studio.failed24 > 0 ? 1 : 0);
  const productRows = Object.entries(o.byProduct).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: PRODUCT_LABEL[k] ?? k, value: v }));

  type Activity = { at: string; icon: React.ReactNode; text: React.ReactNode; href?: string };
  const feed: Activity[] = [
    ...o.recent.orders.map((r) => ({
      at: r.paid_at as string,
      icon: <LuReceipt />,
      href: r.user_id ? `/admin/customers/${r.user_id}` : undefined,
      text: (
        <>
          <b className="font-medium">{r.email}</b> bought {serviceName(r.service as string)} {r.plan} for {fmtBdt(Number(r.bdt_amount))}
        </>
      ),
    })),
    ...o.recent.signups.map((r) => ({
      at: r.created_at as string,
      icon: <LuUserPlus />,
      href: `/admin/customers/${r.id}`,
      text: (
        <>
          <b className="font-medium">{r.full_name || r.email}</b> signed up
        </>
      ),
    })),
    ...o.recent.audit.map((r) => ({
      at: r.created_at as string,
      icon: <LuHistory />,
      href: r.target_user ? `/admin/customers/${r.target_user}` : "/admin/audit",
      text: (
        <>
          {r.admin_email ? <b className="font-medium">{(r.admin_email as string).split("@")[0]}</b> : "An admin"} {ACTION_LABEL[r.action as string] ?? r.action} {r.target_label ? <b className="font-medium">{r.target_label}</b> : null}
        </>
      ),
    })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 9);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}. Here is how the three dashboards are doing.
          </p>
        </div>
        <div className="flex rounded-lg border bg-muted/40 p-1 text-sm">
          {[7, 30, 90].map((d) => (
            <Link key={d} href={d === 30 ? "/admin" : `/admin?range=${d}`} className={cn("rounded-md px-3 py-1.5 transition-colors", d === range ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {d} days
            </Link>
          ))}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Revenue" value={fmtBdt(o.revenue)} delta={pct(o.revenue, o.revenuePrev)} sub={`${o.ordersPaid} payments`} spark={o.revenueSeries.map((p) => p.value)} icon={<LuReceipt />} href="/admin/orders" />
        <StatCard label="New customers" value={fmtNum(o.newCustomers)} delta={pct(o.newCustomers, o.newCustomersPrev)} sub={`last ${range} days`} spark={o.newSeries.map((p) => p.value)} icon={<LuUsers />} href="/admin/customers" />
        <StatCard
          label="Waiting for approval"
          value={fmtNum(o.pending.length >= 6 ? 6 : o.pending.length) + (o.pending.length >= 6 ? "+" : "")}
          sub={o.pending.length ? "Review them now" : "Nobody waiting"}
          icon={<LuClock />}
          href="/admin/customers?status=pending"
          tone={o.pending.length ? "attention" : "default"}
        />
        <StatCard label="AI Studio plans in use" value={fmtNum(o.studio.activePlans)} sub={`${o.studio.customers} customers`} icon={<LuAudioLines />} href="/admin/studio" />
        <StatCard label="Studio runs" value={fmtNum(o.studio.runs)} delta={pct(o.studio.runs, o.studio.runsPrev)} sub={`${o.studio.failed} failed (${Math.round(failRate)}%)`} spark={o.studio.series.map((p) => p.value)} icon={<LuAudioLines />} href="/admin/studio" />
        <StatCard label="Channel checks" value={fmtNum(o.checker.checks)} delta={pct(o.checker.checks, o.checker.checksPrev)} sub={`last ${range} days`} spark={o.checker.series.map((p) => p.value)} icon={<LuShieldCheck />} href="/admin/checks" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue</CardTitle>
            <CardDescription>Paid through SSLCommerz in BDT, each day of the last {range} days.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <BarChart data={o.revenueSeries} format={fmtBdt} height={220} />
            {productRows.length > 0 && (
              <div className="border-t pt-5">
                <p className="mb-3 text-sm font-medium">Where it came from</p>
                <HBars items={productRows} format={fmtBdt} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={cn(attention > 0 && "border-amber-500/40")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {attention > 0 ? <LuTriangleAlert className="size-4 text-amber-500" /> : <LuCircleCheck className="size-4 text-emerald-500" />}
              {attention > 0 ? "Needs your attention" : "All clear"}
            </CardTitle>
            <CardDescription>{attention > 0 ? "Things waiting on an admin." : "Nothing is waiting on you."}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {o.pending.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3">
                <Link href={`/admin/customers/${p.id}`} className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.full_name || p.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.email} · {ago(p.created_at as string)}
                  </p>
                </Link>
                <QuickReview userId={p.id} name={p.full_name || p.email} />
              </div>
            ))}
            {o.held > 0 && (
              <Link href="/admin/orders?status=held" className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5 text-sm hover:bg-muted/60">
                <span>{o.held} payment{o.held === 1 ? "" : "s"} held for review</span>
                <Badge variant="secondary">Open</Badge>
              </Link>
            )}
            {o.studio.failed24 > 0 && (
              <Link href="/admin/studio?status=failed" className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2.5 text-sm hover:bg-muted/60">
                <span>{o.studio.failed24} Studio run{o.studio.failed24 === 1 ? "" : "s"} failed in the last day</span>
                <Badge variant="secondary">Open</Badge>
              </Link>
            )}
            {attention === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No sign-ups waiting, no held payments and no failing runs.</p>}
            {o.blocked > 0 && <p className="text-xs text-muted-foreground">{o.blocked} blocked customer{o.blocked === 1 ? "" : "s"}.</p>}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {(
          [
            { id: "cms" as const, icon: <LuShieldCheck />, status: "Live", lines: [`${fmtNum(o.checker.checks)} checks`, `${fmtBdt(o.byProduct.cms ?? 0)} + ${fmtBdt(o.byProduct.topup ?? 0)} top-ups`], manage: "/admin/checks", manageLabel: "View checks" },
            { id: "studio" as const, icon: <LuAudioLines />, status: "Live", lines: [`${fmtNum(o.studio.runs)} runs, ${o.studio.failed} failed`, `${o.studio.customers} customers on ${o.studio.activePlans} plans`, `${fmtBdt(o.byProduct.studio ?? 0)} revenue`], manage: "/admin/studio", manageLabel: "View usage" },
            { id: "distribution" as const, icon: <LuDisc3 />, status: "Building", lines: ["Plans are on hold until the dashboard opens"], manage: "/admin/distribution", manageLabel: "See status" },
          ]
        ).map((d) => {
          const p = getProduct(d.id);
          const url = productUrl(p);
          return (
            <Card key={d.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span className="text-muted-foreground [&_svg]:size-4.5">{d.icon}</span>
                    {p.name}
                  </CardTitle>
                  <Badge variant={d.status === "Live" ? "default" : "outline"}>{d.status}</Badge>
                </div>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                  {d.lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" nativeButton={false} render={<Link href={d.manage} />}>
                    {d.manageLabel}
                  </Button>
                  {url && (
                    <Button variant="ghost" size="sm" nativeButton={false} render={<a href={url} target="_blank" rel="noreferrer" />}>
                      Open dashboard
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most used Studio tools</CardTitle>
            <CardDescription>Runs in the last {range} days.</CardDescription>
          </CardHeader>
          <CardContent>
            {o.studio.byTool.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No runs yet.</p>
            ) : (
              <HBars items={o.studio.byTool.slice(0, 8).map((t) => ({ label: toolName(t.label), value: t.value }))} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest activity</CardTitle>
            <CardDescription>Sign-ups, purchases and what admins did.</CardDescription>
          </CardHeader>
          <CardContent>
            {feed.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>
            ) : (
              <ul className="flex flex-col gap-3.5">
                {feed.map((a, i) => {
                  const row = (
                    <>
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground [&_svg]:size-4">{a.icon}</span>
                      <span className="min-w-0 flex-1 text-sm leading-snug">{a.text}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{ago(a.at)}</span>
                    </>
                  );
                  return (
                    <li key={i}>
                      {a.href ? (
                        <Link href={a.href} className="flex items-start gap-3 rounded-lg transition-opacity hover:opacity-80">
                          {row}
                        </Link>
                      ) : (
                        <div className="flex items-start gap-3">{row}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
