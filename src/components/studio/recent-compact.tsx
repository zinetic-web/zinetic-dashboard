"use client";

import * as React from "react";
import Link from "next/link";
import { PiArrowRightBold, PiDotsThreeBold, PiDownloadSimpleBold, PiFileTextBold, PiPauseFill, PiPlayFill } from "react-icons/pi";
import { RunMeter } from "@/components/studio/processing";
import { LandscapeThumb, fmtDuration, twoWords, useDuration, waveFor } from "@/components/studio/media-bits";
import { cn } from "@/lib/utils";

type Row = { id: string; title: string | null; status: string; mime_type: string | null; error: string | null; created_at: string; sub?: string };

const Ctx = React.createContext<React.ReactNode>(null);

/** Lets a tool page put its recent runs in the column under the result. */
export function RecentProvider({ recent, children }: { recent: React.ReactNode; children: React.ReactNode }) {
  return <Ctx.Provider value={recent}>{children}</Ctx.Provider>;
}
export const useRecentSlot = () => React.useContext(Ctx);

function Menu({ id, canDownload }: { id: string; canDownload: boolean }) {
  const [open, setOpen] = React.useState(false);
  const box = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="More" aria-expanded={open} className="flex size-8 cursor-pointer items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white">
        <PiDotsThreeBold className="size-4" />
      </button>
      {open && (
        <div className="absolute top-full right-0 zs-shine z-30 mt-1 w-44 rounded-lg border border-white/10 bg-[#101020] p-1 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.9)]">
          <Link href="/studio/library" className="flex h-9 items-center gap-2 rounded-md px-2.5 text-sm text-white/80 hover:bg-white/[0.07]">
            <PiFileTextBold className="size-4" /> Open in Library
          </Link>
          {canDownload && (
            <a href={`/api/studio/files/${id}`} download className="flex h-9 items-center gap-2 rounded-md px-2.5 text-sm text-white/80 hover:bg-white/[0.07]">
              <PiDownloadSimpleBold className="size-4" /> Download
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function Item({ r, playing, progress, onToggle }: { r: Row; playing: boolean; progress: number; onToggle: () => void }) {
  const done = r.status === "done";
  const audio = done && Boolean(r.mime_type?.startsWith("audio"));
  const video = done && Boolean(r.mime_type?.startsWith("video"));
  const src = audio || video ? `/api/studio/files/${r.id}` : null;
  const dur = useDuration(src, video ? "video" : "audio");
  const bars = React.useMemo(() => waveFor(r.id, 34), [r.id]);

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-black/40">
          {video && src ? <video src={`${src}#t=0.1`} preload="metadata" muted playsInline className="size-full object-cover" /> : <LandscapeThumb id={r.id} />}
          {video ? (
            <Link href="/studio/library" aria-label="Open in Library" className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
              <PiPlayFill className="size-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              disabled={!audio}
              aria-label={playing ? "Pause" : "Play"}
              className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/30 text-white transition-colors hover:bg-black/45 disabled:cursor-default disabled:bg-black/50 disabled:text-white/40"
            >
              {playing ? <PiPauseFill className="size-4" /> : <PiPlayFill className="size-4 translate-x-px" />}
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1 sm:flex-none sm:basis-36">
          <p className="truncate text-sm font-semibold">{twoWords(r.title)}</p>
          <p className="truncate text-xs text-white/45">{r.status === "failed" ? <span className="text-red-300">Failed</span> : r.status === "processing" ? "In progress" : (r.sub ?? "")}</p>
        </div>

        {audio ? (
          <div aria-hidden className="hidden h-7 min-w-0 flex-1 items-center gap-[2px] sm:flex">
            {bars.map((h, i) => (
              <span key={i} className={cn("flex-1 rounded-full", (i + 0.5) / bars.length <= progress ? "bg-violet-400" : "bg-white/20")} style={{ height: `${h * 100}%` }} />
            ))}
          </div>
        ) : (
          <div className="hidden flex-1 sm:block" />
        )}

        <span className="w-9 shrink-0 text-right text-xs tabular-nums text-white/55">{fmtDuration(dur)}</span>
        {src ? (
          <a href={src} download aria-label="Download" className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white">
            <PiDownloadSimpleBold className="size-4" />
          </a>
        ) : (
          <span className="size-8 shrink-0" />
        )}
        <Menu id={r.id} canDownload={Boolean(src)} />
      </div>
      {r.status === "processing" && <RunMeter id={r.id} createdAt={r.created_at} className="mt-2 pl-14" />}
    </li>
  );
}

/** The latest runs, one tight list: picture, name, who made it, the sound, the length, and actions. */
export function CompactRecent({ rows }: { rows: Row[] }) {
  const audio = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => () => audio.current?.pause(), []);

  function toggle(r: Row) {
    audio.current?.pause();
    if (playing === r.id) return setPlaying(null);
    const a = new Audio(`/api/studio/files/${r.id}`);
    a.ontimeupdate = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    a.onended = () => {
      setPlaying((p) => (p === r.id ? null : p));
      setProgress(0);
    };
    audio.current = a;
    setProgress(0);
    void a.play().catch(() => setPlaying(null));
    setPlaying(r.id);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="font-heading text-base font-semibold">Recent</h2>
        <Link href="/studio/library" className="flex items-center gap-1 text-xs text-white/50 transition-colors hover:text-white">
          View all <PiArrowRightBold className="size-3.5" />
        </Link>
      </div>
      <div className="zs-card overflow-visible rounded-lg">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-white/40">Nothing yet. What you make will appear here.</p>
        ) : (
          <ul className="divide-y divide-white/[0.07]">
            {rows.map((r) => (
              <Item key={r.id} r={r} playing={playing === r.id} progress={playing === r.id ? progress : 0} onToggle={() => toggle(r)} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/** Where the recent runs go in a workspace, if the page supplied them. */
export function RecentSlot() {
  return <>{useRecentSlot()}</>;
}
