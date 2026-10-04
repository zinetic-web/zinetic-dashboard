"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useJobPublisher } from "@/components/studio/job-context";

export type JobState<T = unknown> =
  | {
      phase: "working";
      message?: string;
      /** a long job that is finished by the provider, so the page polls for it */
      async?: boolean;
      startedAt: number;
      /** 0 to 100, when the provider says how far along it is */
      progress?: number;
      stage?: string;
      /** how long this usually takes, in words */
      eta?: string;
    }
  | { phase: "idle" }
  | { phase: "done"; id: string; data?: T }
  | { phase: "error"; error: string };

const POLL_MS = 10000;
const GIVE_UP_MS = 3 * 60 * 60 * 1000;

type Poll = { status?: string; error?: string; progress?: number; stage?: string };

/**
 * Runs one generation. `async` tools (video, dubbing) answer immediately with a processing
 * row, which is then polled until the provider has finished. The progress window and the
 * "Stop waiting" button come from the page this runs in, which listens to the state.
 */
export function useJob<T = unknown>() {
  const router = useRouter();
  const publish = useJobPublisher();
  const [state, setState] = React.useState<JobState<T>>({ phase: "idle" });
  const alive = React.useRef(true);
  const runId = React.useRef(0);
  React.useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = React.useCallback(
    async (request: () => Promise<Response>, opts: { async?: boolean; message?: string; eta?: string } = {}) => {
      const my = ++runId.current;
      const current = () => alive.current && runId.current === my;
      const startedAt = Date.now();
      setState({ phase: "working", message: opts.message, async: opts.async, startedAt, eta: opts.eta });
      try {
        const res = await request();
        const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string } & T;
        if (!current()) return;
        if (!res.ok || !json.id) {
          setState({ phase: "error", error: json.error ?? "Something went wrong." });
          return;
        }
        if (!opts.async) {
          setState({ phase: "done", id: json.id, data: json });
          router.refresh();
          return;
        }
        while (current() && Date.now() - startedAt < GIVE_UP_MS) {
          await new Promise((r) => setTimeout(r, POLL_MS));
          if (!current()) return;
          const poll = await fetch(`/api/studio/jobs/${json.id}`, { cache: "no-store" }).catch(() => null);
          const s = (await poll?.json().catch(() => ({}))) as Poll | undefined;
          if (!current()) return;
          if (s?.status === "done") {
            setState({ phase: "done", id: json.id });
            toast.success("Finished. Your result is ready.");
            router.refresh();
            return;
          }
          if (s?.status === "failed") {
            setState({ phase: "error", error: s.error ?? "The provider could not finish this." });
            router.refresh();
            return;
          }
          if (s) setState({ phase: "working", message: opts.message, async: true, startedAt, eta: opts.eta, progress: s.progress, stage: s.stage });
        }
        if (current()) setState({ phase: "error", error: "This is taking longer than expected. It will keep going in the background, check the Library in a while." });
      } catch {
        if (current()) setState({ phase: "error", error: "Could not reach the server." });
      }
    },
    [router]
  );

  // stop watching: the job itself carries on and lands in the Library when it is ready
  const reset = React.useCallback(() => {
    runId.current++;
    setState({ phase: "idle" });
  }, []);

  React.useEffect(() => {
    publish({ state: state as JobState, stop: reset });
  }, [state, publish, reset]);
  React.useEffect(() => () => publish(null), [publish]);

  return { state, run, reset };
}
