"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LuAudioLines, LuClapperboard, LuMusic } from "react-icons/lu";
import { SparkIcon } from "@/components/spark-icon";
import { AuthBackdrop } from "@/components/auth-backdrop";
import { cn } from "@/lib/utils";

const TARGETS = [
  {
    id: "video",
    label: "Video",
    icon: LuClapperboard,
    href: "/studio/prompt-video",
    param: "prompt",
    ideas: ["A cinematic shot of a city at night, neon lights and rain", "A calm promo for a new lo-fi album release", "A friendly welcome video for new subscribers", "Explain how music royalties work, in simple words"],
  },
  {
    id: "voice",
    label: "Voice",
    icon: LuAudioLines,
    href: "/studio/voice",
    param: "text",
    ideas: ["Welcome to the show, I am so glad you are here", "Turn this script into a warm, natural voiceover", "Read my story aloud in a calm narrator voice", "Say it in Bengali, with a friendly tone"],
  },
  {
    id: "music",
    label: "Music",
    icon: LuMusic,
    href: "/studio/music",
    param: "prompt",
    ideas: ["A warm lo-fi beat with soft piano and vinyl crackle", "Upbeat Bengali pop with dhol and a catchy chorus", "A dark cinematic trap track with heavy 808s", "A gentle acoustic ballad about coming home"],
  },
];

/** Types a line, holds it, deletes it, then types the next, as a placeholder. */
function useTypewriter(lines: string[], paused: boolean) {
  const [text, setText] = React.useState("");
  React.useEffect(() => {
    if (paused) return;
    let line = 0;
    let n = 0;
    let deleting = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = lines[line];
      if (!deleting) {
        n++;
        setText(full.slice(0, n));
        if (n === full.length) {
          deleting = true;
          t = setTimeout(tick, 1700);
          return;
        }
        t = setTimeout(tick, 38);
      } else {
        n -= 2;
        if (n <= 0) {
          n = 0;
          setText("");
          deleting = false;
          line = (line + 1) % lines.length;
          t = setTimeout(tick, 350);
          return;
        }
        setText(full.slice(0, n));
        t = setTimeout(tick, 16);
      }
    };
    t = setTimeout(tick, 400);
    return () => clearTimeout(t);
  }, [lines, paused]);
  return text;
}

/** The top of Home: a moving backdrop, the question, and one box that sends the idea to the right tool. */
export function HomeHero({ name }: { name: string }) {
  const router = useRouter();
  const [target, setTarget] = React.useState(TARGETS[0]);
  const [text, setText] = React.useState("");
  const typed = useTypewriter(target.ideas, text.length > 0);

  function go(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim() ? `?${target.param}=${encodeURIComponent(text.trim().slice(0, 2000))}` : "";
    router.push(`${target.href}${q}`);
  }

  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-[#07070f]">
      <AuthBackdrop variant="studio" />
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-[#07070f]/70 via-[#07070f]/45 to-[#07070f]/85" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-5 py-14 text-center sm:px-10 sm:py-20">
        <div>
          <p className="text-sm text-white/60">{name ? `Welcome back, ${name}` : "Welcome back"}</p>
          <h1 className="mt-3 text-balance text-5xl leading-[1.05] font-medium tracking-tight sm:text-6xl lg:text-7xl">
            <span className="font-semibold">What will you </span>
            <span className="zl-serif zs-grad-text pr-1">create</span>
            <span className="font-semibold"> today?</span>
          </h1>
        </div>

        <form onSubmit={go} className="flex w-full max-w-3xl flex-col gap-4 rounded-3xl border border-white/15 bg-[#0b0b16]/75 p-4 text-left shadow-[0_30px_80px_-30px_rgb(124_58_237/0.55)] backdrop-blur-xl sm:p-5">
          <div className="flex items-start gap-3">
            <SparkIcon className="mt-3.5 size-5 shrink-0 text-violet-300" />
            <div className="relative w-full">
              {!text && (
                <span aria-hidden className="pointer-events-none absolute top-3 left-0 text-base text-white/40">
                  {typed}
                  <span className="ml-px inline-block h-[1.1em] w-px translate-y-0.5 animate-pulse bg-white/60" />
                </span>
              )}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                aria-label="What will you create"
                className="min-h-16 w-full resize-none bg-transparent py-3 text-base text-white outline-none"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {TARGETS.map((t) => {
                const on = t.id === target.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTarget(t)}
                    aria-pressed={on}
                    className={cn(
                      "flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm transition-all",
                      on ? "border-violet-400/70 bg-violet-500/20 text-white" : "border-white/10 bg-white/[0.04] text-white/65 hover:border-white/25 hover:text-white"
                    )}
                  >
                    <t.icon className="size-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
            <button type="submit" className="zs-btn flex h-11 cursor-pointer items-center gap-2 rounded-xl px-6 text-sm font-semibold">
              <SparkIcon className="size-4" /> Generate
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
