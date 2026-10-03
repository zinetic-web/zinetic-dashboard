import Link from "next/link";
import Image from "next/image";
import { LuArrowLeft, LuArrowRight, LuAudioLines, LuClapperboard, LuClock, LuDisc3 } from "react-icons/lu";
import { AuthPanel } from "@/components/auth-panel";
import { Reveal } from "@/components/landing/primitives";
import { displayFont, serifFont } from "@/components/landing/fonts";
import { TicketStatus } from "@/components/landing/ticket-status";

export const metadata = {
  title: "Client Login | Zinetic Music",
  description: "Choose the Zinetic Music dashboard you want to open.",
};

type Dashboard = {
  name: string;
  description: string;
  logo: React.ReactNode;
  href?: string;
};

const DASHBOARDS: Dashboard[] = [
  {
    name: "Music Distribution",
    description: "Releases, royalties and analytics.",
    logo: (
      <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#7c3aed] to-[#ec4899] sm:size-20 sm:rounded-[24px]">
        <LuDisc3 className="size-6 text-white sm:size-10" />
      </span>
    ),
  },
  {
    name: "AI Studio",
    description: "Voice, audio and video: dubbing, avatars, translation, music and clips.",
    // AI Studio lives on its own subdomain, so send people straight to its sign in
    href: process.env.NEXT_PUBLIC_STUDIO_URL ? `${process.env.NEXT_PUBLIC_STUDIO_URL.replace(/\/$/, "")}/login` : "/studio",
    logo: (
      <span className="relative flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#2563eb] via-[#7c3aed] to-[#f97316] sm:size-20 sm:rounded-[24px]">
        <LuAudioLines className="size-5 -translate-x-1 -translate-y-0.5 text-white sm:size-9 sm:-translate-x-2 sm:-translate-y-1" />
        <LuClapperboard className="absolute size-4 translate-x-2.5 translate-y-2 text-white/90 sm:size-7 sm:translate-x-4 sm:translate-y-3.5" />
      </span>
    ),
  },
  {
    name: "Channel Checker",
    description: "YouTube MCN checker and copyright management.",
    href: "/login",
    logo: (
      <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[#c2185b] sm:size-20 sm:rounded-[24px]">
        <Image src="/brand/logo-slideBar.png" alt="" width={52} height={52} className="size-7 sm:size-[52px]" />
      </span>
    ),
  },
];

function HelpDesk({ id, className }: { id: string; className?: string }) {
  return (
    <section aria-labelledby={id} className={className}>
      <h2 id={id} className="text-base font-semibold">
        Check Support Status
      </h2>
      <p className="mt-1.5 mb-6 text-sm text-white/55">Enter the ticket ID from your submission confirmation.</p>
      <TicketStatus />
    </section>
  );
}

function Row({ d }: { d: Dashboard }) {
  const body = (
    <>
      {d.logo}
      <div className="min-w-0 flex-1">
        <p
          className={
            d.href
              ? "font-heading text-base font-semibold sm:text-[1.7rem]"
              : "font-heading text-base font-semibold text-white/45 sm:text-[1.7rem]"
          }
        >
          {d.name}
        </p>
        <p className={d.href ? "mt-0.5 text-xs text-white/60 sm:mt-1 sm:text-sm" : "mt-0.5 text-xs text-white/30 sm:mt-1 sm:text-sm"}>{d.description}</p>
      </div>
      {d.href ? (
        <span className="zl-btn zl-btn-primary zl-btn-sm shrink-0">
          Open
          <LuArrowRight className="size-4" />
        </span>
      ) : (
        <span aria-disabled className="flex shrink-0 items-center gap-1.5 text-xs text-white/35 sm:text-sm">
          <LuClock className="size-4" /> Soon
        </span>
      )}
    </>
  );

  return d.href ? (
    <Link
      href={d.href}
      className="group relative flex items-center gap-3.5 px-1 py-4 transition-all duration-500 hover:bg-white/[0.035] sm:gap-6 sm:py-7 sm:hover:pl-4"
    >
      {body}
      <span
        aria-hidden
        className="zl-grad-bg absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 transition-transform duration-700 group-hover:scale-x-100"
      />
    </Link>
  ) : (
    <div className="flex items-center gap-3.5 px-1 py-4 sm:gap-6 sm:py-7">{body}</div>
  );
}

export default function ClientLoginPage() {
  return (
    <div className={`zl dark ${displayFont.variable} ${serifFont.variable} grid min-h-screen grid-cols-1 md:grid-cols-2`}>
      <AuthPanel variant="client" className="hidden md:sticky md:top-0 md:flex md:h-screen" />

      <div className="flex min-w-0 flex-col bg-zinc-950 text-white">
        <header className="flex items-center gap-3 px-6 py-5">
          <Link
            href="/"
            aria-label="Back to home"
            className="flex size-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LuArrowLeft className="size-5" />
          </Link>
          <Link href="/" className="flex items-center gap-2.5 md:hidden">
            <Image src="/brand/logo.png" alt="" width={899} height={1140} style={{ height: 30, width: "auto" }} />
            <span className="font-heading text-base font-semibold">Zinetic Music</span>
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-6 pb-16 sm:px-10">
          <div className="w-full max-w-xl">
            <Reveal>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-white/50 md:hidden">Client login</p>
              <h2 className="mt-2 font-heading text-[clamp(1rem,5.3vw,1.65rem)] leading-tight font-bold md:hidden">
                <span className="block whitespace-nowrap">Music, AI and creator tools,</span>
                <span className="zl-serif zl-grad-text block whitespace-nowrap">all in one place</span>
              </h2>
              <h1 className="hidden font-heading text-5xl leading-none font-bold sm:text-6xl md:block">
                Client <span className="zl-serif zl-grad-text">login</span>
              </h1>
              <p className="mt-3 text-sm text-white/60 sm:mt-4 sm:text-base">Choose the dashboard you want to open.</p>
            </Reveal>

            <ul className="mt-7 divide-y divide-white/10 border-y border-white/10 sm:mt-10">
              {DASHBOARDS.map((d, i) => (
                <li key={d.name}>
                  <Reveal delay={0.08 + i * 0.07} y={16}>
                    <Row d={d} />
                  </Reveal>
                </li>
              ))}
            </ul>

            <Reveal delay={0.35}>
              <p className="mt-8 text-sm text-white/50">
                New here?{" "}
                <Link href="/checkout" className="font-medium text-white underline decoration-[#ff3d86] underline-offset-4">
                  Create an account
                </Link>
              </p>
            </Reveal>

            <Reveal delay={0.4}>
              <HelpDesk id="help-desk" className="mt-14 max-w-md border-t border-white/10 pt-10" />
            </Reveal>
          </div>
        </main>
      </div>
    </div>
  );
}
