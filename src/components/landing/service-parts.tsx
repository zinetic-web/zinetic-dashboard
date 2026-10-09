import Link from "next/link";
import { LuArrowUpRight, LuPlus } from "react-icons/lu";
import { AutoVideo, Reveal } from "@/components/landing/primitives";
import type { Service } from "@/lib/landing-services";
import { SERVICE_PAGES, serviceHref } from "@/lib/service-pages";
import { FromPrice } from "@/components/landing/currency";

export function ServiceCard({ service, delay = 0 }: { service: Service; delay?: number }) {
  const page = SERVICE_PAGES[service.id];
  return (
    <Reveal delay={delay} className="min-w-0">
      <Link
        href={serviceHref(service.id)}
        className="group flex h-full flex-col overflow-hidden rounded-[26px] border border-(--zl-line) bg-(--zl-surface) transition-all duration-500 hover:-translate-y-1 hover:border-(--zl-text)/20 hover:shadow-[0_30px_70px_-34px_rgb(255_61_134/0.5)]"
      >
        <div className="relative aspect-[16/10] overflow-hidden">
          <AutoVideo src={page.hero} className="transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <span className="absolute top-3.5 right-3.5 rounded-full bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
            <FromPrice service={service} />
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h3 className="zl-display text-xl font-semibold sm:text-[1.4rem]">{service.name}</h3>
            <LuArrowUpRight className="mt-1 size-5 shrink-0 text-(--zl-muted) transition-all duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#ff3d86]" />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-(--zl-muted)">{service.blurb}</p>
        </div>
      </Link>
    </Reveal>
  );
}

export { TierCards } from "@/components/landing/tier-cards";

const FAQ = [
  {
    q: "Do failed generations use up my plan?",
    a: "No. Usage is only deducted after a generation or job completes successfully. If something fails, your credits, minutes or characters stay in your account.",
  },
  {
    q: "How do I pay?",
    a: "Through SSLCommerz, Bangladesh's secure payment gateway. Prices are shown in USD and charged in BDT at checkout, with bKash, Nagad, Rocket or a debit/credit card.",
  },
  {
    q: "Can I get a refund?",
    a: "Yes, under our Return and Refund Policy. Approved refunds are returned to your original payment method within 7 to 10 working days.",
  },
];

export function ServiceFaq() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      {FAQ.map((item) => (
        <details
          key={item.q}
          className="group border-b border-(--zl-line) py-5 [&_summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold">
            {item.q}
            <LuPlus className="size-5 shrink-0 text-(--zl-muted) transition-transform duration-300 group-open:rotate-45" />
          </summary>
          <p className="mt-3 max-w-2xl leading-relaxed text-(--zl-muted)">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
