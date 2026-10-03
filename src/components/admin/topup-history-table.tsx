"use client";

import * as React from "react";
import { LocalTime } from "@/components/local-time";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TablePagination } from "@/components/dashboard/table-pagination";
import { usePagination } from "@/hooks/use-pagination";
import { LuSearch, LuCreditCard, LuUserCog } from "react-icons/lu";
import { formatSignedCredits } from "@/lib/credits";

type TopupRow = {
  id: string;
  amount: number;
  note: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string } | null;
};

const PAGE_SIZE = 15;

function SourceBadge({ note }: { note: string | null }) {
  const isOnline = note?.startsWith("SSLCommerz top-up");
  return isOnline ? (
    <Badge className="gap-1 bg-blue-600/10 text-blue-700 dark:text-blue-400">
      <LuCreditCard className="size-3" /> SSLCommerz
    </Badge>
  ) : (
    <Badge variant="secondary" className="gap-1">
      <LuUserCog className="size-3" /> Admin
    </Badge>
  );
}

export function TopupHistoryTable({ rows }: { rows: TopupRow[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.profiles?.full_name?.toLowerCase().includes(q) ||
        r.profiles?.email.toLowerCase().includes(q)
    );
  }, [rows, query]);

  const { page, setPage, pageCount, pageItems } = usePagination(filtered, PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <LuSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No top-ups yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.profiles?.full_name ?? r.profiles?.email ?? "N/A"}
                  </TableCell>
                  <TableCell>
                    <SourceBadge note={r.note} />
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate text-muted-foreground">
                    {r.note ?? "N/A"}
                  </TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">
                    {formatSignedCredits(Number(r.amount))}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    <LocalTime iso={r.created_at} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <TablePagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
