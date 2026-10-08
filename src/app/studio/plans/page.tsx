import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";
import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { TOOLS } from "@/lib/studio/tools";
import { entitlementRows, summarize } from "@/lib/studio/entitlements";
import { planOption } from "@/lib/studio/plans";
import { trialInfo } from "@/lib/studio/trial";
import { STUDIO_SERVICES, serviceName } from "@/lib/studio/services";
import { TrialBar, TrialCard, UsageBar } from "@/components/studio/plans";
import { cn } from "@/lib/utils";
import { ServicePlans } from "./service-plans";

export default async function MyPlansPage() {
  const { user } = await getDashboardSession();
  const summary = summarize(await entitlementRows(user!.id));
  const trial = await trialInfo(user!.id);

  const rows = STUDIO_SERVICES.map((s) => ({ s, st: summary[s.id], tool: TOOLS.find((t) => t.id === s.tool)! }));
  const active = rows.filter((r) => r.st?.active);
  const rest = rows.filter((r) => !r.st?.active);

  const card = ({ s, st, tool }: (typeof rows)[number]) => {
    const Icon = tool.icon;
    const option = planOption(s.id);
    const live = Boolean(st?.active);
    return (
      <li key={s.id}>
        <div className={cn("zs-card flex h-full flex-col gap-5 p-5", !live && "opacity-90")}>
          <div className="flex items-start gap-3.5">
            <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg [&_svg]:size-5", live ? tool.accent : "from-white/15 to-white/5 text-white/60")}>
              <Icon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-base font-semibold">{serviceName(s.id)}</p>
              <p className="mt-0.5 line-clamp-1 text-xs text-white/50">{tool.blurb}</p>
            </div>
            <span
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-medium",
                live ? "bg-emerald-500/15 text-emerald-300" : st ? "bg-white/[0.07] text-white/60" : "bg-white/[0.05] text-white/45"
              )}
            >
              <span className={cn("size-1.5 rounded-full", live ? "bg-emerald-400" : "bg-white/30")} />
              {live ? "Active" : st ? "Finished" : "Not bought"}
            </span>
          </div>

          {st ? <UsageBar usage={{ ...st, serviceName: serviceName(s.id) }} compact large /> : <p className="py-3 text-sm text-white/45">You have not bought this yet.</p>}

          <div className="mt-auto flex flex-wrap items-center gap-2">
            {live && tool.href && (
              <Link href={tool.href} className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3.5 text-sm transition-colors hover:bg-white/10">
                Open <LuArrowRight className="size-3.5" />
              </Link>
            )}
            {option && <ServicePlans option={option} label={st ? "Add more" : "Get a plan"} />}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10">
      <div>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">My plans</h1>
        <p className="mt-1.5 text-sm text-white/55">What you bought, how much is left, and what you can add. Each service is its own plan.</p>
      </div>

      {trial.enabled && (
        <section className="zs-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold">Free trial</h2>
            <p className="mt-1 max-w-md text-sm text-white/55">One shared allowance for every service. A limited test that does not reset.</p>
          </div>
          <div className="sm:min-w-72">{trial.started ? <TrialBar trial={trial} large /> : <TrialCard trial={trial} />}</div>
        </section>
      )}

      {active.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="flex items-baseline gap-2 text-sm font-semibold">
            Active <span className="text-xs font-normal text-white/45">{active.length}</span>
          </h2>
          <ul className="grid gap-4 md:grid-cols-2">{active.map(card)}</ul>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="flex items-baseline gap-2 text-sm font-semibold">
          {active.length > 0 ? "Available to add" : "All services"} <span className="text-xs font-normal text-white/45">{rest.length}</span>
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">{rest.map(card)}</ul>
      </section>
    </div>
  );
}
