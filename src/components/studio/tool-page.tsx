import { Suspense } from "react";
import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { TOOLS } from "@/lib/studio/tools";
import { enabledEngines, toPublic } from "@/lib/studio/engines";
import { recentGenerations } from "@/lib/studio/queries";
import { entitlementRows, summarize, toolStatus } from "@/lib/studio/entitlements";
import { planOptionsForTool } from "@/lib/studio/plans";
import { servicesForTool, serviceName } from "@/lib/studio/services";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { History, ToolHeader, ToolProvider } from "@/components/studio/ui";
import { LockedService, PaymentNotice, TrialBar, UsageBar } from "@/components/studio/plans";
import { trialInfo } from "@/lib/studio/trial";
import { CompactRecent, RecentProvider } from "@/components/studio/recent-compact";

// The recent list is the only part that needs the database, so it streams in after
// the page is already on screen instead of holding the whole page back.
async function Recent({ kinds }: { kinds: string[] }) {
  const { user } = await getDashboardSession();
  if (!user) return null;
  return <History rows={await recentGenerations(user.id, kinds)} />;
}

// the compact list under the result, for the pages that use it
async function RecentCompactList({ kinds }: { kinds: string[] }) {
  const { user } = await getDashboardSession();
  if (!user) return null;
  return <CompactRecent rows={await recentGenerations(user.id, kinds, 6)} />;
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
  // pages that show their recent runs in the column under the result
  const compact = true;
  const { user } = await getDashboardSession();
  const [engineList, rows, trial] = await Promise.all([enabledEngines(toolId), user ? entitlementRows(user.id) : Promise.resolve([]), trialInfo(user?.id ?? null)]);
  const engines = engineList.map(toPublic);

  const summary = summarize(rows);
  const status = toolStatus(toolId, summary);
  const usages = servicesForTool(toolId)
    .map((s) => summary[s.id])
    .filter((s) => s && s.active)
    .map((s) => ({ ...s, serviceName: serviceName(s.service) }));

  // what is left on the plan (or the trial), shown beside the page title
  const limit =
    status.active && usages.length > 0 ? (
      <div className="zs-card flex flex-col gap-4 p-4">
        {usages.map((u) => (
          <UsageBar key={u.service} usage={u} compact={usages.length === 1} />
        ))}
      </div>
    ) : trial.active ? (
      <div className="zs-card p-4">
        <TrialBar trial={trial} />
      </div>
    ) : null;

  return (
    <ToolProvider toolId={toolId} engines={engines}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <ToolHeader aside={limit} />
        <Suspense>
          <PaymentNotice />
        </Suspense>
        {status.active || trial.active ? (
          <>
            {notice && (
              <Alert>
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            )}
            {compact && tool.kinds ? (
              <RecentProvider
                recent={
                  <Suspense fallback={<Skeleton className="h-64 w-full rounded-2xl" />}>
                    <RecentCompactList kinds={tool.kinds} />
                  </Suspense>
                }
              >
                {children}
              </RecentProvider>
            ) : (
              children
            )}
            {!compact && tool.kinds && (
              <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                <Recent kinds={tool.kinds} />
              </Suspense>
            )}
          </>
        ) : (
          <LockedService toolName={tool.name} options={planOptionsForTool(toolId)} exhausted={status.services.length > 0 || trial.started} trial={trial} />
        )}
      </div>
    </ToolProvider>
  );
}
