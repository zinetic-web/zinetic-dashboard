"use client";

import * as React from "react";
import { Dropdown } from "@/components/studio/dropdown";
import Link from "next/link";
import {
  LuArrowDownUp,
  LuAudioLines,
  LuClapperboard,
  LuCopy,
  LuDownload,
  LuEllipsis,
  LuFileText,
  LuLayoutGrid,
  LuList,
  LuPause,
  LuPlay,
  LuRotateCw,
  LuSearch,
  LuTriangleAlert,
} from "react-icons/lu";
import { toast } from "sonner";
import { LocalTime } from "@/components/local-time";
import { VideoPlayer } from "@/components/studio/video-player";
import { ProcessingPanel } from "@/components/studio/processing";
import { fmtDuration, twoWords, useDuration, waveFor } from "@/components/studio/media-bits";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TOOLS } from "@/lib/studio/tools";
import { cn } from "@/lib/utils";

export type LibraryRow = {
  id: string;
  kind: string;
  title: string | null;
  status: string;
  mime_type: string | null;
  result: { text?: string } | null;
  error: string | null;
  created_at: string;
  input?: { voiceName?: string } | null;
};

const KIND_TOOL: Record<string, string> = { sfx: "sound-effects", "translation-lipsync": "video-translation" };
const toolOf = (kind: string) => TOOLS.find((t) => t.id === (KIND_TOOL[kind] ?? kind));

type Type = "audio" | "video" | "text";
const TYPES: { id: Type; label: string }[] = [
  { id: "audio", label: "Audio" },
  { id: "video", label: "Video" },
  { id: "text", label: "Transcripts" },
];

function typeOf(r: LibraryRow): Type {
  if (r.kind === "transcribe") return "text";
  if (r.mime_type?.startsWith("video")) return "video";
  if (r.mime_type?.startsWith("audio")) return "audio";
  return toolOf(r.kind)?.group === "video" ? "video" : "audio";
}

const USUALLY: Record<string, string> = {
  "prompt-video": "Usually 6 to 13 minutes",
  "avatar-video": "Usually 2 to 6 minutes",
  "video-translation": "A few minutes per minute of video",
  "translation-lipsync": "A few minutes per minute of video",
  dubbing: "A few minutes per minute of media",
  "lip-sync": "A few minutes per minute of video",
};

