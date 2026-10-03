"use client";

import * as React from "react";
import Link from "next/link";
import { LuClock, LuLibrary, LuLoaderCircle } from "react-icons/lu";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { JobView } from "@/components/studio/job-context";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * The window that opens while something is being made: the progress, what it is doing now and how
 * long it has been. It opens for long jobs at once, and for quick ones only if they run longer
 * than a few seconds. Closing it never stops the job.
 */
export function JobModal({ view }: { view: JobView }) {
  const state = view?.state;
  const working = state?.phase === "working" ? state : null;
  const [now, setNow] = React.useState(0);
  const [hiddenFor, setHiddenFor] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!working) return;
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [working?.startedAt]); // eslint-disable-line react-hooks/exhaustive-deps -- restart only for a new run

  const elapsed = working ? Math.max(0, Math.floor((now - working.startedAt) / 1000)) : 0;
  const show = Boolean(working) && hiddenFor !== working?.startedAt && (working?.async || elapsed >= 6);
  const close = () => working && setHiddenFor(working.startedAt);

  return (
    <Dialog open={show} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-sm">
        <DialogTitle className="flex items-center gap-2.5 pr-8 text-lg font-semibold">
          <LuLoaderCircle className="size-5 shrink-0 animate-spin" />
          {working?.message ?? "Working on it"}
        </DialogTitle>
        <DialogDescription className="sr-only">Progress of your request.</DialogDescription>

        <div className="flex flex-col gap-3">
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            {typeof working?.progress === "number" ? (
              <div className="h-full rounded-full bg-foreground transition-all duration-700" style={{ width: `${Math.max(4, Math.min(100, working.progress))}%` }} />
            ) : (
              <div className="h-full w-1/3 animate-[zl-slide_1.8s_ease-in-out_infinite] rounded-full bg-foreground" />
            )}
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-muted-foreground">{working?.stage ?? (elapsed < 8 ? "Getting started" : "Working")}</span>
            <span className="flex shrink-0 items-center gap-1.5 tabular-nums text-muted-foreground">
              <LuClock className="size-3.5" />
              {clock(elapsed)}
              {typeof working?.progress === "number" && <span className="ml-1 font-medium text-foreground">{Math.round(working.progress)}%</span>}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={close}>
            Close
          </Button>
          <Button className="flex-1" nativeButton={false} render={<Link href="/studio/library" />}>
            <LuLibrary /> Library
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
