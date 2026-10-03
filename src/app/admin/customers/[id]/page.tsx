import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import { notFound } from "next/navigation";
import { LuArrowLeft } from "react-icons/lu";
import { loadCustomer } from "@/lib/admin/customers";
import { fmtBdt } from "@/lib/admin/stats";
import { formatCredits } from "@/lib/credits";
import { serviceName } from "@/lib/studio/services";
import { TOOLS } from "@/lib/studio/tools";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AccessPanel } from "@/components/admin-panel/access-panel";
import { CustomerActions, CustomerNotes } from "@/components/admin-panel/customer-actions";
import { StatCard } from "@/components/admin-panel/stat-card";


const STATUS: Record<string, string> = {
  approved: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  pending: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

const ACTION: Record<string, string> = {
  approve: "Approved",
  reject: "Rejected",
  block: "Blocked",
  unblock: "Unblocked",
  checker_credits_add: "Added Checker credits",
  checker_credits_remove: "Removed Checker credits",
  grant_service: "Granted a Studio service",
  revoke_service: "Removed a Studio service",
  dashboard_on: "Opened a dashboard",
  dashboard_off: "Closed a dashboard",
  note: "Edited the note",
};

function OrderStatus({ status }: { status: string }) {
  if (status === "paid" || status === "valid") return <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">Paid</Badge>;
  if (status === "held") return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">Held</Badge>;
  if (status === "pending") return <Badge variant="secondary">Unpaid</Badge>;
  return <Badge variant="outline">{status === "cancelled" ? "Cancelled" : "Failed"}</Badge>;
}

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await loadCustomer(id);
  if (!c) notFound();
  const { profile: p } = c;
  const name = p.full_name || p.email;
  const activeServices = Object.values(c.summary).filter((s) => s.active).length;

  // one timeline from everything that happened to this customer
  const timeline = [
    ...c.transactions.map((t) => ({ at: t.created_at as string, label: `${Number(t.amount) >= 0 ? "+" : ""}${formatCredits(Number(t.amount))} Checker credits`, sub: (t.note as string) ?? String(t.type) })),
    ...c.runs.map((r) => ({
      at: r.created_at as string,
      label: `${TOOLS.find((t) => t.id === r.kind || (r.kind === "sfx" && t.id === "sound-effects"))?.name ?? r.kind} run ${r.status}`,
      sub: (r.title as string) ?? "",
    })),
    ...c.audit.map((a) => ({ at: a.created_at as string, label: ACTION[a.action as string] ?? String(a.action), sub: `by ${(a.admin_email as string | null) ?? "an admin"}` })),
  ]
    .sort((a, b) => (a.at < b.at ? 1 : -1))
    .slice(0, 40);

  const orders = [
    ...c.orders.map((o) => ({
      id: o.id as string,
      at: o.created_at as string,
      what: `${serviceName(o.service as string)} · ${o.plan}`,
      bdt: Number(o.bdt_amount),
      status: o.status as string,
      ref: o.tran_id as string,
    })),
    ...c.topups.map((t) => ({ id: t.id as string, at: t.created_at as string, what: "Checker credit top-up", bdt: Number(t.amount), status: t.status as string, ref: t.tran_id as string })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <LuArrowLeft className="size-4" /> All customers
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">{name.slice(0, 1).toUpperCase()}</span>
            <div>
              <h1 className="font-heading text-2xl font-semibold">{name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {p.email}
                <span>Joined {new Date(p.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                {STATUS[p.status] ? <Badge className={STATUS[p.status]}>{p.status === "pending" ? "Waiting" : "Approved"}</Badge> : <Badge variant="destructive">{p.status === "blocked" ? "Blocked" : "Rejected"}</Badge>}
              </p>
              {p.status === "blocked" && p.blocked_reason && <p className="mt-1 text-xs text-destructive">Blocked: {p.blocked_reason}</p>}
            </div>
          </div>
          <CustomerActions user={p} />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Checker credits" value={formatCredits(Number(p.wallet_balance))} sub={`${c.checkCount} checks run`} />
        <StatCard label="Studio services active" value={activeServices} sub={`${c.runCount} runs so far`} />
        <StatCard label="Total paid" value={fmtBdt(c.spent)} sub={`${orders.filter((o) => o.status === "paid" || o.status === "valid").length} payments`} />
        <StatCard label="Dashboards open" value={c.products.length} sub={c.products.length ? c.products.map((x) => (x === "cms" ? "Checker" : x === "studio" ? "Studio" : "Distribution")).join(", ") : "None"} />
      </section>

      <Tabs defaultValue="access">
        <TabsList>
          <TabsTrigger value="access">Dashboards and access</TabsTrigger>
          <TabsTrigger value="orders">Payments</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="account">Notes and account</TabsTrigger>
        </TabsList>

        <TabsContent value="access" className="pt-4">
          <AccessPanel
            userId={p.id}
            products={c.products}
            walletUsd={Number(p.wallet_balance)}
            transactions={c.transactions.map((t) => ({ id: t.id as string, type: t.type as string, amount: Number(t.amount), note: t.note as string | null, created_at: t.created_at as string }))}
            summary={c.summary}
            entitlements={c.entitlements}
          />
        </TabsContent>

        <TabsContent value="orders" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payments</CardTitle>
              <CardDescription>Plan purchases and Checker top-ups, newest first.</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No payments yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>What</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground"><LocalTime iso={o.at} /></TableCell>
                        <TableCell className="font-medium">{o.what}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtBdt(o.bdt)}</TableCell>
                        <TableCell>
                          <OrderStatus status={o.status} />
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{o.ref}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
              <CardDescription>Credits, Studio runs and what admins did, in one list.</CardDescription>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nothing yet.</p>
              ) : (
                <ul className="divide-y">
                  {timeline.map((t, i) => (
                    <li key={i} className="flex items-start justify-between gap-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{t.label}</p>
                        {t.sub && <p className="truncate text-xs text-muted-foreground">{t.sub}</p>}
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground"><LocalTime iso={t.at} /></span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="pt-4">
          <CustomerNotes user={p} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
