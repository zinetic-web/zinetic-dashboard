"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

// calm nature and landscape photographs, picked per item so each keeps the same picture
const STOCK = [
  "1506905925346-21bda4d32df4",
  "1469474968028-56623f02e42e",
  "1441974231531-c6227db76b6e",
  "1470071459604-3b5ec3a7fe05",
  "1501785888041-af3ef285b470",
  "1472214103451-9374bd1c798e",
  "1500382017468-9049fed747ef",
  "1433086966358-54859d0ed716",
  "1426604966848-d7adac402bff",
  "1447752875215-b2761acb3c5d",
  "1418065460487-3e41a6c84dc5",
  "1475924156734-496f6cac6ec1",
  "1464822759023-fed622ff2c3b",
  "1507525428034-b723cf961d3e",
  "1519681393784-d120267933ba",
  "1494500764479-0c8f2919a3d8",
];

/** A stock landscape photograph used as a thumbnail, always the same for the same id. The parent must be positioned. */
export function LandscapeThumb({ id, className, width = 640 }: { id: string; className?: string; width?: number }) {
  const photo = STOCK[hash(id) % STOCK.length];
  return (
    <Image
      src={`https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=${width}&q=70`}
      alt=""
      fill
      unoptimized
      sizes="(min-width: 1024px) 25vw, 50vw"
      className={cn("object-cover", className)}
    />
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
  const clean = (t ?? "").replace(/\[[^\]]*\]/g, " ").replace(/[#*_`>~|"]+/g, " ").replace(/\s+/g, " ").trim();
  return clean ? clean.split(" ").slice(0, 2).join(" ") : "Untitled";
};

/** Pseudo waveform heights, the same for the same id. */
export function waveFor(id: string, count: number) {
  let h = hash(id);
  return Array.from({ length: count }, (_, i) => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) + i;
    const r = ((h >>> 0) % 1000) / 1000;
    return Math.round((0.2 + r * 0.8 * (0.45 + 0.55 * Math.sin((i / count) * Math.PI))) * 1000) / 1000;
  });
}
