"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { LuCheck, LuDisc3, LuSearch, LuShieldCheck, LuAudioLines, LuX } from "react-icons/lu";
import { bulkReview } from "@/app/actions/admin-panel";
import { reviewUser } from "@/app/actions/admin";
import { usePagination } from "@/hooks/use-pagination";
import { formatCredits } from "@/lib/credits";
import type { CustomerRow } from "@/lib/admin/customers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DeleteCustomerDialog } from "@/components/admin-panel/delete-customer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { cn } from "@/lib/utils";

type Status = "all" | "pending" | "approved" | "blocked" | "rejected";
type Dash = "all" | "cms" | "studio" | "distribution";

const PAGE = 20;

function StatusBadge({ status }: { status: CustomerRow["status"] }) {
  if (status === "approved") return <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">Approved</Badge>;
  if (status === "pending") return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">Waiting</Badge>;
  if (status === "rejected") return <Badge variant="outline">Rejected</Badge>;
  return <Badge variant="destructive">Blocked</Badge>;
}

const DASH_ICON: Record<string, React.ReactNode> = { cms: <LuShieldCheck />, studio: <LuAudioLines />, distribution: <LuDisc3 /> };
const DASH_NAME: Record<string, string> = { cms: "Channel Checker", studio: "AI Studio", distribution: "Music Distribution" };

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** Everyone in one list: filter by who is waiting, which dashboard they have, search, and approve in bulk. */
export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const initial = (params.get("status") as Status) || "all";
  const [status, setStatus] = React.useState<Status>(["pending", "approved", "blocked", "rejected"].includes(initial) ? initial : "all");
  const [dash, setDash] = React.useState<Dash>("all");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [pending, startTransition] = React.useTransition();

  const counts = React.useMemo(() => {
    const c = { all: rows.length, pending: 0, approved: 0, blocked: 0, rejected: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (status === "all" || r.status === status) && (dash === "all" || r.products.includes(dash)) && (!q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)));
  }, [rows, status, dash, query]);

  const { page, setPage, pageCount, pageItems } = usePagination(filtered, PAGE);

  const waitingSelected = [...selected].filter((id) => rows.find((r) => r.id === id)?.status === "pending");
  const allOnPage = pageItems.length > 0 && pageItems.every((r) => selected.has(r.id));

  function toggleAll(on: boolean) {
    setSelected((s) => {
      const n = new Set(s);
      pageItems.forEach((r) => (on ? n.add(r.id) : n.delete(r.id)));
      return n;
    });
  }

  function bulk(decision: "approved" | "rejected") {
    startTransition(async () => {
      const res = await bulkReview(waitingSelected, decision);
      if (res.error) return void toast.error(res.error);
      toast.success(`${waitingSelected.length} customer${waitingSelected.length === 1 ? "" : "s"} ${decision}`);
      setSelected(new Set());
      router.refresh();
    });
  }

  function one(id: string, name: string, decision: "approved" | "rejected") {
    startTransition(async () => {
      const res = await reviewUser(id, decision);
      if (res.error) return void toast.error(res.error);
      toast.success(`${name} ${decision}`);
      router.refresh();
    });
  }

  const tabs: { id: Status; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pending", label: "Waiting" },
    { id: "approved", label: "Approved" },
    { id: "blocked", label: "Blocked" },
    { id: "rejected", label: "Rejected" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border bg-muted/40 p-1 text-sm">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setStatus(t.id);
                setSelected(new Set());
              }}
              className={cn("flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors", status === t.id ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              {t.label}
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", t.id === "pending" && counts.pending > 0 ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground")}>{counts[t.id]}</span>
            </button>
          ))}
        </div>

        <div className="flex rounded-lg border bg-muted/40 p-1 text-sm">
          {(["all", "cms", "studio"] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDash(d)} className={cn("cursor-pointer rounded-md px-3 py-1.5 transition-colors", dash === d ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {d === "all" ? "Any dashboard" : DASH_NAME[d]}
            </button>
          ))}
        </div>

        <div className="relative ml-auto w-full sm:w-72">
          <LuSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" className="pl-9" />
        </div>
      </div>

      {waitingSelected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
          <span className="font-medium">{waitingSelected.length} waiting selected</span>
          <Button size="sm" onClick={() => bulk("approved")} disabled={pending}>
            <LuCheck /> Approve all
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulk("rejected")} disabled={pending}>
            <LuX /> Reject all
          </Button>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto cursor-pointer text-muted-foreground hover:text-foreground">
            Clear
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-lg border py-14 text-center text-sm text-muted-foreground">No customers match.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allOnPage} onCheckedChange={(v) => toggleAll(v === true)} aria-label="Select this page" />
                </TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dashboards</TableHead>
                <TableHead className="text-right">Checker</TableHead>
                <TableHead className="text-right">Studio</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="hidden 2xl:table-cell">Joined</TableHead>
                <TableHead className="w-44 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((r) => (
                <TableRow key={r.id} className="group">
                  <TableCell>
                    <Checkbox checked={selected.has(r.id)} onCheckedChange={(v) => setSelected((s) => { const n = new Set(s); if (v === true) n.add(r.id); else n.delete(r.id); return n; })} aria-label={`Select ${r.email}`} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/customers/${r.id}`} className="block">
                      <span className="block font-medium group-hover:underline">{r.name || r.email}</span>
                      {r.name && <span className="block text-xs text-muted-foreground">{r.email}</span>}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1.5 text-muted-foreground [&_svg]:size-4">
                      {r.products.length === 0 && <span className="text-xs">None</span>}
                      {r.products.map((p) => (
                        <span key={p} title={DASH_NAME[p]}>
                          {DASH_ICON[p]}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCredits(r.walletUsd)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.studioActive}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.spent > 0 ? `৳${Math.round(r.spent).toLocaleString("en-US")}` : "-"}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground 2xl:table-cell">{when(r.joined)}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1.5">
                    {r.status === "pending" ? (
                      <>
                        <Button size="sm" onClick={() => one(r.id, r.name || r.email, "approved")} disabled={pending}>
                          Approve
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => one(r.id, r.name || r.email, "rejected")} disabled={pending} aria-label="Reject">
                          <LuX />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/admin/customers/${r.id}`} />}>
                        Manage
                      </Button>
                    )}
                    <DeleteCustomerDialog id={r.id} name={r.name || r.email} email={r.email} variant="icon" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtered.length} of {rows.length} customers
        </span>
        <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  );
}
