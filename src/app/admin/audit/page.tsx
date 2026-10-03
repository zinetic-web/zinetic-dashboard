import Link from "next/link";
import { LocalTime } from "@/components/local-time";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LABEL: Record<string, string> = {
  approve: "Approved",
  reject: "Rejected",
  block: "Blocked",
  unblock: "Unblocked",
  delete: "Deleted",
  bulk_approve: "Approved several",
  bulk_reject: "Rejected several",
  checker_credits_add: "Added Checker credits",
  checker_credits_remove: "Removed Checker credits",
  grant_service: "Granted Studio service",
  revoke_service: "Removed Studio service",
  dashboard_on: "Opened a dashboard",
  dashboard_off: "Closed a dashboard",
  note: "Edited a note",
};

const describe = (action: string, d: Record<string, unknown>) => {
  if (action.startsWith("checker_credits")) return `${d.credits ?? d.usd ?? ""} credits${d.note ? ` · ${d.note}` : ""}`;
  if (action === "grant_service") return `${d.service ?? ""} · ${d.amount ?? ""}${d.days ? ` for ${d.days} days` : ""}`;
  if (action.startsWith("dashboard")) return String(d.product ?? "");
  if (action === "block") return String(d.reason ?? "");
  if (action.startsWith("bulk")) return `${d.count ?? ""} customers`;
  return "";
};

export default async function AuditPage() {
  const { data } = await createAdminClient().from("admin_audit").select("*").order("created_at", { ascending: false }).limit(300);
  const rows = data ?? [];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-semibold">Audit log</h1>
        <p className="mt-1 text-sm text-muted-foreground">Everything admins have done to a customer, newest first. Keep it open when you want to know who changed what.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last {rows.length} actions</CardTitle>
          <CardDescription>Approvals, blocks, credits, dashboard access and Studio grants.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nothing has been recorded yet. Actions you take from now on show up here.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground"><LocalTime iso={r.created_at} mode="short" /></TableCell>
                    <TableCell>{r.admin_email ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{LABEL[r.action] ?? r.action}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.target_user ? (
                        <Link href={`/admin/customers/${r.target_user}`} className="hover:underline">
                          {r.target_label ?? r.target_user}
                        </Link>
                      ) : (
                        (r.target_label ?? "-")
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{describe(r.action, (r.detail ?? {}) as Record<string, unknown>)}</TableCell>
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
