import Link from "next/link";
import { PiArrowRightBold, PiCheckBold } from "react-icons/pi";
import { getDashboardSession } from "@/lib/supabase/dashboard-session";
import { TOOLS } from "@/lib/studio/tools";
import { entitlementRows, summarize } from "@/lib/studio/entitlements";
import { planOption } from "@/lib/studio/plans";
import { trialInfo } from "@/lib/studio/trial";
import { STUDIO_SERVICES, serviceName } from "@/lib/studio/services";
import { SERVICES } from "@/lib/landing-services";
import { TrialBar, TrialCard, UsageBar } from "@/components/studio/plans";
import { cn } from "@/lib/utils";
import { ServicePlans } from "./service-plans";

export default async function MyPlansPage() {
  const { user } = await getDashboardSession();
  const summary = summarize(await entitlementRows(user!.id));
  const trial = await trialInfo(user!.id);

  const rows = STUDIO_SERVICES.map((s) => ({ s, st: summary[s.id], tool: TOOLS.find((t) => t.id === s.tool)!, info: SERVICES.find((x) => x.id === s.id) }));
  const active = rows.filter((r) => r.st?.active);
  const rest = rows.filter((r) => !r.st?.active);

  // each plan is a tall card like a pricing card: what the tool does, what is left, and the ways to get more
  const card = ({ s, st, tool, info }: (typeof rows)[number]) => {
    const Icon = tool.icon;
    const option = planOption(s.id);
    const live = Boolean(st?.active);
    const from = info ? Math.min(...info.tiers.map((t) => t.price)) : null;
    return (
      <li key={s.id}>
        <div className={cn("zs-card flex h-full flex-col gap-5 p-5", live && "border-violet-400/25")}>
          <div className="flex items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center zs-shine zs-shine-thin rounded-xl bg-white/[0.06] text-violet-300 ring-1 ring-white/10 [&_svg]:size-5">
              <Icon />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-base font-semibold">{serviceName(s.id)}</p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/50">{tool.blurb}</p>
            </div>
            <span className={cn("zs-shine zs-shine-thin flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-medium", live ? "bg-emerald-500/15 text-emerald-300" : st ? "bg-white/[0.07] text-white/60" : "bg-white/[0.05] text-white/45")}>
              <span className={cn("size-1.5 rounded-full", live ? "bg-emerald-400" : "bg-white/30")} />
              {live ? "Active" : st ? "Finished" : "Not bought"}
            </span>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            {st ? (
              <UsageBar usage={{ ...st, serviceName: serviceName(s.id) }} compact large ringRight />
            ) : (
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-white/45">Plans start at</p>
                  <p className="text-3xl font-bold tracking-tight tabular-nums">{from !== null ? `$${from % 1 === 0 ? from : from.toFixed(2)}` : "-"}</p>
                </div>
                <p className="max-w-40 text-right text-xs leading-relaxed text-white/40">Each service is its own plan. Pay once, use until it is gone.</p>
              </div>
            )}
          </div>

          {info && info.features.length > 0 && (
            <ul className="flex flex-col gap-2.5">
              {info.features.slice(0, 5).map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-white/70">
                  <PiCheckBold className="mt-0.5 size-4 shrink-0 text-violet-300" />
                  {f}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
            {live && tool.href && (
              <Link href={tool.href} className="zs-pill flex h-9 items-center gap-1.5 px-4 text-sm">
                Open <PiArrowRightBold className="size-3.5" />
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
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{active.map(card)}</ul>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="flex items-baseline gap-2 text-sm font-semibold">
          {active.length > 0 ? "Available to add" : "All services"} <span className="text-xs font-normal text-white/45">{rest.length}</span>
        </h2>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rest.map(card)}</ul>
      </section>
    </div>
  );
}
