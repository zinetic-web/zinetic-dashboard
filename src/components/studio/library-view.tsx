"use client";

import * as React from "react";
import Link from "next/link";
import { LuCheck, LuCopy, LuFileText, LuLoaderCircle, LuSearch, LuTriangleAlert } from "react-icons/lu";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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
const CATEGORIES: { id: Category; label: string; blurb: string }[] = [
  { id: "audio", label: "Voice & audio", blurb: "Speech, music, sound effects and dubbing" },
  { id: "video", label: "Video", blurb: "Avatars, translations, clips and prompt videos" },
  { id: "text", label: "Transcripts", blurb: "Text from your recordings" },
];

function categoryOf(r: LibraryRow): Category {
  if (r.kind === "transcribe") return "text";
  if (r.mime_type?.startsWith("video")) return "video";
  if (r.mime_type?.startsWith("audio")) return "audio";
  return toolOf(r.kind)?.group === "video" ? "video" : "audio";
}

function Header({ r }: { r: LibraryRow }) {
  const tool = toolOf(r.kind);
  const Icon = tool?.icon ?? LuFileText;
  return (
    <div className="flex items-start gap-3">
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white [&_svg]:size-4", tool?.accent ?? "from-slate-500 to-slate-600")}>
        <Icon />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium">{r.title || "Untitled"}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {tool?.name ?? r.kind} · <LocalTime iso={r.created_at} />
        </p>
      </div>
    </div>
  );
}

function Card({ r, working }: { r: LibraryRow; working?: boolean }) {
  const tool = toolOf(r.kind);
  const Icon = tool?.icon ?? LuLoaderCircle;
  const src = `/api/studio/files/${r.id}`;
  const cat = categoryOf(r);
  return (
    <li>
      <article
        className={cn(
          "flex h-full flex-col gap-3 rounded-2xl border bg-card p-3.5 transition-shadow hover:shadow-md",
          working && "border-violet-500/30 shadow-[0_0_0_1px_rgb(139_92_246/0.15)]",
          r.status === "failed" && "border-destructive/30 bg-destructive/[0.03]"
        )}
      >
        <Header r={r} />
        {working && <ProcessingPanel id={r.id} createdAt={r.created_at} icon={<Icon />} kind={cat === "audio" ? "audio" : "video"} />}
        {r.status === "done" && r.mime_type?.startsWith("audio") && <AudioPlayer compact src={src} seed={r.id} name="audio.mp3" />}
        {r.status === "done" && r.mime_type?.startsWith("video") && <VideoPlayer compact src={src} name="video.mp4" />}
        {r.status === "done" && r.kind === "transcribe" && r.result?.text && (
          <div className="flex flex-col gap-2 rounded-xl bg-muted/30 p-3">
            <p className="line-clamp-5 text-sm leading-relaxed text-muted-foreground">{r.result.text}</p>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(r.result?.text ?? "");
                toast.success("Copied");
              }}
              className="flex w-fit cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <LuCopy className="size-3.5" /> Copy text
            </button>
          </div>
        )}
        {r.status === "failed" && (
          <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
            <LuTriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>{r.error ?? "This run failed."} Nothing was used from your plan.</span>
          </div>
        )}
      </article>
    </li>
  );
}

function Grid({ rows, working }: { rows: LibraryRow[]; working?: boolean }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((r) => (
        <Card key={r.id} r={r} working={working} />
      ))}
    </ul>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors", active ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}
    >
      {children}
    </button>
  );
}

/** Everything a customer has made: what is still being made on top, then each kind of result on its own. */
export function LibraryView({ rows }: { rows: LibraryRow[] }) {
  const [category, setCategory] = React.useState<Category | "all">("all");
  const [tool, setTool] = React.useState("");
  const [q, setQ] = React.useState("");

  const needle = q.trim().toLowerCase();
  const inScope = rows.filter((r) => (category === "all" || categoryOf(r) === category) && (!tool || (toolOf(r.kind)?.id ?? r.kind) === tool) && (!needle || (r.title ?? "").toLowerCase().includes(needle) || (toolOf(r.kind)?.name ?? "").toLowerCase().includes(needle)));

  const working = inScope.filter((r) => r.status === "processing");
  const finished = inScope.filter((r) => r.status !== "processing");
  const count = (c: Category | "all") => rows.filter((r) => c === "all" || categoryOf(r) === c).length;

  // the tools that actually have something in this category, as a second row of filters
  const toolsHere = Array.from(new Set(rows.filter((r) => category === "all" || categoryOf(r) === category).map((r) => toolOf(r.kind)?.id ?? r.kind)))
    .map((id) => TOOLS.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => Boolean(t));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <Chip active={category === "all"} onClick={() => { setCategory("all"); setTool(""); }}>
              All <span className="text-xs opacity-60">{count("all")}</span>
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c.id} active={category === c.id} onClick={() => { setCategory(c.id); setTool(""); }}>
                {c.label} <span className="text-xs opacity-60">{count(c.id)}</span>
              </Chip>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <LuSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your library" className="h-9 pl-9" />
          </div>
        </div>
        {toolsHere.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {toolsHere.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTool(tool === t.id ? "" : t.id)}
                aria-pressed={tool === t.id}
                className={cn("flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors", tool === t.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}
              >
                {tool === t.id && <LuCheck className="size-3" />}
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {working.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-500 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-violet-500" />
            </span>
            In progress <span className="font-normal text-muted-foreground">{working.length}</span>
          </h2>
          <Grid rows={working} working />
        </section>
      )}

      {(category === "all" ? CATEGORIES : CATEGORIES.filter((c) => c.id === category)).map((c) => {
        const list = finished.filter((r) => categoryOf(r) === c.id);
        if (list.length === 0) return null;
        return (
          <section key={c.id} className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-semibold">
                {c.label} <span className="font-normal text-muted-foreground">{list.length}</span>
              </h2>
              <p className="text-xs text-muted-foreground">{c.blurb}</p>
            </div>
            <Grid rows={list} />
          </section>
        );
      })}

      {inScope.length === 0 && (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <p className="font-medium">{rows.length === 0 ? "Nothing here yet" : "Nothing matches"}</p>
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
