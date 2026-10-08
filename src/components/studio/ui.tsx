"use client";

import * as React from "react";
import { Dropdown } from "@/components/studio/dropdown";
import { SparkIcon } from "@/components/spark-icon";
import {
  LuArrowRight,
  LuCheck,
  LuChevronDown,
  LuDownload,
  LuFileText,
  LuLoaderCircle,
  LuPlay,
  LuSearch,
  LuTriangleAlert,
  LuUpload,
  LuUserRound,
  LuX,
} from "react-icons/lu";
import { cn } from "@/lib/utils";
import { TOOLS } from "@/lib/studio/tools";
import type { PublicEngine } from "@/lib/studio/engines";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { JobState } from "@/components/studio/use-job";
import { AudioPlayer } from "@/components/studio/audio-player";
import { VideoPlayer } from "@/components/studio/video-player";
import { useUploadProgress } from "@/components/studio/upload";
import { JobHost } from "@/components/studio/job-context";
import { LocalTime } from "@/components/local-time";
import { RunMeter } from "@/components/studio/processing";
import { RecentSlot } from "@/components/studio/recent-compact";

/* ------------------------------------------------------------------ context */

type ToolCtx = { id: string; engines: PublicEngine[]; key: string; setKey: (k: string) => void };
const ToolContext = React.createContext<ToolCtx | null>(null);

/** Tells the forms and the output which tool they belong to and what engines it has. */
export function ToolProvider({ toolId, engines, children }: { toolId: string; engines: PublicEngine[]; children: React.ReactNode }) {
  const [key, setKey] = React.useState(engines[0]?.key ?? "");
  const value = React.useMemo(() => ({ id: toolId, engines, key, setKey }), [toolId, engines, key]);
  return (
    <ToolContext.Provider value={value}>
      <JobHost>{children}</JobHost>
    </ToolContext.Provider>
  );
}

const useTool = () => {
  const ctx = React.useContext(ToolContext);
  return TOOLS.find((t) => t.id === ctx?.id) ?? TOOLS[0];
};

/** The engine the customer picked for this tool, plus what it supports. */
export function useEngine() {
  const ctx = React.useContext(ToolContext);
  const engine = ctx?.engines.find((e) => e.key === ctx.key) ?? ctx?.engines[0];
  return {
    key: engine?.key ?? "",
    setKey: ctx?.setKey ?? (() => {}),
    engines: ctx?.engines ?? [],
    engine,
    has: (feature: string) => Boolean(engine?.features.includes(feature)),
  };
}

export function costLabel(e: PublicEngine) {
  const m = Number(e.credit_cost) || 1;
  return m === 1 ? "Standard usage" : `${m}x usage`;
}

/* ------------------------------------------------------------------- layout */

export function ToolHeader({ aside }: { aside?: React.ReactNode }) {
  const tool = useTool();
  const Icon = tool.icon;
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <div className="flex min-w-0 items-start gap-3">
        <span className="zs-grad-bg flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-[0_10px_30px_-12px_rgb(124_58_237/0.8)] [&_svg]:size-6">
          <Icon />
        </span>
        <div>
          <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight">{tool.name}</h1>
          <p className="mt-1 text-sm text-white/55">{tool.blurb}</p>
        </div>
      </div>
      {aside && <div className="w-full shrink-0 sm:w-80">{aside}</div>}
    </div>
  );
}

