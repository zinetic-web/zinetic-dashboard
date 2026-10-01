"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { LuArrowRight, LuCheck, LuEye, LuEyeOff, LuLoaderCircle, LuLock, LuX } from "react-icons/lu";
import { Checkbox } from "@/components/ui/checkbox";
import { FromPrice, PriceBlock, useCurrency } from "@/components/landing/currency";
import { CATEGORIES, SERVICES, isComingSoon, servicesIn, type ServiceCategory } from "@/lib/landing-services";
import { TRIAL_PLAN, trialTier } from "@/lib/studio/services";
import { USD_TO_BDT_RATE, formatBdt, formatMoney, formatUsd, periodSuffix } from "@/lib/currency";
import { cn } from "@/lib/utils";

function billing(period: "year" | "month" | "avatar" | null | undefined) {
  if (period === "year") return "Billed yearly";
  if (period === "month") return "Billed monthly";
  if (period === "avatar") return "Per avatar";
  return "One-time";
}

const fieldLabel = "text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-white/50";
const fieldInput =
  "w-full border-b border-white/20 bg-transparent py-3 text-lg text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#ff3d86]";

function StepHeading({ n, title, hint }: { n: string; title: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-5">
      <span className="zl-serif w-10 shrink-0 text-5xl leading-none text-white/25 sm:text-6xl">{n}</span>
      <div>
        <h2 className="zl-display text-2xl font-semibold sm:text-3xl">{title}</h2>
        {hint && <p className="mt-1 text-sm text-white/50">{hint}</p>}
      </div>
    </div>
  );
}

type Draft = { fullName: string; email: string; password: string };

