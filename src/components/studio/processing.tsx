"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const POLL_MS = 10000;

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
export function RunMeter({ id, createdAt, hint, className }: { id: string; createdAt: string; hint?: string; className?: string }) {
  const { progress, stage } = useRunWatch(id);
  const elapsed = useElapsed(createdAt);
  const known = typeof progress === "number";
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        {known ? (
          <div className="h-full rounded-full bg-foreground transition-all duration-700" style={{ width: `${Math.max(4, Math.min(100, progress))}%` }} />
        ) : (
          <div className="h-full w-1/3 animate-[zl-slide_1.8s_ease-in-out_infinite] rounded-full bg-foreground" />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">{stage ?? hint ?? "Working on it"}</span>
        <span className="shrink-0 tabular-nums">
          {elapsed === null ? "" : clock(elapsed)}
          {known && <span className="ml-1.5 text-foreground">{Math.round(progress)}%</span>}
        </span>
      </div>
    </div>
  );
}

/** What a run in progress looks like: a quiet placeholder where the result will be, and the live meter under it. */
export function ProcessingPanel({ id, createdAt, kind = "video", hint }: { id: string; createdAt: string; kind?: "audio" | "video"; hint?: string }) {
  return (
    <div className="flex flex-col gap-3">
      {kind === "audio" ? (
        <div aria-hidden className="flex h-14 items-center gap-[3px] rounded-xl bg-muted/40 px-4 text-muted-foreground/40">
          {Array.from({ length: 48 }, (_, i) => (
            <span key={i} className="zl-wave h-full flex-1 rounded-full bg-current" style={{ animationDelay: `${(i % 16) * 80}ms` }} />
          ))}
        </div>
      ) : (
        <div aria-hidden className="relative aspect-video overflow-hidden rounded-xl bg-muted/40">
          <div className="absolute inset-0 animate-[lib-sheen_2.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />
        </div>
      )}
      <RunMeter id={id} createdAt={createdAt} hint={hint} />
    </div>
  );
}
