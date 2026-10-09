"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useScribe } from "@elevenlabs/react";
import { PiDownloadSimpleBold, PiMicrophoneBold, PiStopFill, PiWarningBold } from "react-icons/pi";
import { LuLoaderCircle } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EnginePicker, Field, TextArea, Workspace } from "@/components/studio/ui";

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type Phase = "idle" | "starting" | "live" | "ending";

/**
 * Live transcription (Scribe v2 Realtime): the words appear as they are spoken. The session is paid for up
 * front for its longest length, and what was not used is given back when it ends.
 */
export function LiveTranscribe() {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [terms, setTerms] = React.useState("");
  const [savedText, setSavedText] = React.useState<string | null>(null);
  const session = React.useRef<{ id: string; started: number; max: number } | null>(null);
  const textRef = React.useRef("");

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    includeTimestamps: false,
    onError: (e) => setError(e instanceof Error ? e.message : "The live connection had a problem."),
    onQuotaExceededError: (e) => setError(e.error),
    onAuthError: () => setError("The session could not be opened. Please try again."),
  });

  const text = [...scribe.committedTranscripts.map((t) => t.text), scribe.partialTranscript].filter(Boolean).join(" ").trim();
  React.useEffect(() => {
    textRef.current = text;
  }, [text]);

  const finish = React.useCallback(async () => {
    const s = session.current;
    if (!s) return;
    session.current = null;
    setPhase("ending");
    scribe.disconnect();
    const seconds = Math.round((Date.now() - s.started) / 1000);
    try {
      await fetch("/api/studio/transcribe/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finish", id: s.id, seconds, text: textRef.current }),
      });
      setSavedText(textRef.current);
      router.refresh();
    } catch {
      setError("The session ended but could not be saved. Your plan is not charged beyond the session length.");
    }
    setPhase("idle");
  }, [router, scribe]);

  // the clock, and the automatic stop at the session's longest length
  React.useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => {
      const s = session.current;
      if (!s) return;
      const sec = (Date.now() - s.started) / 1000;
      setElapsed(sec);
      if (sec >= s.max - 1) void finish();
    }, 500);
    return () => clearInterval(t);
  }, [phase, finish]);

  async function start() {
    setError(null);
    setSavedText(null);
    scribe.clearTranscripts();
    setPhase("starting");
    try {
      const res = await fetch("/api/studio/transcribe/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
      const j = (await res.json().catch(() => ({}))) as { id?: string; token?: string; maxSeconds?: number; modelId?: string; error?: string };
      if (!res.ok || !j.id || !j.token) {
        setError(j.error ?? "Could not start the session.");
        setPhase("idle");
        return;
      }
      session.current = { id: j.id, started: Date.now(), max: j.maxSeconds ?? 900 };
      const keyterms = terms
        .split(/[\n,]/)
        .map((t) => t.trim())
        .filter((t) => t && t.length <= 50)
        .slice(0, 100);
      try {
        await scribe.connect({ token: j.token, modelId: j.modelId ?? "scribe_v2_realtime", keyterms: keyterms.length ? keyterms : undefined, microphone: { echoCancellation: true, noiseSuppression: true } });
        setElapsed(0);
        session.current.started = Date.now();
        setPhase("live");
      } catch {
        await fetch("/api/studio/transcribe/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel", id: j.id }) }).catch(() => {});
        session.current = null;
        setError("Could not open the microphone. Allow microphone access in your browser and try again.");
        setPhase("idle");
      }
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setPhase("idle");
    }
  }

  const live = phase === "live";
  const shown = savedText ?? text;

  function save() {
    const url = URL.createObjectURL(new Blob([shown], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "live-transcript.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Workspace
      form={
        <>
          <EnginePicker />
          <Field label="Names and words to spell right" hint="Optional">
            <TextArea value={terms} onChange={setTerms} rows={3} placeholder="Brand names, people, places. One per line or separated by commas." />
          </Field>
          <p className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 text-xs leading-relaxed text-white/55">
            Each session can run up to 15 minutes. It is reserved from your plan when it starts, and whatever you did not use goes straight back when you stop.
          </p>
          {live ? (
            <Button onClick={finish} size="lg" variant="destructive" className="w-full">
              <PiStopFill /> Stop and save · {clock(elapsed)}
            </Button>
          ) : (
            <Button onClick={start} size="lg" disabled={phase !== "idle"} className="w-full">
              {phase === "idle" ? <PiMicrophoneBold /> : <LuLoaderCircle className="animate-spin" />}
              {phase === "starting" ? "Opening the microphone" : phase === "ending" ? "Saving" : "Start talking"}
            </Button>
          )}
          {error && (
            <p className="flex items-start gap-2 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">
              <PiWarningBold className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}
        </>
      }
      output={
        <div className="zs-card flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-lg font-semibold">Live transcript</h2>
            <span className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", live ? "bg-red-500/15 text-red-300" : savedText !== null ? "bg-emerald-500/15 text-emerald-300" : "bg-white/[0.07] text-white/55")}>
              <span className={cn("size-1.5 rounded-full", live ? "animate-pulse bg-red-400" : savedText !== null ? "bg-emerald-400" : "bg-white/35")} />
              {live ? "Listening" : savedText !== null ? "Saved" : "Waiting"}
            </span>
          </div>
          <div className="min-h-64 rounded-xl border border-white/[0.08] bg-black/20 p-4 text-sm leading-relaxed">
            {shown ? <p className="whitespace-pre-wrap">{shown}</p> : <p className="text-white/40">{live ? "Say something. The words appear here as you speak." : "Press Start talking and speak. The words appear here as you go."}</p>}
          </div>
          {shown && !live && (
            <div>
              <Button variant="outline" size="sm" onClick={save}>
                <PiDownloadSimpleBold /> TXT
              </Button>
            </div>
          )}
        </div>
      }
    />
  );
}
