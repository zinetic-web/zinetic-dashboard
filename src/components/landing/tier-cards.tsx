"use client";

import * as React from "react";
import { LuCheck } from "react-icons/lu";
import { Reveal } from "@/components/landing/primitives";
import { ComingSoonButton, ZButton } from "@/components/landing/button";
import { isComingSoon, planKey, type Service } from "@/lib/landing-services";
import { PriceBlock } from "@/components/landing/currency";
import { cn } from "@/lib/utils";

/** The plans of one service. A service sold in versions first asks which one, then shows what each plan gives on it. */
export function TierCards({ service }: { service: Service }) {
  const [versionId, setVersionId] = React.useState<string | null>(null);
  const versionIndex = Math.max(0, service.versions?.findIndex((v) => v.id === versionId) ?? 0);
  const version = service.versions?.[versionIndex] ?? null;
  const tiers = (version?.tiers ?? service.tiers).map((t, i) => ({ ...t, perks: t.perks ?? service.tiers[i]?.perks }));
  const featuredIndex = tiers.length === 3 ? 1 : tiers.length > 3 ? 2 : -1;
  return (
    <div className="flex flex-col gap-8">
      {service.versions && version && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-semibold tracking-[0.14em] text-(--zl-muted) uppercase">Version</p>
          <div className="flex max-w-4xl flex-wrap justify-center gap-2">
            {service.versions.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVersionId(v.id)}
                className={cn("zl-chip rounded-full border px-3.5 py-1.5 text-sm", v.id === version.id ? "border-[#ff3d86] text-(--zl-text)" : "border-(--zl-line) text-(--zl-muted) hover:text-(--zl-text)")}
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
          tiers.length === 2 && "mx-auto max-w-3xl sm:grid-cols-2",
          tiers.length === 3 && "md:grid-cols-3",
          tiers.length > 3 && "sm:grid-cols-2 lg:grid-cols-5"
        )}
      >
        {tiers.map((tier, i) => {
          const featured = i === featuredIndex;
          return (
            <Reveal key={tier.name} delay={i * 0.06} className="min-w-0">
              <div className={cn("relative flex h-full flex-col rounded-[26px] border p-6", featured ? "border-transparent bg-(--zl-text) text-(--zl-bg)" : "border-(--zl-line) bg-(--zl-surface)")}>
                {featured && <span className="zl-grad-bg absolute -top-3 right-6 rounded-full px-3 py-1 text-xs font-semibold text-white">Recommended</span>}
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
                  {isComingSoon(service.id) ? (
                    <ComingSoonButton className="w-full" />
                  ) : (
                    <ZButton href={`/checkout?service=${service.id}&plan=${encodeURIComponent(planKey(tier.name, versionIndex === 0 ? null : version?.id))}`} variant={featured ? "primary" : "solid"} className="w-full">
                      {service.cta}
                    </ZButton>
                  )}
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
