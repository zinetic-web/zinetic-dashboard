"use client";

import * as React from "react";
import { LuDownload, LuPause, LuPlay, LuVolume2, LuVolumeX } from "react-icons/lu";
import { cn } from "@/lib/utils";

const BARS = 64;

/** Deterministic pseudo-waveform, shown until the real one has been read from the file. */
function barsFor(seed: string, count = BARS) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return Array.from({ length: count }, (_, i) => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) + i;
    const r = ((h >>> 0) % 1000) / 1000;
    const env = 0.35 + 0.65 * Math.sin((i / count) * Math.PI);
    return 0.16 + r * 0.84 * env;
  });
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const SPEEDS = [1, 1.25, 1.5, 2, 0.75];
const MAX_DECODE_BYTES = 25 * 1024 * 1024;

/** Plain bars, used as quiet decoration. */
export function WaveArt({ animate = false, className }: { animate?: boolean; className?: string; accent?: string }) {
  const bars = React.useMemo(() => barsFor("wave-art", 72), []);
  return (
    <div aria-hidden className={cn("flex h-full items-center justify-center gap-[3px]", className)}>
      {bars.map((h, i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-full bg-current", animate && "zl-wave")}
          style={{ height: `${h * 100}%`, animationDelay: `${(i % 16) * 70}ms` }}
        />
      ))}
    </div>
  );
}

/**
 * The real shape of the sound: the file is read once when it comes into view and boiled down to a
 * bar per slice of time. Until then (or if it cannot be read) the placeholder shape is used.
 */
function usePeaks(src: string | undefined, enabled: boolean, count: number) {
  const box = React.useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = React.useState<number[] | null>(null);

  React.useEffect(() => {
    const el = box.current;
    if (!enabled || !src || !el || typeof IntersectionObserver === "undefined") return;
    let cancelled = false;
    const seen = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        seen.disconnect();
        void (async () => {
          try {
            const res = await fetch(src);
            const size = Number(res.headers.get("content-length") ?? 0);
            if (!res.ok || size > MAX_DECODE_BYTES) return;
            const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const ctx = new Ctx();
            const audio = await ctx.decodeAudioData(await res.arrayBuffer());
            void ctx.close();
            const data = audio.getChannelData(0);
            const step = Math.max(1, Math.floor(data.length / count));
            const raw = Array.from({ length: count }, (_, i) => {
              let sum = 0;
              const from = i * step;
              const to = Math.min(data.length, from + step);
              for (let j = from; j < to; j += 8) sum += data[j] * data[j];
              return Math.sqrt(sum / Math.max(1, (to - from) / 8));
            });
            const top = Math.max(...raw, 0.0001);
            if (!cancelled) setPeaks(raw.map((v) => 0.1 + 0.9 * Math.pow(v / top, 0.7)));
          } catch {
            // keep the placeholder shape
          }
        })();
      },
      { rootMargin: "200px" }
    );
    seen.observe(el);
    return () => {
      cancelled = true;
      seen.disconnect();
    };
  }, [src, enabled, count]);

  return { box, peaks };
}

/**
 * The real player. With no `src` (or `disabled`) it renders exactly the same
 * controls, switched off, so the output area looks like the finished result
 * before anything has been made.
 */
