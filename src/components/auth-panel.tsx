import Link from "next/link";
import {
  LuAudioLines,
  LuChartBar,
  LuLanguages,
  LuLayoutGrid,
  LuLock,
  LuSearch,
  LuShieldCheck,
  LuSparkles,
  LuUserRound,
  LuWallet,
} from "react-icons/lu";
import { AuthBackdrop, type AuthVariant } from "@/components/auth-backdrop";
import { AUTH_BRANDS } from "@/components/brand-marks";
import { displayFont, serifFont } from "@/components/landing/fonts";

type Content = {
  eyebrow: string;
  title: [string, string];
  body: string;
  points: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }[];
};

// each sign-in speaks about its own product, in its own words
const CONTENT: Record<AuthVariant, Content> = {
  client: {
    eyebrow: "Welcome to Zinetic Music",
    title: ["Everything you create, ", "in one place."],
    body: "Music, AI and creator tools under a single account. Pick the dashboard you need and you are straight in.",
    points: [
      { icon: LuLayoutGrid, title: "One account, every tool", text: "Switch dashboards without signing in again." },
      { icon: LuSparkles, title: "Made for creators", text: "Tools that take a day of work down to minutes." },
      { icon: LuLock, title: "Safe by default", text: "Your account and your payments stay protected." },
    ],
  },
  cms: {
    eyebrow: "Channel Checker",
    title: ["Know a channel's network, ", "instantly."],
    body: "Check a YouTube channel in seconds and keep your copyright claims in order, all from one clean workspace.",
    points: [
      { icon: LuSearch, title: "Instant network lookup", text: "See which network a channel belongs to the moment you search." },
      { icon: LuShieldCheck, title: "Claims under control", text: "Follow every copyright claim from first notice to resolution." },
      { icon: LuChartBar, title: "A full history", text: "Every check and claim stays on record, easy to find later." },
      { icon: LuWallet, title: "Simple wallet", text: "Top up once and see exactly what each check costs." },
    ],
  },
  studio: {
    eyebrow: "AI Studio",
    title: ["Create with voice, audio and video ", "AI."],
    body: "Dubbing, avatars, translation, music and more. Write it, upload it or describe it, and the studio does the rest.",
    points: [
      { icon: LuLanguages, title: "Dub and translate", text: "Take any video into a new language, in a natural voice." },
      { icon: LuAudioLines, title: "Voices, sound and music", text: "Lifelike speech, sound effects and original tracks on demand." },
      { icon: LuUserRound, title: "Avatars and clips", text: "Talking presenters and short clips from a script or a prompt." },
      { icon: LuSparkles, title: "Pay for what you use", text: "Start with a free trial, then choose a plan per tool." },
    ],
  },
};

/** The left side of every sign-in page: its own words and logo, and its own moving background. */
export function AuthPanel({ variant, className = "" }: { variant: AuthVariant; className?: string }) {
  const brand = AUTH_BRANDS[variant];
  const c = CONTENT[variant];
  return (
    <div className={`zl dark ${displayFont.variable} ${serifFont.variable} relative flex-col justify-between overflow-hidden p-10 xl:p-14 ${className}`}>
      <AuthBackdrop variant={variant} />
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-t from-[#08070a] via-[#08070a]/55 to-[#08070a]/25" />

      <Link href="/" className="relative z-10 flex w-fit items-center gap-3">
        <brand.Mark size={40} />
        <span className="font-heading text-lg font-semibold">{brand.name}</span>
      </Link>

      <div className="relative z-10 flex max-w-xl flex-col gap-7">
        <p className="w-fit rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[0.7rem] font-semibold tracking-[0.2em] text-white/75 uppercase backdrop-blur">
          {c.eyebrow}
        </p>
        <h2 className="zl-display text-[clamp(2.4rem,3.6vw,3.6rem)] font-bold text-balance">
          {c.title[0]}
          <span className="zl-serif zl-grad-text">{c.title[1]}</span>
        </h2>
        <p className="max-w-md text-base leading-relaxed text-white/65">{c.body}</p>

        <ul className="mt-2 flex flex-col gap-4">
          {c.points.map((p) => (
            <li key={p.title} className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/[0.07] backdrop-blur">
                <p.icon className="size-[1.15rem] text-white/90" />
              </span>
              <div>
                <p className="font-heading text-[0.95rem] font-semibold">{p.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-white/55">{p.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-xs text-white/40">© {new Date().getFullYear()} Zinetic Music. All rights reserved.</p>
    </div>
  );
}
