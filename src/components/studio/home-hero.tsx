"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PiArrowUpBold, PiCaretDownBold, PiCornersOutBold, PiFilmSlateBold, PiGaugeBold, PiMagicWandBold, PiMicrophoneBold, PiMusicNotesBold, PiPlusBold, PiSmileyBold, PiTimerBold, PiTranslateBold, PiUserBold, PiWaveformBold } from "react-icons/pi";
import type { IconType } from "react-icons";
import { SparkIcon } from "@/components/spark-icon";
import { AuthBackdrop } from "@/components/auth-backdrop";
import { cn } from "@/lib/utils";

/** Look-and-feel options in the prompt box. They are for show: clicking one cycles its value. */
type Chip = { icon: IconType; options: string[] };
const CHIPS: Record<string, Chip[]> = {
  video: [
    { icon: PiCornersOutBold, options: ["16:9", "9:16", "1:1"] },
    { icon: PiTimerBold, options: ["30 sec", "15 sec", "1 min"] },
    { icon: PiUserBold, options: ["Presenter", "No presenter"] },
    { icon: PiTranslateBold, options: ["English", "Bengali", "Hindi"] },
  ],
  voice: [
    { icon: PiTranslateBold, options: ["English", "Bengali", "Hindi"] },
    { icon: PiSmileyBold, options: ["Warm", "Calm", "Energetic"] },
    { icon: PiGaugeBold, options: ["1.0x", "0.9x", "1.1x"] },
  ],
  music: [
    { icon: PiMusicNotesBold, options: ["Lo-fi", "Pop", "Cinematic"] },
    { icon: PiTimerBold, options: ["60 sec", "30 sec", "2 min"] },
    { icon: PiMicrophoneBold, options: ["With vocals", "Instrumental"] },
  ],
};

const TARGETS = [
  {
    id: "video",
    label: "Video",
    icon: PiFilmSlateBold,
    href: "/studio/prompt-video",
    param: "prompt",
    ideas: ["A cinematic shot of a city at night, neon lights and rain", "A calm promo for a new lo-fi album release", "A friendly welcome video for new subscribers", "Explain how music royalties work, in simple words"],
  },
  {
    id: "voice",
    label: "Voice",
    icon: PiWaveformBold,
    href: "/studio/voice",
    param: "text",
    ideas: ["Welcome to the show, I am so glad you are here", "Turn this script into a warm, natural voiceover", "Read my story aloud in a calm narrator voice", "Say it in Bengali, with a friendly tone"],
  },
  {
    id: "music",
    label: "Music",
    icon: PiMusicNotesBold,
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
  const [picked, setPicked] = React.useState<Record<string, number>>({});
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

        <form onSubmit={go} className="zs-shine flex w-full max-w-3xl flex-col gap-3 rounded-3xl border border-white/10 bg-[#0b0b16]/75 p-4 text-left shadow-[0_30px_80px_-30px_rgb(124_58_237/0.55)] backdrop-blur-xl sm:p-5">
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
            <button type="button" className="mt-2 flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-white/[0.06] px-3 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white">
              <PiMagicWandBold className="size-3.5 text-violet-300" /> Enhance
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {CHIPS[target.id].map((c, i) => {
              const n = picked[`${target.id}${i}`] ?? 0;
              return (
                <button
                  key={`${target.id}${i}`}
                  type="button"
                  onClick={() => setPicked((p) => ({ ...p, [`${target.id}${i}`]: (n + 1) % c.options.length }))}
                  className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] pr-2.5 pl-3 text-xs text-white/75 transition-colors hover:border-white/25 hover:text-white"
                >
                  <c.icon className="size-3.5 text-white/50" />
                  {c.options[n]}
                  <PiCaretDownBold className="size-3 text-white/35" />
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3">
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Attach a file" className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition-colors hover:border-white/25 hover:text-white">
                <PiPlusBold className="size-[1.1rem]" />
              </button>
              <div className="flex rounded-full border border-white/10 bg-white/[0.03] p-1">
                {TARGETS.map((t) => {
                  const on = t.id === target.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTarget(t)}
                      aria-pressed={on}
                      className={cn(
                        "flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm transition-all",
                        on ? "zs-shine zs-shine-thin bg-violet-500/25 text-white" : "text-white/60 hover:text-white"
                      )}
                    >
                      <t.icon className="size-4" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Speak your idea" className="flex size-10 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white">
                <PiMicrophoneBold className="size-[1.15rem]" />
              </button>
              <button type="submit" className="zs-btn flex h-10 cursor-pointer items-center gap-2 rounded-full pr-2 pl-5 text-sm font-semibold">
                Generate
                <span className="flex size-7 items-center justify-center rounded-full bg-white/20">
                  <PiArrowUpBold className="size-4" />
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
