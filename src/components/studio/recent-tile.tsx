"use client";

import Link from "next/link";
import { LuAudioLines, LuClapperboard, LuPlay } from "react-icons/lu";
import { LocalTime } from "@/components/local-time";
import { LandscapeThumb, fmtDuration, useDuration } from "@/components/studio/media-bits";

/** One recent creation on Home: a photo, what kind it is, a play mark on the left, the length and the day on the right. */
export function RecentTile({ id, video, label, createdAt }: { id: string; video: boolean; label: string; createdAt: string }) {
  const src = `/api/studio/files/${id}`;
  const dur = useDuration(src, video ? "video" : "audio");
  const Kind = video ? LuClapperboard : LuAudioLines;
  return (
    <Link href="/studio/library" className="group relative block aspect-[16/10] overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition-colors hover:border-violet-400/50">
      {video ? <video src={`${src}#t=0.1`} preload="metadata" muted playsInline className="absolute inset-0 size-full object-cover" /> : <LandscapeThumb id={id} className="transition-transform duration-500 group-hover:scale-105" />}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
      <span className="absolute top-2.5 left-2.5 flex max-w-[calc(100%-1.25rem)] items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[0.7rem] font-medium text-white backdrop-blur">
        <Kind className="size-3.5 shrink-0 text-violet-300" />
        <span className="truncate">{label}</span>
      </span>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-2.5 pb-2.5">
        <span className="flex size-8 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform group-hover:scale-110">
          <LuPlay className="size-3.5 translate-x-px" />
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium tabular-nums text-white">
          {dur !== null && <span>{fmtDuration(dur)}</span>}
          {dur !== null && <span className="text-white/45">·</span>}
          <LocalTime iso={createdAt} mode="day" />
        </span>
      </div>
    </Link>
  );
}
