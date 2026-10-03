"use client";

import * as React from "react";
import {
  LuCheck,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { JobState } from "@/components/studio/use-job";
import { AudioPlayer } from "@/components/studio/audio-player";
import { VideoPlayer } from "@/components/studio/video-player";
import { useUploadProgress } from "@/components/studio/upload";
import { JobHost } from "@/components/studio/job-context";
import { LocalTime } from "@/components/local-time";
import { RunMeter } from "@/components/studio/processing";

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
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-card [&_svg]:size-5">
          <Icon />
        </span>
        <div>
          <h1 className="font-heading text-2xl leading-tight font-semibold">{tool.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{tool.blurb}</p>
        </div>
      </div>
      {aside && <div className="w-full shrink-0 sm:w-80">{aside}</div>}
    </div>
  );
}

/** Settings on the left, output on the right. Stacks on small screens. */
export function Workspace({ form, output }: { form: React.ReactNode; output: React.ReactNode }) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">{form}</CardContent>
      </Card>
      {/* the result stays in view beside the settings while the page scrolls */}
      <div className="min-w-0 lg:sticky lg:top-20">{output}</div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label>{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
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
    <div className="flex flex-col gap-1.5">
      <Textarea
        value={value}
        onChange={(e) => onChange(max ? e.target.value.slice(0, max) : e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="resize-y"
      />
      {max && (
        <p className="text-right text-xs tabular-nums text-muted-foreground">
          {value.length.toLocaleString()} / {max.toLocaleString()}
        </p>
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
  options: { value: T; label: string }[];
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsList className="w-full">
        {options.map((o) => (
          <TabsTrigger key={o.value} value={o.value}>
            {o.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
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
  const current = options.find((o) => o.value === value);
  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="w-full">
        <SelectValue>{current?.label ?? placeholder ?? "Choose"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
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
      className={cn("rounded-lg border border-dashed p-4 transition-colors", over ? "border-primary bg-primary/5" : "bg-muted/20")}
    >
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      {file ? (
        <div className="flex items-center gap-3">
          <LuFileText className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={() => onFile(null)} aria-label="Remove file">
            <LuX />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <LuUpload className="size-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{hint}</p>
          <Button variant="outline" size="sm" onClick={() => ref.current?.click()}>
            Choose file
          </Button>
        </div>
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
    <Button size="lg" onClick={onClick} disabled={busy || disabled} className="w-full">
      {busy && <LuLoaderCircle className="animate-spin" />}
      {busy ? (uploading !== null ? `Uploading ${uploading}%` : busyLabel) : children}
    </Button>
  );
}

/** Engine choice: one engine is a quiet line, two or more are a dropdown. */
export function EnginePicker() {
  const ctx = React.useContext(ToolContext);
  if (!ctx || ctx.engines.length === 0) return null;

  if (ctx.engines.length === 1) {
    const e = ctx.engines[0];
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
        <span className="text-muted-foreground">{e.label}</span>
        <span className="shrink-0 font-medium">{costLabel(e)}</span>
      </div>
    );
  }

  const current = ctx.engines.find((e) => e.key === ctx.key) ?? ctx.engines[0];
  return (
    <Field label="Engine">
      <Select value={current.key} onValueChange={(v) => v && ctx.setKey(v)}>
        <SelectTrigger className="w-full">
          <SelectValue>{current.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ctx.engines.map((e) => (
            <SelectItem key={e.key} value={e.key}>
              <span className="flex w-full items-center justify-between gap-6">
                <span>{e.label}</span>
                <span className="text-xs text-muted-foreground">{costLabel(e)}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current.description && <p className="text-xs text-muted-foreground">{current.description}</p>}
    </Field>
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
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Output</CardTitle>
          <Badge variant={s.variant}>{s.label}</Badge>
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
    <Button variant="outline" size="sm" className="w-fit" render={<a href={`/api/studio/files/${id}`} download={name} />}>
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
