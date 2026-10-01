"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LuLoaderCircle, LuLock } from "react-icons/lu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { PlanOption } from "@/lib/studio/plans";
import { formatUnits, type Unit } from "@/lib/studio/services";

/* ----------------------------------------------------------- plan cards */

/** The plans for one or more services, each with its own Buy button. Used on a locked tool and on My plans. */
export function PlanPicker({ options, takenTrials = [] }: { options: PlanOption[]; takenTrials?: string[] }) {
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
      const json = (await res.json().catch(() => ({}))) as { gatewayPageUrl?: string; redirect?: string; error?: string };
      // the free trial needs no payment, it is added at once
      if (res.ok && json.redirect) {
        window.location.assign(json.redirect);
        return;
      }
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
        <div key={o.service} className="flex flex-col gap-3">
          {options.length > 1 && <p className="text-sm font-medium">{o.serviceName}</p>}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {o.tiers.filter((t) => !(t.trial && takenTrials.includes(o.service))).map((t) => {
              const id = `${o.service}:${t.name}`;
              return (
                <Card key={t.name} size="sm">
                  <CardHeader>
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <CardDescription>{t.amount}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div>
                      <p className="font-heading text-2xl font-semibold">{t.trial ? "Free" : `$${t.usd}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.trial ? "No payment · used once, never resets" : `৳${t.bdt.toLocaleString("en-US")} · ${t.validity ? `valid ${t.validity}` : "never expires"}`}
                      </p>
                    </div>
                    <Button onClick={() => buy(o.service, t.name)} disabled={!agreed || busy !== null} variant={t.trial ? "outline" : "default"} className="w-full">
                      {busy === id && <LuLoaderCircle className="animate-spin" />}
                      {busy === id ? (t.trial ? "Starting" : "Opening payment") : t.trial ? "Start free trial" : "Buy"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
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

/* ------------------------------------------------------ locked tool page */

/** Shown in place of a tool the customer has not bought, or has used up. The menu stays open, only this page is locked. */
export function LockedService({ toolName, options, exhausted, takenTrials = [] }: { toolName: string; options: PlanOption[]; exhausted: boolean; takenTrials?: string[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg border bg-muted/40">
            <LuLock className="size-5 text-muted-foreground" />
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
      <CardContent>
        <PlanPicker options={options} takenTrials={takenTrials} />
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

/** What the customer bought for this tool and how much is left, shown above the tool. */
export function UsageBar({ usage, compact = false }: { usage: PlanUsage; compact?: boolean }) {
  const pct = usage.total > 0 ? Math.max(0, Math.min(100, (usage.remaining / usage.total) * 100)) : 0;
  const low = pct <= 15;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <span className="font-medium">
          {!compact && `${usage.serviceName} · `}
          {usage.plan ? `${usage.plan} plan` : "Plan"}
        </span>
        <span className={low ? "text-destructive" : "text-muted-foreground"}>
          {formatUnits(usage.remaining, usage.unit)} left of {formatUnits(usage.total, usage.unit)}
          {usage.expiresAt ? ` · until ${when(usage.expiresAt)}` : ""}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={low ? "h-full rounded-full bg-destructive" : "h-full rounded-full bg-foreground"} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Result of a payment made from the dashboard, read from the page address. */
export function PaymentNotice() {
  const params = useSearchParams();
  const payment = params.get("payment");
  if (params.get("trial")) {
    return (
      <Alert>
        <AlertDescription>Your free trial is ready. It is a small taste of this service, used once and it does not renew. Pick a plan when you want more.</AlertDescription>
      </Alert>
    );
  }
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
