"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LuLoaderCircle } from "react-icons/lu";
import { PiLockSimpleBold } from "react-icons/pi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/studio/dropdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { PlanOption } from "@/lib/studio/plans";
import { formatUnits, type Unit } from "@/lib/studio/services";
import { useRouter } from "next/navigation";

/* ----------------------------------------------------------- plan cards */

/** The plans for one or more services, each with its own Buy button. Used on a locked tool and on My plans. */
export function PlanPicker({ options, version }: { options: PlanOption[]; /** the version is chosen outside (in a window header), so the picker does not ask for it */ version?: string }) {
  const [agreed, setAgreed] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function buy(service: string, plan: string) {
    setBusy(`${service}:${plan}`);
    setError(null);
    try {
      const res = await fetch("/api/checkout/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, plan, agreed }),
      });
      const json = (await res.json().catch(() => ({}))) as { gatewayPageUrl?: string; error?: string };
      if (!res.ok || !json.gatewayPageUrl) {
        setError(json.error ?? "Could not start the payment.");
        setBusy(null);
        return;
      }
      window.location.assign(json.gatewayPageUrl);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {options.map((o) => (
        <ServicePlanCards key={o.service} option={o} showName={options.length > 1} agreed={agreed} busy={busy} onBuy={buy} chosenVersion={version} />
      ))}

      <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-muted-foreground">
        <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank" className="text-foreground underline underline-offset-4">
            Terms
          </Link>
          ,{" "}
          <Link href="/privacy" target="_blank" className="text-foreground underline underline-offset-4">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/refund-policy" target="_blank" className="text-foreground underline underline-offset-4">
            Refund Policy
          </Link>
          . You pay on SSLCommerz and the plan is added to your account the moment the payment is confirmed.
        </span>
      </label>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/** One service's plans. A service sold in several versions first asks which version, then shows what each plan gives on it. */
function ServicePlanCards({ option: o, showName, agreed, busy, onBuy, chosenVersion }: { option: PlanOption; showName: boolean; agreed: boolean; busy: string | null; onBuy: (service: string, plan: string) => void; chosenVersion?: string }) {
  const [versionId, setVersionId] = React.useState(o.versions?.[0]?.id ?? "");
  const version = o.versions?.find((v) => v.id === (chosenVersion ?? versionId)) ?? o.versions?.[0] ?? null;
  const tiers = version?.tiers ?? o.tiers;
  return (
    <div className="@container flex flex-col gap-3">
      {(showName || version) && (
        <div className="flex flex-col gap-2 @xl:flex-row @xl:items-center @xl:gap-4">
          {showName && <p className="text-sm font-medium">{o.serviceName}</p>}
          {o.versions && version && chosenVersion === undefined && (
            <>
              <div className="w-full @xl:w-64 @xl:shrink-0">
                <Dropdown value={version.id} onChange={setVersionId} label="Version" options={o.versions.map((v) => ({ value: v.id, label: v.label }))} />
              </div>
              {version.note && <p className="text-xs leading-relaxed text-white/50">{version.note}</p>}
            </>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 @xl:grid-cols-3">
        {tiers.map((t) => {
          const id = `${o.service}:${t.key}`;
          return (
            <div key={t.key} className="zs-card flex flex-col gap-4 p-4">
              <div>
                <p className="font-heading text-base font-semibold">{t.name}</p>
                <p className="text-sm text-white/60">{t.amount}</p>
              </div>
              <div>
                <p className="font-heading text-2xl font-semibold tabular-nums">${t.usd.toFixed(2)}</p>
                <p className="text-xs text-white/45">
                  ৳{t.bdt.toLocaleString("en-US")} · {t.validity ? `valid ${t.validity}` : "never expires"}
                </p>
              </div>
              <Button onClick={() => onBuy(o.service, t.key)} disabled={!agreed || busy !== null} className="mt-auto w-full">
                {busy === id && <LuLoaderCircle className="animate-spin" />}
                {busy === id ? "Opening payment" : "Buy"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------ locked tool page */

/** Shown in place of a tool the customer has not bought, or has used up. The menu stays open, only this page is locked. */
export function LockedService({ toolName, options, exhausted, trial }: { toolName: string; options: PlanOption[]; exhausted: boolean; trial?: TrialInfo }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full border bg-muted/40">
            <PiLockSimpleBold className="size-5 text-muted-foreground" />
          </span>
          <div>
            <CardTitle className="text-lg">{exhausted ? `Your ${toolName} plan is finished` : `${toolName} is not on your account yet`}</CardTitle>
            <CardDescription>
              {exhausted
                ? "You have used everything in your plan, or it has expired. Add another to carry on."
                : "Pick a plan to unlock it. The rest of your AI Studio stays exactly as it is."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {trial && !trial.started && trial.enabled && <TrialCard trial={trial} />}
        <PlanPicker options={options} />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------- plan usage strip */

export type PlanUsage = {
  service: string;
  serviceName: string;
  unit: Unit;
  plan: string | null;
  total: number;
  used: number;
  remaining: number;
  expiresAt: string | null;
};

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

/** A round gauge: how much of an allowance is left, in the brand gradient. Goes amber when it runs low. */
export function Ring({ pct, size = 60, stroke = 6, children }: { pct: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const id = React.useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  const low = p <= 15;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={low ? "#f59e0b" : "#8b5cf6"} />
            <stop offset="100%" stopColor={low ? "#ef4444" : "#3b82f6"} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.09)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-[0.7rem] font-semibold tabular-nums">{children ?? `${Math.round(p)}%`}</div>
    </div>
  );
}

/** What the customer bought for this tool and how much is left: a gauge, the amount, and when it ends. */
export function UsageBar({ usage, compact = false, large = false, ringRight = false, mini = false }: { usage: PlanUsage; compact?: boolean; large?: boolean; ringRight?: boolean; mini?: boolean }) {
  const pct = usage.total > 0 ? (usage.remaining / usage.total) * 100 : 0;
  const left = formatUnits(usage.remaining, usage.unit);
  const amount = left.match(/^[\d,.]+/)?.[0] ?? "0";
  const unit = left.replace(/^[\d,.]+\s*/, "");
  const total = formatUnits(usage.total, usage.unit).match(/^[\d,.]+/)?.[0] ?? "";
  if (mini) {
    return (
      <div className="flex items-center gap-3">
        <Ring pct={pct} size={42} stroke={4}>
          <span className="text-[0.6rem]">{Math.round(pct)}%</span>
        </Ring>
        <div className="min-w-0 leading-tight">
          {!compact && <p className="truncate text-[0.7rem] font-medium text-white/55">{usage.serviceName}</p>}
          <p className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-base font-bold tabular-nums">{amount}</span>
            <span className="text-xs text-white/55">{unit} left</span>
          </p>
          <p className="truncate text-[0.7rem] text-white/35">
            of {total}
            {usage.expiresAt ? ` · until ${when(usage.expiresAt)}` : ""}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className={ringRight ? "flex flex-row-reverse items-center justify-between gap-4" : "flex items-center gap-4"}>
      <Ring pct={pct} size={large ? 80 : 56} stroke={large ? 8 : 6} />
      <div className="min-w-0 flex-1">
        {!compact && <p className="truncate text-xs font-medium text-white/60">{usage.serviceName}</p>}
        <p className={cn("truncate font-bold leading-none tabular-nums tracking-tight", large ? "text-[1.7rem]" : "text-xl")} title={amount}>
          {amount}
        </p>
        <p className="mt-1.5 truncate text-sm text-white/55">{unit} left</p>
        <p className="mt-0.5 truncate text-xs text-white/35">
          of {total}
          {usage.expiresAt ? ` · until ${when(usage.expiresAt)}` : ""}
        </p>
      </div>
    </div>
  );
}

/** Result of a payment made from the dashboard, read from the page address. */
export function PaymentNotice() {
  const payment = useSearchParams().get("payment");
  if (!payment) return null;
  if (payment === "success")
    return (
      <Alert>
        <AlertDescription>Payment confirmed. Your plan is added and ready to use.</AlertDescription>
      </Alert>
    );
  if (payment === "failed")
    return (
      <Alert variant="destructive">
        <AlertDescription>The payment did not go through and you were not charged. You can try again.</AlertDescription>
      </Alert>
    );
  return (
    <Alert>
      <AlertDescription>Payment cancelled. Nothing was charged.</AlertDescription>
    </Alert>
  );
}

export function StatusBadge({ active, hasPlan }: { active: boolean; hasPlan: boolean }) {
  if (active) return <Badge>Active</Badge>;
  return <Badge variant="outline">{hasPlan ? "Finished" : "Locked"}</Badge>;
}

/* ------------------------------------------------------- the shared free trial */

export type TrialInfo = {
  /** has a trial at all */
  started: boolean;
  active: boolean;
  why: string;
  generationsLeft: number;
  generationsMax: number;
  spendLeft: number;
  spendMax: number;
  expiresAt: string | null;
  days: number;
  enabled: boolean;
};


/** Where the shared free trial stands, shown above a tool the customer is using on it. */
export function TrialBar({ trial, large = false }: { trial: TrialInfo; large?: boolean }) {
  const pct = trial.generationsMax ? (trial.generationsLeft / trial.generationsMax) * 100 : 0;
  return (
    <div className="flex items-center gap-4">
      <Ring pct={pct} size={large ? 76 : 56} stroke={large ? 7 : 6}>
        {trial.generationsLeft}/{trial.generationsMax}
      </Ring>
      <div className="min-w-0">
        <p className="text-xs font-medium text-white/60">Free trial</p>
        <p className="flex items-baseline gap-1.5">
          <span className={large ? "text-3xl font-bold tabular-nums tracking-tight" : "text-xl font-bold tabular-nums tracking-tight"}>{trial.generationsLeft}</span>
          <span className="text-sm text-white/55">{trial.generationsLeft === 1 ? "generation" : "generations"} left</span>
        </p>
        {trial.expiresAt && <p className="mt-0.5 truncate text-xs text-white/40">until {when(trial.expiresAt)}</p>}
      </div>
    </div>
  );
}

/**
 * The free trial as a plan card: the same allowance across every service, a limited test and not
 * the full provider plan. A customer who is signed in starts it with one click.
 */
export function TrialCard({ trial }: { trial: TrialInfo }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/studio/trial", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not start the trial.");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
      setBusy(false);
    }
  }

  if (!trial.enabled) return null;
  return (
    <Card size="sm" className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Free trial <Badge variant="secondary">No card required</Badge>
        </CardTitle>
        <CardDescription>
          A limited test of every service, not the full plan. {trial.generationsMax} generations in total, valid for {trial.days} days, shared across all services.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {trial.started ? (
          <p className="text-sm text-muted-foreground">
            {trial.active ? `${trial.generationsLeft} generations left.` : trial.why === "expired" ? "Your trial has expired." : "You have used your free trial."} It does not reset.
          </p>
        ) : (
          <Button variant="outline" onClick={start} disabled={busy}>
            {busy && <LuLoaderCircle className="animate-spin" />} Start free trial
          </Button>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
