import Link from "next/link";
import Image from "next/image";
import { LuAudioLines, LuClapperboard, LuDisc3 } from "react-icons/lu";
import { AuthBackdrop, type AuthVariant } from "@/components/auth-backdrop";

const SERVICES = [
  {
    name: "Music Distribution",
    text: "Releases, royalties and analytics.",
    logo: (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#7c3aed] to-[#ec4899]">
        <LuDisc3 className="size-6 text-white" />
      </span>
    ),
  },
  {
    name: "AI Studio",
    text: "Voice, audio and video made with AI.",
    logo: (
      <span className="relative flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#2563eb] via-[#7c3aed] to-[#f97316]">
        <LuAudioLines className="size-5 -translate-x-1 -translate-y-0.5 text-white" />
        <LuClapperboard className="absolute size-4 translate-x-2.5 translate-y-2 text-white/90" />
      </span>
    ),
  },
  {
    name: "Channel Checker",
    text: "YouTube MCN checks and copyright management.",
    logo: (
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#c2185b]">
        <Image src="/brand/logo-slideBar.png" alt="" width={28} height={28} className="size-7" />
      </span>
    ),
  },
];

/** The left side of every sign-in page: the same words and logos, a different moving background per dashboard. */
export function AuthPanel({ variant, className = "" }: { variant: AuthVariant; className?: string }) {
  return (
    <div className={`relative flex-col justify-between overflow-hidden bg-[#0f0f0f] p-10 text-white ${className}`}>
      <AuthBackdrop variant={variant} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-3/5 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/70 to-transparent" />

      <Link href="/" className="relative z-10 flex items-center gap-2.5">
        <Image src="/brand/logo.png" alt="" width={899} height={1140} style={{ height: 40, width: "auto" }} />
        <span className="font-heading text-lg font-semibold">Zinetic Music</span>
      </Link>

      <div className="relative z-10 flex flex-col gap-9">
        <div className="flex w-fit items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-sm text-white/80 backdrop-blur">
          <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none">
            <path
              d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
              fill="#FF0000"
            />
            <polygon points="9.545,15.568 15.818,12 9.545,8.432" fill="#FFFFFF" />
          </svg>
          Built for YouTube
        </div>
        <h2 className="font-heading text-4xl leading-[1.1] font-bold text-balance">
          Music, AI and creator tools, <span className="zl-serif zl-grad-text">all in one place</span>
        </h2>
        <ul className="flex flex-col gap-4">
          {SERVICES.map((s) => (
            <li key={s.name} className="flex items-center gap-4">
              {s.logo}
              <div>
                <p className="font-heading text-base font-semibold">{s.name}</p>
                <p className="text-sm text-white/60">{s.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-xs text-white/40">© {new Date().getFullYear()} Zinetic Music. All rights reserved.</p>
    </div>
  );
}
