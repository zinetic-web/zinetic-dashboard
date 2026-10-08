"use client";

import Link from "next/link";
import { LuPlay } from "react-icons/lu";
import { LocalTime } from "@/components/local-time";
import { LandscapeThumb, fmtDuration, useDuration } from "@/components/studio/media-bits";

/** One recent creation on Home: a landscape picture, a play mark on the left, the length and the day on the right. */
export function RecentTile({ id, video, createdAt }: { id: string; video: boolean; createdAt: string }) {
  const src = `/api/studio/files/${id}`;
  const dur = useDuration(src, video ? "video" : "audio");
  return (
    <Link href="/studio/library" className="group relative block aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black/40 transition-colors hover:border-violet-400/50">
      {video ? <video src={`${src}#t=0.1`} preload="metadata" muted playsInline className="size-full object-cover" /> : <LandscapeThumb id={id} className="transition-transform duration-500 group-hover:scale-105" />}
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition-transform group-hover:scale-110">
          <LuPlay className="size-4 translate-x-px" />
        </span>
        <span className="flex items-center gap-1.5 text-xs font-medium tabular-nums text-white/90">
          {dur !== null && <span>{fmtDuration(dur)}</span>}
          {dur !== null && <span className="text-white/40">·</span>}
          <LocalTime iso={createdAt} mode="day" />
        </span>
      </div>
    </Link>
  );
}
