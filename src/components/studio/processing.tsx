"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const POLL_MS = 6000;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Keeps asking how a run is getting on, and refreshes the page the moment it has finished (or
 * failed), so the card turns into the result by itself. Returns how far along it is, when known.
 */
export function useRunWatch(id: string) {
  const router = useRouter();
  const [info, setInfo] = React.useState<{ progress?: number; stage?: string }>({});

  React.useEffect(() => {
    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch(`/api/studio/jobs/${id}`, { cache: "no-store" });
        const j = (await res.json()) as { status?: string; progress?: number; stage?: string };
        if (stopped) return;
        if (j.status === "done" || j.status === "failed") return router.refresh();
        setInfo({ progress: j.progress, stage: j.stage });
      } catch {
        // try again on the next tick
      }
    };
    const first = setTimeout(check, 1500);
    const t = setInterval(check, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(first);
      clearInterval(t);
    };
  }, [id, router]);

  return info;
}

/** Seconds since a moment, counting live. Draws nothing until the browser has the time. */
export function useElapsed(since: string) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  return now === null ? null : Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
}

/** The clock, the bar and the stage of a run that is still being made. */
export function RunMeter({ id, createdAt, className }: { id: string; createdAt: string; className?: string }) {
  const { progress, stage } = useRunWatch(id);
  const elapsed = useElapsed(createdAt);
  const known = typeof progress === "number";
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        {known ? (
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-700" style={{ width: `${Math.max(4, Math.min(100, progress))}%` }} />
        ) : (
          <div className="h-full w-2/5 animate-[zl-slide_1.8s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="min-w-0 truncate text-muted-foreground">{stage ?? "Working on it"}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {elapsed === null ? "" : clock(elapsed)}
          {known && <span className="ml-1.5 font-medium text-foreground">{Math.round(progress)}%</span>}
        </span>
      </div>
    </div>
  );
}

/**
 * The card body of a run in progress: a soft moving sheen, a pulsing icon and the live meter,
 * so it is plain that something is happening and how long it has been.
 */
export function ProcessingPanel({ id, createdAt, icon, kind = "video" }: { id: string; createdAt: string; icon: React.ReactNode; kind?: "audio" | "video" }) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-muted/20 p-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 animate-[lib-sheen_2.6s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-foreground/[0.05] to-transparent" />
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative flex size-14 items-center justify-center">
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-violet-500/20" />
          <span className="relative flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20 [&_svg]:size-5">{icon}</span>
        </div>
        {kind === "audio" ? (
          <div aria-hidden className="flex h-8 items-center gap-[3px] text-muted-foreground/50">
            {Array.from({ length: 28 }, (_, i) => (
              <span key={i} className="zl-wave h-full w-[3px] rounded-full bg-current" style={{ animationDelay: `${(i % 14) * 90}ms` }} />
            ))}
          </div>
        ) : (
          <div aria-hidden className="flex w-full items-center gap-1.5 text-muted-foreground/40">
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} className="h-10 flex-1 animate-pulse rounded-md bg-current" style={{ animationDelay: `${i * 160}ms` }} />
            ))}
          </div>
        )}
        <RunMeter id={id} createdAt={createdAt} className="w-full" />
      </div>
    </div>
  );
}