export function AudioPlayer({
  src,
  seed = "placeholder",
  name = "audio.mp3",
  title,
  disabled = false,
  busy = false,
  compact = false,
}: {
  src?: string;
  seed?: string;
  name?: string;
  title?: string;
  disabled?: boolean;
  busy?: boolean;
  compact?: boolean;
}) {
  const ref = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [time, setTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [muted, setMuted] = React.useState(false);
  const [speed, setSpeed] = React.useState(0);
  const [hover, setHover] = React.useState<number | null>(null);
  const dragging = React.useRef(false);
  const off = disabled || !src;
  const { box, peaks } = usePeaks(src, !off, BARS);
  const bars = React.useMemo(() => peaks ?? barsFor(seed), [peaks, seed]);
  const progress = duration ? time / duration : 0;

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  };
  const seekTo = (frac: number) => {
    const a = ref.current;
    if (a && duration) a.currentTime = Math.max(0, Math.min(1, frac)) * duration;
  };
  const fracOf = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return (e.clientX - r.left) / r.width;
  };
  const cycleSpeed = () => {
    const n = (speed + 1) % SPEEDS.length;
    setSpeed(n);
    if (ref.current) ref.current.playbackRate = SPEEDS[n];
  };
  const pct = progress * 100;

  return (
    <div className={cn("rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent", compact ? "p-3" : "p-4 sm:p-5", off && "select-none")}>
      {!off && (
        <audio
          ref={ref}
          src={src}
          preload="metadata"
          muted={muted}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        />
      )}
      {title && <p className="mb-3 line-clamp-1 text-sm font-medium">{title}</p>}

      <div
        ref={box}
        onPointerDown={
          off
            ? undefined
            : (e) => {
                dragging.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                seekTo(fracOf(e));
              }
        }
        onPointerMove={
          off
            ? undefined
            : (e) => {
                const f = fracOf(e);
                setHover(Math.max(0, Math.min(1, f)));
                if (dragging.current) seekTo(f);
              }
        }
        onPointerUp={() => (dragging.current = false)}
        onPointerLeave={() => setHover(null)}
        className={cn("relative flex touch-none items-center gap-[3px]", compact ? "h-16" : "h-24", off ? "cursor-default" : "cursor-pointer", busy && "animate-pulse")}
      >
        {bars.map((h, i) => {
          const done = !off && (i + 0.5) / bars.length <= progress;
          return (
            <span
              key={i}
              className={cn("flex-1 rounded-full transition-[background-color] duration-200", off ? "bg-white/[0.09]" : done ? "bg-gradient-to-t from-violet-500 to-blue-400" : "bg-violet-500/40")}
              style={{ height: `${h * 100}%` }}
            />
          );
        })}
        {!off && hover !== null && (
          <>
            <span aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-white/40" style={{ left: `${hover * 100}%` }} />
            {duration > 0 && (
              <span className="pointer-events-none absolute -top-6 -translate-x-1/2 rounded bg-white px-1.5 py-0.5 text-[0.65rem] font-medium tabular-nums text-black" style={{ left: `${hover * 100}%` }}>
                {fmt(hover * duration)}
              </span>
            )}
          </>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={off}
          aria-label={playing ? "Pause" : "Play"}
          className={cn(
            "flex shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95 disabled:cursor-default disabled:bg-white/[0.07] disabled:text-white/30 disabled:hover:scale-100",
            off ? "" : "zs-grad-bg shadow-[0_10px_28px_-10px_rgb(124_58_237/0.95)]",
            compact ? "size-10" : "size-12"
          )}
        >
          {playing ? <LuPause className="size-5" /> : <LuPlay className="size-5 translate-x-px" />}
        </button>
        <span className="shrink-0 text-xs tabular-nums text-white/55">
          <span className="text-white">{off ? "0:00" : fmt(time)}</span> / {off || !duration ? "0:00" : fmt(duration)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={time}
          disabled={off}
          onChange={(e) => seekTo(Number(e.target.value) / (duration || 1))}
          aria-label="Seek"
          className="zs-range min-w-0 flex-1"
          style={{ backgroundImage: "linear-gradient(90deg, #7c3aed, #3b82f6), linear-gradient(rgb(255 255 255 / 0.1), rgb(255 255 255 / 0.1))", backgroundSize: `${pct}% 100%, 100% 100%`, backgroundRepeat: "no-repeat" }}
        />
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          disabled={off}
          aria-label={muted ? "Unmute" : "Mute"}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-default disabled:opacity-40"
        >
          {muted ? <LuVolumeX className="size-[1.15rem]" /> : <LuVolume2 className="size-[1.15rem]" />}
        </button>
        {off ? (
          <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/60 opacity-40">
            <LuDownload className="size-[1.15rem]" />
          </span>
        ) : (
          <a href={src} download={name} aria-label="Download" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white">
            <LuDownload className="size-[1.15rem]" />
          </a>
        )}
        <button
          type="button"
          onClick={cycleSpeed}
          disabled={off}
          aria-label="Playback speed"
          className="h-9 min-w-11 shrink-0 cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] px-2.5 text-sm font-medium tabular-nums text-white/85 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-40"
        >
          {SPEEDS[speed]}x
        </button>
      </div>
    </div>
  );
}
