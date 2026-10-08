"use client";

import * as React from "react";
import Link from "next/link";
import { LuCopy, LuFileText, LuSearch } from "react-icons/lu";
import { toast } from "sonner";
import { LocalTime } from "@/components/local-time";
import { AudioPlayer } from "@/components/studio/audio-player";
import { VideoPlayer } from "@/components/studio/video-player";
import { ProcessingPanel } from "@/components/studio/processing";
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
};

const KIND_TOOL: Record<string, string> = { sfx: "sound-effects", "translation-lipsync": "video-translation" };
const toolOf = (kind: string) => TOOLS.find((t) => t.id === (KIND_TOOL[kind] ?? kind));

type Category = "audio" | "video" | "text";
const CATEGORIES: { id: Category; label: string }[] = [
  { id: "audio", label: "Voice & audio" },
  { id: "video", label: "Video" },
  { id: "text", label: "Transcripts" },
];

function categoryOf(r: LibraryRow): Category {
  if (r.kind === "transcribe") return "text";
  if (r.mime_type?.startsWith("video")) return "video";
  if (r.mime_type?.startsWith("audio")) return "audio";
  return toolOf(r.kind)?.group === "video" ? "video" : "audio";
}

// how long each kind of long run usually takes, shown until the provider reports a stage
const USUALLY: Record<string, string> = {
  "prompt-video": "Usually 6 to 13 minutes",
  "avatar-video": "Usually 2 to 6 minutes",
  "video-translation": "A few minutes per minute of video",
  "translation-lipsync": "A few minutes per minute of video",
  dubbing: "A few minutes per minute of media",
  "lip-sync": "A few minutes per minute of video",
};

/** Prompts are saved as the title and can be full of markdown. Show them as one plain line. */
const plain = (t: string | null) => (t ?? "").replace(/[#*_`>~|]+/g, " ").replace(/\s+/g, " ").trim() || "Untitled";

function CardHead({ r }: { r: LibraryRow }) {
  const tool = toolOf(r.kind);
  const Icon = tool?.icon ?? LuFileText;
  return (
    <div className="flex items-start gap-3">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md [&_svg]:size-4", tool?.accent ?? "from-slate-500 to-slate-600")}>
        <Icon />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium" title={plain(r.title)}>
          {plain(r.title)}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {tool?.name ?? r.kind} · <LocalTime iso={r.created_at} />
        </p>
      </div>
    </div>
  );
}

function Card({ r }: { r: LibraryRow }) {
  const src = `/api/studio/files/${r.id}`;
  const cat = categoryOf(r);
  return (
    <li>
      <article className={cn("zs-card flex h-full flex-col gap-3.5 p-4 transition-colors hover:border-violet-400/30", r.status === "failed" && "border-red-400/30")}>
        <CardHead r={r} />
        {r.status === "processing" && <ProcessingPanel id={r.id} createdAt={r.created_at} kind={cat === "audio" ? "audio" : "video"} hint={USUALLY[r.kind]} />}
        {r.status === "done" && r.mime_type?.startsWith("audio") && <AudioPlayer compact src={src} seed={r.id} name="audio.mp3" />}
        {r.status === "done" && r.mime_type?.startsWith("video") && <VideoPlayer compact src={src} name="video.mp4" />}
        {r.status === "done" && r.kind === "transcribe" && r.result?.text && (
          <div className="flex flex-col gap-2">
            <p className="line-clamp-5 text-sm leading-relaxed text-muted-foreground">{r.result.text}</p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(r.result?.text ?? "");
                toast.success("Copied");
              }}
              className="flex w-fit cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <LuCopy className="size-3.5" /> Copy text
            </button>
          </div>
        )}
        {r.status === "failed" && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-destructive">Failed.</span> {r.error ?? "This run did not finish."} Nothing was used from your plan.
          </p>
        )}
      </article>
    </li>
  );
}

function Grid({ rows }: { rows: LibraryRow[] }) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => (
        <Card key={r.id} r={r} />
      ))}
    </ul>
  );
}

function Section({ title, count, children }: { title: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-baseline gap-2 text-base font-semibold">
        {title}
        <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-xs font-normal text-white/55">{count}</span>
      </h2>
      {children}
    </section>
  );
}

/** Everything a customer has made: what is still being made first, then each kind of result under its own heading. */
export function LibraryView({ rows }: { rows: LibraryRow[] }) {
  const [category, setCategory] = React.useState<Category | "all">("all");
  const [tool, setTool] = React.useState("");
  const [q, setQ] = React.useState("");

  const needle = q.trim().toLowerCase();
  const inScope = rows.filter(
    (r) =>
      (category === "all" || categoryOf(r) === category) &&
      (!tool || (toolOf(r.kind)?.id ?? r.kind) === tool) &&
      (!needle || plain(r.title).toLowerCase().includes(needle) || (toolOf(r.kind)?.name ?? "").toLowerCase().includes(needle))
  );
  const working = inScope.filter((r) => r.status === "processing");
  const finished = inScope.filter((r) => r.status !== "processing");
  const count = (c: Category | "all") => rows.filter((r) => c === "all" || categoryOf(r) === c).length;

  const toolsHere = Array.from(new Set(rows.filter((r) => category === "all" || categoryOf(r) === category).map((r) => toolOf(r.kind)?.id ?? r.kind)))
    .map((id) => TOOLS.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  const tabs: { id: Category | "all"; label: string }[] = [{ id: "all", label: "All" }, ...CATEGORIES];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" className="inline-flex rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/10">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={category === t.id}
                onClick={() => {
                  setCategory(t.id);
                  setTool("");
                }}
                className={cn("cursor-pointer rounded-lg px-3.5 py-1.5 text-sm transition-colors", category === t.id ? "zs-grad-bg font-medium text-white shadow-[0_6px_20px_-8px_rgb(124_58_237/0.9)]" : "text-white/60 hover:text-white")}
              >
                {t.label}
                <span className={cn("ml-1.5 text-xs", category === t.id ? "text-white/75" : "text-white/40")}>{count(t.id)}</span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-60">
            <LuSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pr-3 pl-9 text-sm outline-none placeholder:text-white/35 focus:border-violet-400/50"
            />
          </div>
        </div>

        {toolsHere.length > 1 && (
          <div className="flex flex-wrap items-center gap-2">
            {toolsHere.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTool(tool === t.id ? "" : t.id)}
                aria-pressed={tool === t.id}
                className={cn("cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors", tool === t.id ? "border-violet-400/60 bg-violet-500/15 text-white" : "border-white/10 text-white/55 hover:border-white/20 hover:text-white")}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {working.length > 0 && (
        <Section
          title={
            <span className="flex items-center gap-2">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400/70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-violet-400" />
              </span>
              In progress
            </span>
          }
          count={working.length}
        >
          <Grid rows={working} />
        </Section>
      )}

      {(category === "all" ? CATEGORIES : CATEGORIES.filter((c) => c.id === category)).map((c) => {
        const list = finished.filter((r) => categoryOf(r) === c.id);
        return list.length === 0 ? null : (
          <Section key={c.id} title={c.label} count={list.length}>
            <Grid rows={list} />
          </Section>
        );
      })}

      {inScope.length === 0 && (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <p className="text-sm font-medium">{rows.length === 0 ? "Nothing here yet" : "Nothing matches"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length === 0 ? (
              <>
                Make something in any <Link href="/studio" className="underline underline-offset-4">tool</Link> and it will land here.
              </>
            ) : (
              "Try a different filter or search."
            )}
          </p>
        </div>
      )}
    </div>
  );
}