/** The controls on the left, the result on the right. Stacks on small screens. */
export function Workspace({ form, output }: { form: React.ReactNode; output: React.ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
      <div className="zs-card flex flex-col gap-6 p-5 sm:p-6">{form}</div>
      {/* the result stays in view beside the controls while the page scrolls */}
      <div className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-20">
        {output}
        <RecentSlot />
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label className="text-sm font-semibold">{label}</Label>
        {hint && <span className="text-right text-xs text-white/45">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------- inputs */

export function TextInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} />;
}

export function TextArea({
  value,
  onChange,
  max,
  rows = 7,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  max?: number;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20 transition-colors focus-within:border-violet-400/50">
      <textarea
        value={value}
        onChange={(e) => onChange(max ? e.target.value.slice(0, max) : e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[0.95rem] leading-relaxed text-white outline-none placeholder:text-white/30"
      />
      {max && (
        <div className="flex justify-end border-t border-white/[0.07] px-3 py-1.5 text-xs tabular-nums text-white/40">
          {value.length.toLocaleString()} / {max.toLocaleString()}
        </div>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div role="radiogroup" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(options.length, 5)}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex min-h-11 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-center text-sm transition-all",
              on ? "border-violet-400/70 bg-violet-500/15 font-medium text-white shadow-[0_0_0_1px_rgb(139_92_246/0.35),0_8px_24px_-12px_rgb(124_58_237/0.7)]" : "border-white/10 bg-white/[0.03] text-white/70 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            {o.icon}
            <span className="leading-tight">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return <Dropdown value={value} onChange={onChange} options={options} placeholder={placeholder ?? "Choose"} />;
}

/** Blob URL for a picked file, revoked when the file changes or the page unmounts. */
export function useObjectUrl(file: File | null) {
  const url = React.useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  React.useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);
  return url;
}

export function FileDrop({
  accept,
  file,
  onFile,
  hint,
}: {
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
  hint: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [over, setOver] = React.useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={cn("rounded-xl border border-dashed p-4 transition-all", over ? "border-violet-400 bg-violet-500/10" : file ? "border-white/15 bg-white/[0.03]" : "border-white/15 bg-white/[0.02] hover:border-violet-400/50")}
    >
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      {file ? (
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200">
            <LuFileText className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-white/45">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <button type="button" onClick={() => onFile(null)} aria-label="Remove file" className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white">
            <LuX className="size-4" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className="flex w-full cursor-pointer flex-col items-center gap-2.5 py-3 text-center">
          <span className="zs-grad-bg flex size-11 items-center justify-center rounded-full text-white shadow-[0_8px_24px_-10px_rgb(124_58_237/0.9)]">
            <LuUpload className="size-5" />
          </span>
          <span className="text-sm font-medium">Drop a file here, or click to choose</span>
          <span className="max-w-xs text-xs text-white/45">{hint}</span>
        </button>
      )}
    </div>
  );
}

export type PickerItem = { id: string; name: string; meta?: string; preview?: string; image?: string };

/** Searchable list of voices with a preview button. */
export function VoicePicker({ items, value, onChange }: { items: PickerItem[]; value: string; onChange: (id: string) => void }) {
  const [q, setQ] = React.useState("");
  const [playing, setPlaying] = React.useState<string | null>(null);
  const audio = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => () => audio.current?.pause(), []);

  function toggle(item: PickerItem) {
    if (!item.preview) return;
    if (playing === item.id) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    const a = new Audio(item.preview);
    a.onended = () => setPlaying(null);
    audio.current = a;
    void a.play();
    setPlaying(item.id);
  }

  const needle = q.trim().toLowerCase();
  const matches = needle ? items.filter((i) => `${i.name} ${i.meta ?? ""}`.toLowerCase().includes(needle)) : items;
  // thousands of rows would freeze the page, so only the first ones are drawn, search narrows the rest
  const shown = matches.slice(0, 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <LuSearch className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${items.length} voices`} className="pl-8" />
      </div>
      <ul className="max-h-60 divide-y overflow-y-auto rounded-lg border">
        {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No voices found.</li>}
        {matches.length > shown.length && <li className="px-3 py-2 text-center text-xs text-muted-foreground">Showing {shown.length} of {matches.length}. Search to narrow it down.</li>}
        {shown.map((v) => {
          const active = v.id === value;
          return (
            <li key={v.id} className={cn("flex items-center gap-1 pr-1", active && "bg-muted")}>
              <button type="button" onClick={() => onChange(v.id)} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2 text-left">
                <span className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border", active && "border-primary bg-primary text-primary-foreground")}>
                  {active && <LuCheck className="size-3" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{v.name}</span>
                  {v.meta && <span className="block truncate text-xs text-muted-foreground">{v.meta}</span>}
                </span>
              </button>
              {v.preview && (
                <Button variant="ghost" size="icon-sm" onClick={() => toggle(v)} aria-label={`Preview ${v.name}`}>
                  {playing === v.id ? <LuX /> : <LuPlay />}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SubmitButton({
  busy,
  disabled,
  children,
  busyLabel = "Working",
  onClick,
}: {
  busy: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  busyLabel?: string;
  onClick: () => void;
}) {
  const uploading = useUploadProgress();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className="zs-btn flex h-13 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl text-base font-semibold"
    >
      {busy ? <LuLoaderCircle className="size-5 animate-spin" /> : <SparkIcon className="size-5" />}
      {busy ? (uploading !== null ? `Uploading ${uploading}%` : busyLabel) : children}
      {!busy && <LuArrowRight className="size-4 opacity-80" />}
    </button>
  );
}

/** The usage a run takes from a plan, as a short tag. */
const usageTag = (e: PublicEngine) => {
  const m = Number(e.credit_cost) || 1;
  return m === 1 ? "Standard" : m < 1 ? `${m}x · lighter` : `${m}x · heavier`;
};

/** A version badge for an engine: its own initial or number on the brand gradient. */
function EngineMark({ label, active }: { label: string; active?: boolean }) {
  const n = /\d[\d.]*/.exec(label)?.[0];
  const text = n ? `V${n}` : label.slice(0, 2).toUpperCase();
  return (
    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl font-bold", text.length > 3 ? "text-[0.7rem]" : "text-sm", active ? "zs-grad-bg text-white shadow-[0_8px_22px_-10px_rgb(124_58_237/0.9)]" : "bg-white/[0.07] text-white/70")}>
      {text}
    </span>
  );
}

/**
 * Engine choice. One engine is a quiet line. Several are a dropdown whose panel lists each with its
 * own badge, name, a short line about it and how heavy it is on a plan.
 */
export function EnginePicker() {
  const ctx = React.useContext(ToolContext);
  const [open, setOpen] = React.useState(false);
  const box = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!ctx || ctx.engines.length === 0) return null;
  const current = ctx.engines.find((e) => e.key === ctx.key) ?? ctx.engines[0];

  if (ctx.engines.length === 1) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5">
        <EngineMark label={current.label} active />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{current.label}</p>
          {current.description && <p className="truncate text-xs text-white/45">{current.description}</p>}
        </div>
        <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[0.7rem] text-white/60">{usageTag(current)}</span>
      </div>
    );
  }

  return (
    <div ref={box} className="relative">
      <p className="mb-2 text-sm font-semibold">Engine</p>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn("flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-white/[0.04] px-3 py-2.5 text-left transition-colors", open ? "border-violet-400/60" : "border-white/10 hover:border-white/20")}
      >
        <EngineMark label={current.label} active />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{current.label}</span>
          {current.description && <span className="block truncate text-xs text-white/45">{current.description}</span>}
        </span>
        <span className="hidden rounded-full bg-white/[0.07] px-2.5 py-1 text-[0.7rem] text-white/60 sm:block">{usageTag(current)}</span>
        <LuChevronDown className={cn("size-4 shrink-0 text-white/50 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul role="listbox" className="absolute top-full right-0 left-0 z-40 mt-2 flex max-h-96 flex-col gap-1 overflow-y-auto rounded-2xl border border-white/10 bg-[#101020] p-1.5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)]">
          {ctx.engines.map((e) => {
            const on = e.key === current.key;
            return (
              <li key={e.key} role="option" aria-selected={on}>
                <button
                  type="button"
                  onClick={() => {
                    ctx.setKey(e.key);
                    setOpen(false);
                  }}
                  className={cn("flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors", on ? "bg-violet-500/15" : "hover:bg-white/[0.06]")}
                >
                  <EngineMark label={e.label} active={on} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{e.label}</span>
                    {e.description && <span className="line-clamp-2 block text-xs leading-snug text-white/50">{e.description}</span>}
                  </span>
                  <span className="shrink-0 rounded-full bg-white/[0.07] px-2.5 py-1 text-[0.7rem] text-white/60">{usageTag(e)}</span>
                  <span className="flex size-5 shrink-0 items-center justify-center">{on && <LuCheck className="size-4 text-violet-300" />}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- output */

const STATUS: Record<string, { label: string; variant: "secondary" | "outline" | "destructive" | "default" }> = {
  idle: { label: "Waiting", variant: "outline" },
  working: { label: "Working", variant: "secondary" },
  done: { label: "Ready", variant: "default" },
  error: { label: "Failed", variant: "destructive" },
};

/** What the finished result will look like, switched off. Shown before and while a job runs. */
function Placeholder({ busy }: { busy: boolean }) {
  const tool = useTool();

  if (tool.id === "transcribe") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Language</Badge>
          <Button variant="outline" size="sm" disabled>
            <LuDownload /> TXT
          </Button>
          <Button variant="outline" size="sm" disabled>
            <LuDownload /> SRT
          </Button>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="grid grid-cols-[3rem_1fr] gap-3">
              <span className="pt-0.5 text-xs tabular-nums text-muted-foreground/60">0:{String(i * 12).padStart(2, "0")}</span>
              <div className="flex flex-col gap-1.5">
                <Skeleton className={cn("h-3.5 w-full", !busy && "animate-none")} />
                <Skeleton className={cn("h-3.5 w-2/3", !busy && "animate-none")} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tool.id === "short-clips") {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <VideoPlayer key={i} vertical compact disabled busy={busy} />
        ))}
      </div>
    );
  }

  if (tool.group === "video") return <VideoPlayer disabled busy={busy} />;
  return <AudioPlayer disabled busy={busy} />;
}

/**
 * The output card. Before a run it shows the real player or viewer switched off,
 * while working the same thing with a progress bar, and once finished the result.
 */
export function Output({
  state,
  idle,
  working,
  children,
}: {
  state: JobState;
  idle: string;
  working?: string;
  children?: React.ReactNode;
}) {
  const s = STATUS[state.phase];
  const tool = useTool();
  return (
    <Card className="zs-card border-0 bg-transparent ring-0">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="font-heading text-lg">{tool.group === "video" ? "Generated video" : "Generated audio"}</CardTitle>
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              state.phase === "done" ? "bg-emerald-500/15 text-emerald-300" : state.phase === "error" ? "bg-red-500/15 text-red-300" : state.phase === "working" ? "bg-violet-500/15 text-violet-200" : "bg-white/[0.07] text-white/55"
            )}
          >
            <span className={cn("size-1.5 rounded-full", state.phase === "done" ? "bg-emerald-400" : state.phase === "error" ? "bg-red-400" : state.phase === "working" ? "animate-pulse bg-violet-300" : "bg-white/35")} />
            {s.label === "Ready" ? "Ready" : s.label}
          </span>
        </div>
        <CardDescription>
          {state.phase === "working" ? (working ?? "You can leave this page, it will be in your Library when done.") : state.phase === "idle" ? idle : " "}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {state.phase === "done" ? (
          children
        ) : (
          <>
            {state.phase === "working" && (
              <div className="flex flex-col gap-2">
                <Progress value={typeof state.progress === "number" ? state.progress : null} />
                <p className="text-xs text-muted-foreground">
                  {state.stage ?? state.message ?? "Working on it"}
                  {typeof state.progress === "number" ? ` · ${Math.round(state.progress)}%` : ""}
                </p>
              </div>
            )}
            {state.phase === "error" && (
              <Alert variant="destructive">
                <LuTriangleAlert />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <Placeholder busy={state.phase === "working"} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function AudioResult({ id, name }: { id: string; name: string }) {
  return <AudioPlayer src={`/api/studio/files/${id}`} seed={id} name={name} />;
}

export function VideoResult({ id, name, vertical }: { id: string; name: string; vertical?: boolean }) {
  return <VideoPlayer src={`/api/studio/files/${id}`} name={name} vertical={vertical} />;
}

export function DownloadLink({ id, name }: { id: string; name: string }) {
  return (
    <Button variant="outline" size="sm" className="w-fit" nativeButton={false} render={<a href={`/api/studio/files/${id}`} download={name} />}>
      <LuDownload /> Download
    </Button>
  );
}

/** Empty frame for a photo, for the avatar creator. */
export function ImageFrame({ src }: { src: string | null }) {
  return (
    <div className="flex aspect-[3/4] max-h-96 w-full max-w-72 items-center justify-center overflow-hidden rounded-xl border bg-muted/30">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <LuUserRound className="size-10 text-muted-foreground/40" />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ history */

export type HistoryRow = {
  id: string;
  title: string | null;
  status: string;
  mime_type: string | null;
  error: string | null;
  created_at: string;
};

/** Recent generations for one tool. */
export function History({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Recent</h2>
      <ul className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <li key={r.id}>
            <Card size="sm">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="line-clamp-1 text-sm">{r.title ?? "Untitled"}</CardTitle>
                    <CardDescription><LocalTime iso={r.created_at} /></CardDescription>
                  </div>
                  {r.status === "failed" && <Badge variant="destructive">Failed</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {r.status === "processing" && <RunMeter id={r.id} createdAt={r.created_at} />}
                {r.status === "done" && r.mime_type?.startsWith("audio") && <AudioPlayer compact src={`/api/studio/files/${r.id}`} seed={r.id} name="audio.mp3" />}
                {r.status === "done" && r.mime_type?.startsWith("video") && <VideoPlayer compact src={`/api/studio/files/${r.id}`} name="video.mp4" />}
                {r.status === "failed" && <p className="text-xs text-destructive">{r.error ?? "Failed"}</p>}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
