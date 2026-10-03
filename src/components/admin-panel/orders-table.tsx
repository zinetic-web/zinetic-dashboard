"use client";

import * as React from "react";
import { LocalTime } from "@/components/local-time";
import Link from "next/link";
import { LuSearch } from "react-icons/lu";
import { usePagination } from "@/hooks/use-pagination";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { cn } from "@/lib/utils";

export type OrderRow = {
  id: string;
  at: string;
  userId: string | null;
  customer: string;
  email: string;
  kind: "plan" | "topup";
  what: string;
  bdt: number;
  status: "paid" | "held" | "unpaid" | "failed";
  ref: string;
  /** why a payment did not go through, from SSLCommerz */
  reason?: string;
};

const PAGE = 25;

function StatusBadge({ s }: { s: OrderRow["status"] }) {
  if (s === "paid") return <Badge className="bg-emerald-600/10 text-emerald-700 dark:text-emerald-400">Paid</Badge>;
  if (s === "held") return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">Held for review</Badge>;
  if (s === "unpaid") return <Badge variant="secondary">Not finished</Badge>;
  return <Badge variant="outline">Failed or cancelled</Badge>;
}

export function OrdersTable({ rows, initialStatus }: { rows: OrderRow[]; initialStatus?: string }) {
  const [status, setStatus] = React.useState<"all" | OrderRow["status"]>(["paid", "held", "unpaid", "failed"].includes(initialStatus ?? "") ? (initialStatus as OrderRow["status"]) : "all");
  const [kind, setKind] = React.useState<"all" | OrderRow["kind"]>("all");
  const [query, setQuery] = React.useState("");

  const counts = React.useMemo(() => {
    const c = { all: rows.length, paid: 0, held: 0, unpaid: 0, failed: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (status === "all" || r.status === status) && (kind === "all" || r.kind === kind) && (!q || r.email.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q) || r.what.toLowerCase().includes(q)));
  }, [rows, status, kind, query]);

  const { page, setPage, pageCount, pageItems } = usePagination(filtered, PAGE);
  const pill = (active: boolean) => cn("cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors", active ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border bg-muted/40 p-1">
          {(
            [
              ["all", "All"],
              ["paid", "Paid"],
              ["held", "Held"],
              ["unpaid", "Not finished"],
              ["failed", "Failed"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setStatus(id)} className={pill(status === id)}>
              {label} <span className="text-xs text-muted-foreground tabular-nums">{counts[id]}</span>
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border bg-muted/40 p-1">
          {(
            [
              ["all", "Everything"],
              ["plan", "Plan purchases"],
              ["topup", "Checker top-ups"],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setKind(id)} className={pill(kind === id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto w-full sm:w-72">
          <LuSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search email or reference" className="pl-9" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border py-14 text-center text-sm text-muted-foreground">No payments match.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>What</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground"><LocalTime iso={r.at} /></TableCell>
                  <TableCell>
                    {r.userId ? (
                      <Link href={`/admin/customers/${r.userId}`} className="hover:underline">
                        <span className="block font-medium">{r.customer || r.email}</span>
                        {r.customer && <span className="block text-xs text-muted-foreground">{r.email}</span>}
                      </Link>
                    ) : (
                      r.email
                    )}
                  </TableCell>
                  <TableCell>{r.what}</TableCell>
                  <TableCell className="text-right tabular-nums">৳{Math.round(r.bdt).toLocaleString("en-US")}</TableCell>
                  <TableCell>
                    <StatusBadge s={r.status} />
                    {r.status === "failed" && r.reason && <span className="mt-1 block max-w-48 truncate text-xs text-muted-foreground" title={r.reason}>{r.reason}</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.ref}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtered.length} of {rows.length} payments
        </span>
        <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
      </div>
    </div>
  );
}
