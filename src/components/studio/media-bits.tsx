"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

// sky top, sky bottom, sun, far hills, middle hills, near hills
const SCENES = [
  ["#1e1b4b", "#fb923c", "#fde68a", "#4c1d95", "#312e81", "#1e1b4b"],
  ["#0c4a6e", "#7dd3fc", "#fef3c7", "#0369a1", "#075985", "#0c4a6e"],
  ["#312e81", "#f9a8d4", "#fef9c3", "#6d28d9", "#4338ca", "#1e1b4b"],
  ["#134e4a", "#a7f3d0", "#fefce8", "#0f766e", "#115e59", "#064e3b"],
  ["#1e293b", "#fda4af", "#ffedd5", "#7c3aed", "#4c1d95", "#1e1b4b"],
  ["#0f172a", "#93c5fd", "#e0f2fe", "#1d4ed8", "#1e3a8a", "#172554"],
];

/** A clean landscape picture, always the same for the same id, used as a thumbnail. */
export function LandscapeThumb({ id, className }: { id: string; className?: string }) {
  const h = hash(id);
  const [top, bottom, sun, far, mid, near] = SCENES[h % SCENES.length];
  const gid = `g${h}`;
  const sx = 40 + (h % 120);
  return (
    <svg viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden className={cn("block size-full", className)}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="200" height="120" fill={`url(#${gid})`} />
      <circle cx={sx} cy="52" r="15" fill={sun} opacity="0.92" />
      <path d={`M0 78 L${30 + (h % 20)} 54 L${62 + (h % 14)} 74 L${96 + (h % 18)} 46 L${140 + (h % 12)} 76 L170 58 L200 74 L200 120 L0 120Z`} fill={far} opacity="0.9" />
      <path d={`M0 92 L${40 + (h % 16)} 70 L${78 + (h % 12)} 90 L${118 + (h % 14)} 66 L${160 + (h % 10)} 88 L200 72 L200 120 L0 120Z`} fill={mid} />
      <path d={`M0 106 Q50 90 100 104 T200 100 L200 120 L0 120Z`} fill={near} />
    </svg>
  );
}

/** How long a recording is. Read from the file itself, since we do not store it. Null until known. */
export function useDuration(src: string | null, kind: "audio" | "video" = "audio") {
  const [seconds, setSeconds] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!src) return;
    const el = document.createElement(kind);
    el.preload = "metadata";
    const done = () => Number.isFinite(el.duration) && setSeconds(el.duration);
    el.addEventListener("loadedmetadata", done);
    el.src = src;
    return () => {
      el.removeEventListener("loadedmetadata", done);
      el.removeAttribute("src");
      el.load();
    };
  }, [src, kind]);
  return seconds;
}

export const fmtDuration = (s: number | null) => (s === null ? "" : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`);

/** The first two words of a title, with markdown and stray marks removed. */
export const twoWords = (t: string | null) => {
  const clean = (t ?? "").replace(/[#*_`>~|]+/g, " ").replace(/\s+/g, " ").trim();
  return clean ? clean.split(" ").slice(0, 2).join(" ") : "Untitled";
};

/** Pseudo waveform heights, the same for the same id. */
export function waveFor(id: string, count: number) {
  let h = hash(id);
  return Array.from({ length: count }, (_, i) => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) + i;
    const r = ((h >>> 0) % 1000) / 1000;
    return 0.2 + r * 0.8 * (0.45 + 0.55 * Math.sin((i / count) * Math.PI));
  });
}
