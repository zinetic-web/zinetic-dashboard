"use client";

import * as React from "react";
import { SparkIcon } from "@/components/spark-icon";
import { useRouter } from "next/navigation";
import { PiFilmSlateBold, PiMusicNotesBold, PiWaveformBold } from "react-icons/pi";
import { cn } from "@/lib/utils";

const TARGETS = [
  { id: "video", label: "Video", icon: PiFilmSlateBold, href: "/studio/prompt-video", param: "prompt", placeholder: "Describe the video you want to see..." },
  { id: "voice", label: "Voice", icon: PiWaveformBold, href: "/studio/voice", param: "text", placeholder: "Type what the voice should say..." },
  { id: "music", label: "Music", icon: PiMusicNotesBold, href: "/studio/music", param: "prompt", placeholder: "Describe the song you want to hear..." },
];

/** The big "what will you create" box on Home. It carries the idea into the tool that makes it. */
export function HomePrompt() {
  const router = useRouter();
  const [target, setTarget] = React.useState(TARGETS[0]);
  const [text, setText] = React.useState("");

  function go(e: React.FormEvent) {
    e.preventDefault();
    const q = text.trim() ? `?${target.param}=${encodeURIComponent(text.trim().slice(0, 2000))}` : "";
    router.push(`${target.href}${q}`);
  }

  return (
    <form onSubmit={go} className="zs-card flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <SparkIcon className="mt-3 size-5 shrink-0 text-violet-300" />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder={target.placeholder}
          aria-label="What will you create"
          className="min-h-16 w-full resize-none bg-transparent py-2.5 text-base text-white outline-none placeholder:text-white/35"
        />
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
                  "flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-all",
                  on ? "zs-shine zs-shine-thin border-transparent bg-violet-500/25 text-white" : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:text-white"
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
  );
}
