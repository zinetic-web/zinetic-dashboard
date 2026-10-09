"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { LuArrowRight, LuCheck, LuGift, LuShieldCheck } from "react-icons/lu";
import { Reveal, SectionHeading } from "@/components/landing/primitives";
import { CATEGORIES, isComingSoon, planKey, servicesIn, type ServiceCategory } from "@/lib/landing-services";
import { cn } from "@/lib/utils";
import { PriceBlock } from "@/components/landing/currency";
import { ComingSoonButton, ZButton } from "@/components/landing/button";
import { studioService } from "@/lib/studio/services";

type TrialRules = { enabled: boolean; generations: number; spend: number; days: number };

const TRIAL_HREF = `/checkout?service=voice-generator&plan=${encodeURIComponent("Free trial")}`;

/** The first thing under the pricing heading: there is a free way in, and it is easy to see. */
function TrialBanner({ trial }: { trial: TrialRules }) {
  return (
    <Reveal className="mx-auto mt-12 max-w-5xl">
      <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#3d8bff] via-[#9b4dff] to-[#ff3d86] p-px">
        <div className="relative overflow-hidden rounded-[29px] bg-(--zl-surface) px-6 py-8 sm:px-10 sm:py-10">
          <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-[#9b4dff]/25 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-10 size-72 rounded-full bg-[#ff3d86]/15 blur-3xl" />
          <div className="relative flex flex-col items-start gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <span className="zl-grad-bg inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white">
                <LuGift className="size-3.5" /> Free · No card needed
              </span>
              <h3 className="zl-display mt-4 text-3xl font-bold sm:text-5xl">
                Try AI Studio <span className="zl-serif zl-grad-text">for free.</span>
              </h3>
              <p className="mt-3 text-(--zl-muted)">
                Make your first creations on us, with any tool in the studio. Confirm your email and you are in, with no payment and no card.
              </p>
            </div>
            <div className="flex w-full flex-col gap-5 lg:w-auto lg:items-end">
              <ul className="grid grid-cols-3 gap-3 text-center">
                {[
                  [String(trial.days), "days"],
                  [String(trial.generations), "generations"],
                  ["$0", "to start"],
                ].map(([n, l]) => (
                  <li key={l} className="rounded-2xl border border-(--zl-line) bg-white/[0.03] px-4 py-3">
                    <p className="zl-display text-2xl font-bold sm:text-3xl">{n}</p>
                    <p className="mt-1 text-xs text-(--zl-muted)">{l}</p>
                  </li>
                ))}
              </ul>
              <ZButton href={TRIAL_HREF} variant="primary" className="w-full lg:w-auto">
                Start free trial <LuArrowRight className="size-4" />
              </ZButton>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export function PricingSection({ trial }: { trial: TrialRules }) {
  const [category, setCategory] = React.useState<ServiceCategory>("music");
  const services = servicesIn(category);
  const [serviceId, setServiceId] = React.useState(services[0].id);
  const service = services.find((s) => s.id === serviceId) ?? services[0];
  // a service sold in versions: pick one, and the plans below show what each gives on it
  const [versionId, setVersionId] = React.useState<string | null>(null);
  const versionIndex = Math.max(0, service.versions?.findIndex((v) => v.id === versionId) ?? 0);
  const version = service.versions?.[versionIndex] ?? null;
  const tiers = (version?.tiers ?? service.tiers).map((t, i) => ({ ...t, perks: t.perks ?? service.tiers[i]?.perks }));
  const keyFor = (name: string) => planKey(name, versionIndex === 0 ? null : version?.id);

  function pickCategory(c: ServiceCategory) {
    setCategory(c);
    setServiceId(servicesIn(c)[0].id);
  }

  const featuredIndex = tiers.length === 3 ? 1 : tiers.length > 3 ? 2 : -1;
  // every AI Studio service also has the shared free trial, shown as the first plan
  const showTrial = trial.enabled && Boolean(studioService(service.id));
  const cardCount = tiers.length + (showTrial ? 1 : 0);

  return (
    <section id="pricing" className="scroll-mt-24 px-5 py-24 sm:py-32">
      <SectionHeading
        eyebrow="Pricing"
        title={
          <>
            Pay for what you make.
            <br />
            <span className="text-(--zl-muted)">Nothing hidden.</span>
          </>
        }
        sub="Clear prices for every service, paid through secure SSLCommerz checkout. Failed generations never use up your allowance."
      />

      {trial.enabled && <TrialBanner trial={trial} />}

      <Reveal className="mx-auto mt-14 flex max-w-7xl flex-col items-center gap-6">
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border border-(--zl-line) bg-(--zl-surface) p-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pickCategory(c.id)}
              className={cn(
                "relative shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors sm:px-6",
                category === c.id ? "text-(--zl-bg)" : "text-(--zl-muted) hover:text-(--zl-text)"
              )}
            >
              {category === c.id && (
                <motion.span
                  layoutId="zl-cat-pill"
                  className="absolute inset-0 rounded-full bg-(--zl-text)"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative">{c.label}</span>
            </button>
          ))}
        </div>

        {services.length > 1 && (
          <div className="flex max-w-4xl flex-wrap justify-center gap-2">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setServiceId(s.id)}
                className={cn(
                  "zl-chip rounded-full border px-3.5 py-1.5 text-sm",
                  s.id === service.id
                    ? "border-[#ff3d86] text-(--zl-text)"
                    : "border-(--zl-line) text-(--zl-muted) hover:text-(--zl-text)"
                )}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </Reveal>

      <div className="mx-auto mt-12 max-w-7xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-8 flex flex-col items-center gap-2 text-center">
              <h3 className="zl-display text-3xl font-semibold sm:text-4xl">{service.name}</h3>
              <p className="max-w-xl text-(--zl-muted)">{service.blurb}</p>
            </div>

            {service.versions && version && (
              <div className="mb-8 flex flex-col items-center gap-3">
                <p className="text-xs font-semibold tracking-[0.14em] text-(--zl-muted) uppercase">Version</p>
                <div className="flex max-w-4xl flex-wrap justify-center gap-2">
                  {service.versions.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVersionId(v.id)}
                      className={cn(
                        "zl-chip rounded-full border px-3.5 py-1.5 text-sm",
                        v.id === version.id ? "border-[#ff3d86] text-(--zl-text)" : "border-(--zl-line) text-(--zl-muted) hover:text-(--zl-text)"
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                {version.note && <p className="text-sm text-(--zl-muted)">{version.note}</p>}
              </div>
            )}

            <div
              className={cn(
                "grid gap-5",
                cardCount === 2 && "mx-auto max-w-3xl sm:grid-cols-2",
                cardCount === 3 && "md:grid-cols-3",
                cardCount === 4 && "sm:grid-cols-2 lg:grid-cols-4",
                cardCount > 4 && "sm:grid-cols-2 lg:grid-cols-5"
              )}
            >
              {showTrial && (
                <div className="relative flex flex-col rounded-[26px] border border-dashed border-[#9b4dff]/60 bg-(--zl-surface) p-6">
                  <span className="zl-grad-bg absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-semibold text-white">Free</span>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] opacity-70">Free trial</p>
                  <p className="zl-display mt-4 text-5xl font-bold">$0</p>
                  <p className="mt-1 font-medium">
                    {trial.generations} generations · {trial.days} days
                  </p>
                  <ul className="mt-5 flex flex-col gap-2 text-sm">
                    {["No card required", "Works with every AI Studio tool", "One shared allowance, not the full plan"].map((p) => (
                      <li key={p} className="flex items-start gap-2">
                        <LuCheck className="mt-0.5 size-4 shrink-0 text-[#ff5b4a]" />
                        <span className="opacity-85">{p}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-8">
                    <ZButton href={`/checkout?service=${service.id}&plan=${encodeURIComponent("Free trial")}`} variant="solid" className="w-full">
                      Start free trial
                    </ZButton>
                  </div>
                </div>
              )}
              {tiers.map((tier, i) => {
                const featured = i === featuredIndex;
                return (
                  <div
                    key={tier.name}
                    className={cn(
                      "relative flex flex-col rounded-[26px] border p-6",
                      featured
                        ? "border-transparent bg-(--zl-text) text-(--zl-bg)"
                        : "border-(--zl-line) bg-(--zl-surface)"
                    )}
                  >
                    {featured && (
                      <span className="zl-grad-bg absolute -top-3 right-6 rounded-full px-3 py-1 text-xs font-semibold text-white">
                        Recommended
                      </span>
                    )}
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] opacity-70">{tier.name}</p>
                    <PriceBlock usd={tier.price} period={tier.period} size="xl" className="mt-4" />
                    <p className="mt-1 font-medium">{tier.quota}</p>
                    {tier.perks && (
                      <ul className="mt-5 flex flex-col gap-2 text-sm">
                        {tier.perks.map((p) => (
                          <li key={p} className="flex items-start gap-2">
                            <LuCheck className="mt-0.5 size-4 shrink-0 text-[#ff5b4a]" />
                            <span className="opacity-85">{p}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-auto pt-8">
                      {isComingSoon(service.id) ? <ComingSoonButton className="w-full" /> : (
<ZButton
                        href={`/checkout?service=${service.id}&plan=${encodeURIComponent(keyFor(tier.name))}`}
                        variant={featured ? "primary" : "solid"}
                        className="w-full"
                      >
                        {service.cta}
                      </ZButton>
)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-(--zl-muted)">
              {service.features.map((f) => (
                <span key={f} className="flex items-center gap-1.5">
                  <LuCheck className="size-3.5" /> {f}
                </span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <p className="mt-12 flex items-center justify-center gap-2 text-center text-sm text-(--zl-muted)">
          <LuShieldCheck className="size-4 shrink-0" />
          Prices in USD, charged in BDT at checkout via SSLCommerz (bKash, Nagad, Rocket and cards).
        </p>
      </div>
    </section>
  );
}