export function CheckoutForm({
  initialService,
  initialPlan,
  notice,
}: {
  initialService: string;
  initialPlan: string;
  notice?: string | null;
}) {
  const startService = SERVICES.find((s) => s.id === initialService) ?? SERVICES[0];
  const [serviceId, setServiceId] = React.useState(startService.id);
  const [planName, setPlanName] = React.useState(
    initialPlan === TRIAL_PLAN && trialTier(startService.id) ? TRIAL_PLAN : (startService.tiers.find((t) => t.name === initialPlan)?.name ?? startService.tiers[0].name)
  );
  const [category, setCategory] = React.useState<ServiceCategory>(startService.category);
  const [agreed, setAgreed] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  // the payment window is drawn on the page root: an animated ancestor would otherwise confine "fixed" to the form
  const [host, setHost] = React.useState<HTMLElement | null>(null);
  const [paying, setPaying] = React.useState(false);
  const [error, setError] = React.useState<string | null>(notice ?? null);
  const { currency } = useCurrency();

  const service = SERVICES.find((s) => s.id === serviceId) ?? SERVICES[0];
  // every AI Studio service also has a free trial, shown as one more plan
  const trial = trialTier(service.id);
  const tiers = trial ? [trial, ...service.tiers] : service.tiers;
  const tier = tiers.find((t) => t.name === planName) ?? service.tiers[0];
  const isTrial = tier.name === TRIAL_PLAN && tier.price === 0;
  const soon = isComingSoon(service.id);
  const amount = formatMoney(tier.price, currency);
  const suffix = periodSuffix(tier.period);

  function syncUrl(sId: string, plan: string) {
    window.history.replaceState(null, "", `/checkout?service=${sId}&plan=${encodeURIComponent(plan)}`);
  }

  function pickCategory(c: ServiceCategory) {
    setCategory(c);
    const first = servicesIn(c)[0];
    setServiceId(first.id);
    setPlanName(first.tiers[0].name);
    syncUrl(first.id, first.tiers[0].name);
  }

  function pickService(id: string) {
    const s = SERVICES.find((x) => x.id === id)!;
    setServiceId(id);
    setPlanName(s.tiers[0].name);
    syncUrl(id, s.tiers[0].name);
  }

  function pickPlan(name: string) {
    setPlanName(name);
    syncUrl(serviceId, name);
  }

  // the form only collects details, the order is placed from the payment window
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agreed || soon) return;
    setError(null);
    const f = new FormData(e.currentTarget);
    if (isTrial) {
      void startTrial({ fullName: String(f.get("fullName") ?? ""), email: String(f.get("email") ?? ""), password: String(f.get("password") ?? "") });
      return;
    }
    setHost(e.currentTarget.closest<HTMLElement>(".zl") ?? document.body);
    setDraft({ fullName: String(f.get("fullName") ?? ""), email: String(f.get("email") ?? ""), password: String(f.get("password") ?? "") });
  }

  // the free trial has no payment: make the account, then arrive signed in on the tool
  async function startTrial(d: Draft) {
    setPaying(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...d, service: service.id, agreed }),
      });
      const json = (await res.json().catch(() => ({}))) as { link?: string; error?: string };
      if (!res.ok || !json.link) {
        setError(json.error ?? "Could not start your free trial.");
        setPaying(false);
        return;
      }
      window.location.assign(json.link);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setPaying(false);
    }
  }

  async function pay() {
    if (!draft) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, service: service.id, plan: tier.name, agreed }),
      });
      const json = (await res.json().catch(() => ({}))) as { gatewayPageUrl?: string; error?: string };
      if (!res.ok || !json.gatewayPageUrl) {
        setError(json.error ?? "Could not start the payment.");
        setDraft(null);
        setPaying(false);
        return;
      }
      window.location.assign(json.gatewayPageUrl);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setDraft(null);
      setPaying(false);
    }
  }

  const cols = tiers.length >= 5 ? "lg:grid-cols-5" : tiers.length === 4 ? "sm:grid-cols-4" : tiers.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <form onSubmit={onSubmit} className="grid items-start gap-14 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-20">
      <div className="min-w-0">
        <section>
          <StepHeading n="1" title="Choose what you need" hint="Pick a service, then a plan." />

          <div role="tablist" aria-label="Service category" className="mt-8 flex flex-wrap gap-x-7 gap-y-2 border-b border-white/10">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={category === c.id}
                onClick={() => pickCategory(c.id)}
                className={cn(
                  "relative pb-3 text-[0.95rem] font-medium transition-colors",
                  category === c.id ? "text-white" : "text-white/45 hover:text-white/80"
                )}
              >
                {c.label}
                {category === c.id && (
                  <motion.span layoutId="checkout-tab" className="zl-grad-bg absolute inset-x-0 -bottom-px h-0.5" />
                )}
              </button>
            ))}
          </div>

          <ul className="mt-2 grid sm:grid-cols-2 sm:gap-x-12">
            {servicesIn(category).map((s) => {
              const active = s.id === serviceId;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => pickService(s.id)}
                    aria-pressed={active}
                    className="group relative flex w-full items-baseline justify-between gap-4 border-b border-white/10 py-4 text-left"
                  >
                    {active && <span aria-hidden className="zl-grad-bg absolute top-1/2 -left-4 h-5 w-0.5 -translate-y-1/2" />}
                    <span
                      className={cn(
                        "transition-all duration-300",
                        active ? "font-semibold text-white" : "text-white/55 group-hover:translate-x-1 group-hover:text-white/90"
                      )}
                    >
                      {s.name}
                    </span>
                    {isComingSoon(s.id) ? <span className="shrink-0 text-xs text-white/40">Soon</span> : <FromPrice service={s} className="shrink-0 text-xs text-white/40" />}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-12">
            <p className={fieldLabel}>Plan for {service.name}</p>
            <div className={cn("mt-4 grid grid-cols-2 border-y border-white/10", cols)}>
              {tiers.map((t, i) => {
                const active = t.name === tier.name;
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => pickPlan(t.name)}
                    aria-pressed={active}
                    className={cn(
                      "relative flex flex-col items-start gap-1 px-5 py-6 text-left transition-colors",
                      i > 0 && "sm:border-l sm:border-white/10",
                      i % 2 === 1 && "border-l border-white/10 sm:border-l",
                      active ? "bg-white/[0.05]" : "hover:bg-white/[0.02]"
                    )}
                  >
                    {active && <span aria-hidden className="zl-grad-bg absolute inset-x-0 top-0 h-0.5" />}
                    <span className={cn("text-[0.7rem] font-semibold uppercase tracking-[0.2em]", active ? "text-[#ff6b8f]" : "text-white/45")}>
                      {t.name}
                    </span>
                    {t.price === 0 ? (
                      <span className="zl-display mt-2 text-3xl font-bold">Free</span>
                    ) : (
                      <PriceBlock usd={t.price} period={t.period} size={tiers.length >= 4 ? "lg" : "xl"} className="mt-2" />
                    )}
                    <span className="mt-2 text-sm text-white/60">{t.quota}</span>
                  </button>
                );
              })}
            </div>
            {tier.perks && (
              <p className="mt-5 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-white/55">
                {tier.perks.map((p) => (
                  <span key={p} className="flex items-center gap-2">
                    <LuCheck className="size-3.5 text-[#ff5b4a]" /> {p}
                  </span>
                ))}
              </p>
            )}
            <Link
              href={`/services/${service.id}`}
              className="mt-5 inline-block text-sm text-white/50 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
            >
              About {service.name}
            </Link>
          </div>
        </section>

        <section className="mt-16 border-t border-white/10 pt-14">
          <StepHeading n="2" title="Create your account" hint={isTrial ? "Free trial: no payment needed, your account is ready straight away." : "Your account is activated the moment your payment goes through."} />
          <div className="mt-10 grid gap-9 sm:grid-cols-2">
            {error && (
              <p className="rounded-sm border-l-2 border-[#ff3d86] bg-[#ff3d86]/10 px-4 py-3 text-sm text-[#ffb3c6] sm:col-span-2">{error}</p>
            )}
            <label className="sm:col-span-2">
              <span className={fieldLabel}>Full name</span>
              <input name="fullName" required autoComplete="name" placeholder="Jane Doe" className={fieldInput} />
            </label>
            <label>
              <span className={fieldLabel}>Email</span>
              <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={fieldInput} />
            </label>
            <label>
              <span className={fieldLabel}>Password</span>
              <span className="relative block">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  className={cn(fieldInput, "pr-10")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-0 -translate-y-1/2 p-1 text-white/45 transition-colors hover:text-white"
                >
                  {showPassword ? <LuEyeOff className="size-5" /> : <LuEye className="size-5" />}
                </button>
              </span>
            </label>
          </div>
        </section>

        <section className="mt-16 border-t border-white/10 pt-14">
          <StepHeading n="3" title={isTrial ? "Start your trial" : "Review and pay"} />
          <label className="mt-8 flex cursor-pointer items-start gap-3.5 leading-relaxed">
            <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-1" aria-required />
            <span className="text-[0.95rem] text-white/60">
              I have read and agree to the{" "}
              <Link href="/terms" target="_blank" className="text-white underline decoration-[#ff3d86] underline-offset-4">
                Terms &amp; Conditions
              </Link>
              ,{" "}
              <Link href="/privacy" target="_blank" className="text-white underline decoration-[#ff3d86] underline-offset-4">
                Privacy Policy
              </Link>
              , and{" "}
              <Link href="/refund-policy" target="_blank" className="text-white underline decoration-[#ff3d86] underline-offset-4">
                Return &amp; Refund Policy
              </Link>
              .
            </span>
          </label>
          <button
            type="submit"
            disabled={!agreed || soon || paying}
            className="zl-btn zl-btn-primary zl-btn-lg mt-7 w-full disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 sm:w-auto sm:min-w-72"
          >
            {soon ? (
              "Coming soon"
            ) : isTrial ? (
              <>
                {paying ? <LuLoaderCircle className="size-5 animate-spin" /> : null}
                {paying ? "Setting up your account" : "Start free trial"}
                {!paying && <LuArrowRight className="size-5" />}
              </>
            ) : (
              <>
                Continue to payment, {amount}
                {suffix}
                <LuArrowRight className="size-5" />
              </>
            )}
          </button>
          {soon ? (
            <p className="mt-3 text-xs text-white/45">{service.name} is opening soon and cannot be bought yet. Pick another service to continue.</p>
          ) : (
            !agreed && <p className="mt-3 text-xs text-white/45">Tick the box above to continue.</p>
          )}
        </section>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-28">
        <div className="zl-receipt bg-[#15131a] px-7 pt-9 pb-14 font-mono text-[0.82rem] text-white/80">
          <p className="text-center text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white/45">Zinetic Music</p>
          <p className="mt-1 text-center font-heading text-lg font-semibold tracking-tight text-white">Order summary</p>

          <div className="my-6 border-t border-dashed border-white/20" />

          <p className="text-[0.95rem] font-semibold text-white">{service.name}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span>{tier.name}</span>
            <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-white/25" />
            <span className="text-white">
              {isTrial ? "Free" : amount}
              {isTrial ? "" : suffix}
            </span>
          </div>
          <p className="mt-1 text-white/50">{tier.quota}</p>

          {tier.perks && (
            <ul className="mt-5 space-y-1.5 text-white/55">
              {tier.perks.map((p) => (
                <li key={p} className="flex gap-2">
                  <span aria-hidden>+</span>
                  {p}
                </li>
              ))}
            </ul>
          )}

          <div className="my-6 border-t border-dashed border-white/20" />

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-white/50">Total</p>
              <p className="mt-1 text-white/45">{isTrial ? "No payment needed" : billing(tier.period)}</p>
            </div>
            {isTrial ? <span className="zl-display text-4xl font-bold text-white">Free</span> : <PriceBlock usd={tier.price} period={tier.period} size="xl" align="right" />}
          </div>

          <p className="mt-7 border-t border-dashed border-white/20 pt-5 text-[0.72rem] leading-relaxed text-white/40">
            Prices are in USD. Payments are made in BDT through SSLCommerz. BDT amounts use a rate of $1 = ৳{USD_TO_BDT_RATE}.
          </p>
        </div>
      </aside>
      {host && createPortal(
      <AnimatePresence>
        {draft && (
          <motion.div
            key="pay"
            role="dialog"
            aria-modal="true"
            aria-label="Payment"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center"
            onClick={() => !paying && setDraft(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f0d13] p-7 text-white shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={fieldLabel}>Secure payment</p>
                  <h3 className="zl-display mt-2 text-2xl font-semibold">Confirm your order</h3>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  disabled={paying}
                  onClick={() => setDraft(null)}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  <LuX className="size-5" />
                </button>
              </div>

              <dl className="mt-7 divide-y divide-white/10 border-y border-white/10 text-sm">
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-white/50">Service</dt>
                  <dd className="text-right font-medium">{service.name}</dd>
                </div>
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-white/50">Plan</dt>
                  <dd className="text-right font-medium">
                    {tier.name}
                    <span className="block text-xs font-normal text-white/45">{tier.quota}</span>
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-3">
                  <dt className="text-white/50">Account</dt>
                  <dd className="min-w-0 truncate text-right font-medium">{draft.email}</dd>
                </div>
              </dl>

              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-white/50">You pay today</p>
                  <p className="zl-display mt-1 text-4xl font-bold">{formatBdt(tier.price)}</p>
                </div>
                <p className="pb-1 text-sm text-white/50">
                  {formatUsd(tier.price)}
                  {suffix} · $1 = ৳{USD_TO_BDT_RATE}
                </p>
              </div>

              {error && <p className="mt-5 rounded-sm border-l-2 border-[#ff3d86] bg-[#ff3d86]/10 px-4 py-3 text-sm text-[#ffb3c6]">{error}</p>}

              <button
                type="button"
                onClick={pay}
                disabled={paying}
                className="zl-btn zl-btn-primary zl-btn-lg mt-7 w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {paying ? <LuLoaderCircle className="size-5 animate-spin" /> : <LuLock className="size-5" />}
                {paying ? "Opening secure payment" : `Pay ${formatBdt(tier.price)}`}
              </button>
              <p className="mt-4 text-center text-xs leading-relaxed text-white/45">
                You will pay on SSLCommerz with a card, bKash, Nagad, Rocket or internet banking. Your account is activated and you are signed in the moment the payment is confirmed.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        host
      )}
    </form>
  );
}