/** Prompts are saved as the title and can be full of markdown. Show them as one plain line. */
const plain = (t: string | null) => (t ?? "").replace(/\[[^\]]*\]/g, " ").replace(/[#*_`>~|"]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled";

function useIsClient() {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function dayLabel(iso: string, now: Date) {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(now) - start(d)) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : days < 7 ? "Last 7 days" : "Earlier";
}

/* ------------------------------------------------------------------ actions */

function RowMenu({ r, text }: { r: LibraryRow; text?: string }) {
  const [open, setOpen] = React.useState(false);
  const box = React.useRef<HTMLDivElement>(null);
  const tool = toolOf(r.kind);
  React.useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);
  const item = "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-white/80 hover:bg-white/[0.07]";
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="More" aria-expanded={open} className="flex size-8 cursor-pointer items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white">
        <LuEllipsis className="size-4" />
      </button>
      {open && (
        <div className="absolute right-0 bottom-full z-30 mb-1 w-48 rounded-lg border border-white/10 bg-[#101020] p-1 shadow-[0_18px_40px_-16px_rgb(0_0_0/0.9)]">
          {r.status === "done" && r.mime_type && (
            <a href={`/api/studio/files/${r.id}`} download className={item}>
              <LuDownload className="size-4" /> Download
            </a>
          )}
          {text && (
            <button
              type="button"
              className={item}
              onClick={() => {
                void navigator.clipboard.writeText(text);
                toast.success("Copied");
                setOpen(false);
              }}
            >
              <LuCopy className="size-4" /> Copy text
            </button>
          )}
          {tool?.href && (
            <Link href={tool.href} className={item}>
              <LuRotateCw className="size-4" /> Make another
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------- cards */

type Play = { playing: string | null; progress: number; toggle: (r: LibraryRow) => void; watch: (r: LibraryRow) => void };

function Card({ r, play }: { r: LibraryRow; play: Play }) {
  const type = typeOf(r);
  const tool = toolOf(r.kind);
  const done = r.status === "done";
  const src = done && r.mime_type ? `/api/studio/files/${r.id}` : null;
  const dur = useDuration(src, type === "video" ? "video" : "audio");
  const on = play.playing === r.id;
  const Kind = type === "video" ? LuClapperboard : type === "text" ? LuFileText : LuAudioLines;
  const kindLabel = type === "video" ? "Video" : type === "text" ? "Transcript" : "Audio";
  const sub = r.input?.voiceName || tool?.name || "";
  const bars = React.useMemo(() => waveFor(r.id, 46), [r.id]);

  const footer = (
    <div className="flex items-center gap-1 border-t border-white/[0.07] px-3 py-2">
      <p className="min-w-0 flex-1 truncate text-xs text-white/45">
        <LocalTime iso={r.created_at} mode="datetime" />
      </p>
      {src && (
        <a href={src} download aria-label="Download" className="flex size-8 shrink-0 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white">
          <LuDownload className="size-4" />
        </a>
      )}
      <RowMenu r={r} text={r.result?.text} />
    </div>
  );

  const head = (
    <div className="flex items-start gap-3 p-4 pb-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-violet-300 ring-1 ring-white/10">
        <Kind className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold" title={plain(r.title)}>
          {twoWords(r.title)}
        </p>
        <p className="truncate text-xs text-white/45">
          {kindLabel}
          {sub ? ` · ${sub}` : ""}
        </p>
      </div>
      {dur !== null && <span className="shrink-0 rounded-md bg-white/[0.07] px-2 py-1 text-xs font-medium tabular-nums text-white/75">{fmtDuration(dur)}</span>}
    </div>
  );

  return (
    <article className="zs-card flex flex-col overflow-hidden rounded-xl transition-colors hover:border-violet-400/35">
      {r.status === "processing" ? (
        <>
          {head}
          <div className="px-4 pb-4">
            <ProcessingPanel id={r.id} createdAt={r.created_at} kind={type === "video" ? "video" : "audio"} hint={USUALLY[r.kind]} />
          </div>
        </>
      ) : r.status === "failed" ? (
        <>
          {head}
          <p className="mx-4 mb-4 flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-xs leading-relaxed text-red-200">
            <LuTriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>This did not finish. Nothing was used from your plan.</span>
          </p>
          {footer}
        </>
      ) : type === "video" && src ? (
        <>
          <button type="button" onClick={() => play.watch(r)} aria-label="Watch" className="group relative block aspect-video cursor-pointer overflow-hidden bg-black/40">
            <video src={`${src}#t=0.1`} preload="metadata" muted playsInline className="absolute inset-0 size-full object-cover" />
            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
            <span className="absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-xl transition-transform group-hover:scale-110">
              <LuPlay className="size-5 translate-x-0.5" />
            </span>
            {dur !== null && <span className="absolute right-2.5 bottom-2.5 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium tabular-nums text-white backdrop-blur">{fmtDuration(dur)}</span>}
          </button>
          <div className="px-4 pt-3 pb-3">
            <p className="truncate text-sm font-semibold" title={plain(r.title)}>
              {twoWords(r.title)}
            </p>
            <p className="truncate text-xs text-white/45">Video{sub ? ` · ${sub}` : ""}</p>
          </div>
          {footer}
        </>
      ) : type === "audio" && src ? (
        <>
          {head}
          <div className="flex items-center gap-3 px-4 pb-4">
            <button
              type="button"
              onClick={() => play.toggle(r)}
              aria-label={on ? "Pause" : "Play"}
              className="zs-grad-bg flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white shadow-[0_10px_26px_-10px_rgb(124_58_237/0.95)] transition-transform hover:scale-105 active:scale-95"
            >
              {on ? <LuPause className="size-5" /> : <LuPlay className="size-5 translate-x-0.5" />}
            </button>
            <div aria-hidden className="flex h-11 min-w-0 flex-1 items-center gap-[2px]">
              {bars.map((h, i) => (
                <span key={i} className={cn("flex-1 rounded-full", on && (i + 0.5) / bars.length <= play.progress ? "bg-gradient-to-t from-violet-500 to-blue-400" : "bg-violet-500/35")} style={{ height: `${h * 100}%` }} />
              ))}
            </div>
          </div>
          {footer}
        </>
      ) : (
        <>
          {head}
          <p className="mx-4 mb-4 line-clamp-4 text-sm leading-relaxed text-white/55">{r.result?.text ?? ""}</p>
          {footer}
        </>
      )}
    </article>
  );
}

function ListRow({ r, play }: { r: LibraryRow; play: Play }) {
  const type = typeOf(r);
  const tool = toolOf(r.kind);
  const done = r.status === "done";
  const src = done && r.mime_type ? `/api/studio/files/${r.id}` : null;
  const dur = useDuration(src, type === "video" ? "video" : "audio");
  const on = play.playing === r.id;
  const bars = React.useMemo(() => waveFor(r.id, 36), [r.id]);
  const Kind = type === "video" ? LuClapperboard : type === "text" ? LuFileText : LuAudioLines;

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        {type === "video" && src ? (
          <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-md bg-black/40">
            <video src={`${src}#t=0.1`} preload="metadata" muted playsInline className="absolute inset-0 size-full object-cover" />
            <button type="button" onClick={() => play.watch(r)} aria-label="Watch" className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/35 text-white transition-colors hover:bg-black/50">
              <LuPlay className="size-4 translate-x-px" />
            </button>
          </div>
        ) : type === "audio" && src ? (
          <button
            type="button"
            onClick={() => play.toggle(r)}
            aria-label={on ? "Pause" : "Play"}
            className={cn("flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all", on ? "zs-grad-bg text-white" : "bg-white/[0.07] text-white hover:bg-white/15")}
          >
            {on ? <LuPause className="size-[1.1rem]" /> : <LuPlay className="size-[1.1rem] translate-x-px" />}
          </button>
        ) : (
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/40">
            <Kind className="size-[1.1rem]" />
          </span>
        )}
        <div className="min-w-0 flex-1 sm:flex-none sm:basis-44">
          <p className="truncate text-sm font-semibold" title={plain(r.title)}>
            {twoWords(r.title)}
          </p>
          <p className="truncate text-xs text-white/45">{r.status === "failed" ? <span className="text-red-300">Failed</span> : r.status === "processing" ? "In progress" : r.input?.voiceName || tool?.name || ""}</p>
        </div>
        <span className="hidden w-24 shrink-0 items-center gap-1.5 text-xs text-white/55 md:flex">
          <Kind className="size-3.5 text-violet-300" /> {type === "video" ? "Video" : type === "text" ? "Transcript" : "Audio"}
        </span>
        {type === "audio" && src ? (
          <div aria-hidden className="hidden h-6 min-w-0 flex-1 items-center gap-[2px] lg:flex">
            {bars.map((h, i) => (
              <span key={i} className={cn("flex-1 rounded-full", on && (i + 0.5) / bars.length <= play.progress ? "bg-violet-400" : "bg-white/20")} style={{ height: `${h * 100}%` }} />
            ))}
          </div>
        ) : (
          <div className="hidden flex-1 lg:block" />
        )}
        <span className="w-10 shrink-0 text-right text-xs tabular-nums text-white/55">{fmtDuration(dur)}</span>
        <span className="hidden w-16 shrink-0 text-right text-xs text-white/45 sm:block">
          <LocalTime iso={r.created_at} mode="day" />
        </span>
        {src ? (
          <a href={src} download aria-label="Download" className="flex size-8 shrink-0 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white">
            <LuDownload className="size-4" />
          </a>
        ) : (
          <span className="size-8 shrink-0" />
        )}
        <RowMenu r={r} text={r.result?.text} />
      </div>
      {r.status === "processing" && (
        <div className="mt-2 pl-[4.75rem]">
          <ProcessingPanel id={r.id} createdAt={r.created_at} kind={type === "video" ? "video" : "audio"} hint={USUALLY[r.kind]} />
        </div>
      )}
    </li>
  );
}

/* --------------------------------------------------------------------- page */

/** Everything a customer has made: a toolbar that stays put, results grouped by day, as a grid or a list. */
export function LibraryView({ rows }: { rows: LibraryRow[] }) {
  const ready = useIsClient();
  const [type, setType] = React.useState<Type | "all">("all");
  const [tool, setTool] = React.useState("");
  const [q, setQ] = React.useState("");
  const [oldest, setOldest] = React.useState(false);
  const [view, setView] = React.useState<"grid" | "list">("list");
  const [watching, setWatching] = React.useState<LibraryRow | null>(null);

  const audio = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  React.useEffect(() => () => audio.current?.pause(), []);

  const play: Play = {
    playing,
    progress,
    watch: (r) => {
      audio.current?.pause();
      setPlaying(null);
      setWatching(r);
    },
    toggle: (r) => {
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
    },
  };

  const needle = q.trim().toLowerCase();
  const filtered = rows
    .filter(
      (r) =>
        (type === "all" || typeOf(r) === type) &&
        (!tool || (toolOf(r.kind)?.id ?? r.kind) === tool) &&
        (!needle || plain(r.title).toLowerCase().includes(needle) || (toolOf(r.kind)?.name ?? "").toLowerCase().includes(needle) || (r.input?.voiceName ?? "").toLowerCase().includes(needle))
    )
    .sort((a, b) => (oldest ? 1 : -1) * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));

  const working = filtered.filter((r) => r.status === "processing");
  const finished = filtered.filter((r) => r.status !== "processing");
  const count = (t: Type | "all") => rows.filter((r) => t === "all" || typeOf(r) === t).length;
  const toolsHere = Array.from(new Set(rows.map((r) => toolOf(r.kind)?.id ?? r.kind)))
    .map((id) => TOOLS.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const now = new Date();
  const groups: [string, LibraryRow[]][] = [];
  for (const r of finished) {
    const label = dayLabel(r.created_at, now);
    const g = groups.find(([l]) => l === label);
    if (g) g[1].push(r);
    else groups.push([label, [r]]);
  }

  const body = (list: LibraryRow[]) =>
    view === "grid" ? (
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((r) => (
          <li key={r.id}>
            <Card r={r} play={play} />
          </li>
        ))}
      </ul>
    ) : (
      <div className="zs-card overflow-visible rounded-lg">
        <ul className="divide-y divide-white/[0.07]">
          {list.map((r) => (
            <ListRow key={r.id} r={r} play={play} />
          ))}
        </ul>
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-16 z-10 -mx-4 flex flex-col gap-3 border-b border-white/[0.06] bg-[#07070f]/80 px-4 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" className="inline-flex rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/10">
            {[{ id: "all" as const, label: "All" }, ...TYPES].map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={type === t.id}
                onClick={() => setType(t.id)}
                className={cn("cursor-pointer rounded-lg px-3.5 py-1.5 text-sm transition-colors", type === t.id ? "zs-grad-bg font-medium text-white shadow-[0_6px_20px_-8px_rgb(124_58_237/0.9)]" : "text-white/60 hover:text-white")}
              >
                {t.label}
                <span className={cn("ml-1.5 text-xs", type === t.id ? "text-white/75" : "text-white/40")}>{count(t.id)}</span>
              </button>
            ))}
          </div>

          <div className="relative min-w-44 flex-1 sm:max-w-xs">
            <LuSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-white/40" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, tool or voice" className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pr-3 pl-9 text-sm outline-none placeholder:text-white/35 focus:border-violet-400/50" />
          </div>

          <Dropdown className="w-48" value={tool} onChange={setTool} label="Filter by tool" options={[{ value: "", label: "All tools" }, ...toolsHere.map((t) => ({ value: t.id, label: t.name }))]} />

          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={() => setOldest((v) => !v)} className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-white/70 transition-colors hover:text-white">
              <LuArrowDownUp className="size-4" /> {oldest ? "Oldest first" : "Newest first"}
            </button>
            <div className="inline-flex rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/10">
              {(
                [
                  ["grid", LuLayoutGrid],
                  ["list", LuList],
                ] as const
              ).map(([id, Icon]) => (
                <button key={id} type="button" aria-label={`${id} view`} aria-pressed={view === id} onClick={() => setView(id)} className={cn("flex size-8 cursor-pointer items-center justify-center rounded-lg transition-colors", view === id ? "bg-white/15 text-white" : "text-white/45 hover:text-white")}>
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!ready ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="zs-card aspect-[4/3] animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          {working.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400/70" />
                  <span className="relative inline-flex size-2 rounded-full bg-violet-400" />
                </span>
                In progress <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-xs font-normal text-white/55">{working.length}</span>
              </h2>
              {body(working)}
            </section>
          )}

          {groups.map(([label, list]) => (
            <section key={label} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                {label} <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-xs font-normal text-white/55">{list.length}</span>
              </h2>
              {body(list)}
            </section>
          ))}

          {filtered.length === 0 && (
            <div className="zs-card flex flex-col items-center gap-2 rounded-xl py-16 text-center">
              <p className="font-medium">{rows.length === 0 ? "Nothing here yet" : "Nothing matches"}</p>
              <p className="text-sm text-white/50">
                {rows.length === 0 ? (
                  <>
                    Make something in any{" "}
                    <Link href="/studio" className="underline underline-offset-4">
                      tool
                    </Link>{" "}
                    and it will land here.
                  </>
                ) : (
                  "Try a different filter or search."
                )}
              </p>
            </div>
          )}
        </>
      )}

      <Dialog open={Boolean(watching)} onOpenChange={(o) => !o && setWatching(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogTitle className="pr-8 text-base font-semibold">{watching ? plain(watching.title) : ""}</DialogTitle>
          <DialogDescription className="sr-only">Video player</DialogDescription>
          {watching && <VideoPlayer src={`/api/studio/files/${watching.id}`} name="video.mp4" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
