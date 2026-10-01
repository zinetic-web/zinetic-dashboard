import { Suspense } from "react";
import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { TOOLS } from "@/lib/studio/tools";
import { enabledEngines, toPublic } from "@/lib/studio/engines";
import { recentGenerations } from "@/lib/studio/queries";
import { entitlementRows, summarize, toolStatus, trialsTaken } from "@/lib/studio/entitlements";
import { planOptionsForTool } from "@/lib/studio/plans";
import { servicesForTool, serviceName } from "@/lib/studio/services";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { History, ToolHeader, ToolProvider } from "@/components/studio/ui";
import { LockedService, PaymentNotice, UsageBar } from "@/components/studio/plans";

// The recent list is the only part that needs the database, so it streams in after
// the page is already on screen instead of holding the whole page back.
async function Recent({ kinds }: { kinds: string[] }) {
  const { user } = await getDashboardSession();
  if (!user) return null;
  return <History rows={await recentGenerations(user.id, kinds)} />;
}

/** Header, the tool itself (or its lock), and that tool's recent generations. */
export async function ToolPage({
  toolId,
  notice,
  children,
}: {
  toolId: string;
  notice?: string | null;
  children: React.ReactNode;
}) {
  const tool = TOOLS.find((t) => t.id === toolId)!;
  const { user } = await getDashboardSession();
  const [engineList, rows] = await Promise.all([enabledEngines(toolId), user ? entitlementRows(user.id) : Promise.resolve([])]);
  const engines = engineList.map(toPublic);

  const summary = summarize(rows);
  const status = toolStatus(toolId, summary);
  const usages = servicesForTool(toolId)
    .map((s) => summary[s.id])
    .filter((s) => s && s.active)
    .map((s) => ({ ...s, serviceName: serviceName(s.service) }));

  return (
    <ToolProvider toolId={toolId} engines={engines}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <ToolHeader />
        <Suspense>
          <PaymentNotice />
        </Suspense>
        {status.active ? (
          <>
            {usages.length > 0 && (
              <div className="flex flex-col gap-4 rounded-xl border bg-card p-4">
                {usages.map((u) => (
                  <UsageBar key={u.service} usage={u} compact={usages.length === 1} />
                ))}
              </div>
            )}
            {notice && (
              <Alert>
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}
            {children}
            {tool.kinds && (
              <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                <Recent kinds={tool.kinds} />
              </Suspense>
            )}
          </>
        ) : (
          <LockedService toolName={tool.name} options={planOptionsForTool(toolId)} exhausted={status.services.length > 0} takenTrials={trialsTaken(rows)} />
        )}
      </div>
    </ToolProvider>
  );
}
