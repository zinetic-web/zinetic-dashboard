"use client";

import * as React from "react";
import Link from "next/link";
import { LuArrowRight, LuDownload, LuFileText, LuPause, LuPlay } from "react-icons/lu";
import { LocalTime } from "@/components/local-time";
import { RunMeter } from "@/components/studio/processing";
import { cn } from "@/lib/utils";

type Row = { id: string; title: string | null; status: string; mime_type: string | null; error: string | null; created_at: string };

const Ctx = React.createContext<React.ReactNode>(null);

/** Lets a tool page put its recent runs in the column under the result. */
export function RecentProvider({ recent, children }: { recent: React.ReactNode; children: React.ReactNode }) {
  return <Ctx.Provider value={recent}>{children}</Ctx.Provider>;
}
export const useRecentSlot = () => React.useContext(Ctx);

const plain = (t: string | null) => (t ?? "").replace(/[#*_`>~|]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled";

/** The latest runs as a tight list: play, title, time, download. Fills the space under the result. */
export function CompactRecent({ rows }: { rows: Row[] }) {
  const audio = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState<string | null>(null);
  React.useEffect(() => () => audio.current?.pause(), []);

  function toggle(r: Row) {
    audio.current?.pause();
    if (playing === r.id) return setPlaying(null);
    const a = new Audio(`/api/studio/files/${r.id}`);
    a.onended = () => setPlaying((p) => (p === r.id ? null : p));
    audio.current = a;
    void a.play().catch(() => setPlaying(null));
    setPlaying(r.id);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-heading text-base font-semibold">Recent</h2>
        <Link href="/studio/library" className="flex items-center gap-1 text-xs text-white/50 transition-colors hover:text-white">
          View all <LuArrowRight className="size-3.5" />
        </Link>
      </div>
      {rows.length === 0 && <p className="zs-card px-4 py-8 text-center text-sm text-white/40">Nothing yet. What you make will appear here.</p>}
      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const done = r.status === "done";
          const on = playing === r.id;
          const audio = done && Boolean(r.mime_type?.startsWith("audio"));
          const video = done && Boolean(r.mime_type?.startsWith("video"));
          return (
            <li key={r.id} className="zs-card px-3.5 py-3 transition-colors hover:border-violet-400/30 hover:bg-white/[0.04]">
              <div className="flex items-center gap-3">
                {video ? (
                  <Link href="/studio/library" aria-label="Open in Library" className="relative block h-11 w-[4.75rem] shrink-0 overflow-hidden rounded-lg bg-black/40">
                    <video src={`/api/studio/files/${r.id}#t=0.1`} preload="metadata" muted playsInline className="size-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
                      <LuPlay className="size-4" />
                    </span>
                  </Link>
                ) : audio ? (
                  <button
                    type="button"
                    onClick={() => toggle(r)}
                    aria-label={on ? "Pause" : "Play"}
                    className={cn("flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all", on ? "zs-grad-bg text-white" : "bg-white/[0.07] text-white hover:bg-white/15")}
                  >
                    {on ? <LuPause className="size-4" /> : <LuPlay className="size-4 translate-x-px" />}
                  </button>
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/35">
                    <LuFileText className="size-4" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{plain(r.title)}</p>
                  <p className="truncate text-xs text-white/45">
                    {r.status === "failed" ? <span className="text-red-300">Failed</span> : r.status === "processing" ? "In progress" : <LocalTime iso={r.created_at} mode="short" />}
                  </p>
                </div>
                {(audio || video) && (
                  <a href={`/api/studio/files/${r.id}`} download aria-label="Download" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/10 hover:text-white">
                    <LuDownload className="size-4" />
                  </a>
                )}
              </div>
              {r.status === "processing" && <RunMeter id={r.id} createdAt={r.created_at} className="mt-2 pl-[3.25rem]" />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Where the recent runs go in a workspace, if the page supplied them. */
export function RecentSlot() {
  return <>{useRecentSlot()}</>;
}
