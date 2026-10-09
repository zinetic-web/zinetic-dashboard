"use client";

import * as React from "react";
import { postForm } from "@/components/studio/upload";
import { PiDownloadSimpleBold } from "react-icons/pi";
import type { Transcript } from "@/lib/studio/elevenlabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useJob } from "@/components/studio/use-job";
import { LiveTranscribe } from "@/components/studio/live-transcribe";
import { cn } from "@/lib/utils";
import { Field, FileDrop, Output, Segmented, SubmitButton, TextArea, Workspace, EnginePicker, useEngine } from "@/components/studio/ui";

// what Scribe can pick out of speech, and what each costs on top of the transcript
const KINDS = [
  { value: "all", label: "Everything" },
  { value: "pii", label: "Personal details" },
  { value: "phi", label: "Health details" },
  { value: "pci", label: "Payment details" },
  { value: "offensive_language", label: "Offensive language" },
];

const NL = String.fromCharCode(10);
const clock = (s: number) => {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};
const srtTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(h)}:${p(m)}:${p(sec)},${p(ms, 3)}`;
};

// groups words into lines: a new line starts on a speaker change, a long pause or after ~14 words
function toLines(t: Transcript) {
  const lines: { speaker?: string; start: number; end: number; text: string }[] = [];
  for (const w of t.words) {
    const last = lines[lines.length - 1];
    const count = last ? last.text.split(" ").length : 0;
    if (!last || last.speaker !== w.speaker || w.start - last.end > 1.2 || count >= 14) {
      lines.push({ speaker: w.speaker, start: w.start, end: w.end, text: w.text });
    } else {
      last.text += ` ${w.text}`;
      last.end = w.end;
    }
  }
  return lines;
}

function save(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function TranscribeForm() {
  const [file, setFile] = React.useState<File | null>(null);
  const [speakers, setSpeakers] = React.useState("yes");
  const [terms, setTerms] = React.useState("");
  const [kinds, setKinds] = React.useState<string[]>([]);
  const { state, run } = useJob<{ transcript: Transcript }>();
  const eng = useEngine();

  const toggleKind = (v: string) => setKinds((k) => (v === "all" ? (k.includes("all") ? [] : ["all"]) : k.includes(v) ? k.filter((x) => x !== v) : [...k.filter((x) => x !== "all"), v]));

  function submit() {
    const fd = new FormData();
    fd.append("engine", eng.key);
    fd.append("file", file!);
    fd.append("diarize", speakers === "yes" ? "true" : "false");
    if (terms.trim()) fd.append("keyterms", terms);
    for (const k of kinds) fd.append("entities", k);
    return run(() => postForm("/api/studio/transcribe", fd));
  }

  // the live version has its own page: the words appear as they are spoken
  if (eng.key === "realtime") return <LiveTranscribe />;

  const transcript = state.phase === "done" ? state.data?.transcript : undefined;
  const lines = transcript ? toLines(transcript) : [];
  const speakerName = (id?: string) => (id ? `Speaker ${Number(id.replace(/\D/g, "")) + 1 || id}` : "");

  return (
    <Workspace
      form={
        <>
          <EnginePicker />
          <Field label="Audio or video" hint="Up to 200 MB">
            <FileDrop accept="audio/*,video/*" file={file} onFile={setFile} hint="The language is detected automatically." />
          </Field>
          {eng.has("speakers") && (
          <Field label="Label speakers">
            <Segmented value={speakers} onChange={setSpeakers} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
          </Field>
          )}
          <Field label="Names and words to spell right" hint="Optional · uses about 20% more">
            <TextArea value={terms} onChange={setTerms} rows={3} placeholder="Brand names, people, places. One per line or separated by commas." />
          </Field>
          <Field label="Find in the speech" hint="Optional · uses about 30% more">
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => {
                const on = kinds.includes(k.value);
                return (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => toggleKind(k.value)}
                    aria-pressed={on}
                    className={cn(
                      "flex h-9 cursor-pointer items-center rounded-full border px-4 text-sm transition-all",
                      on ? "zs-shine zs-shine-thin border-transparent bg-violet-500/25 text-white" : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:text-white"
                    )}
                  >
                    {k.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <SubmitButton busy={state.phase === "working"} disabled={!file} busyLabel="Transcribing" onClick={submit}>
            Transcribe
          </SubmitButton>
        </>
      }
      output={
        <Output state={state} idle="The transcript will appear here with timestamps." working="Transcribing your file.">
          {transcript && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Language: {transcript.language || "detected"}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => save("transcript.txt", lines.map((l) => `${l.speaker ? speakerName(l.speaker) + ": " : ""}${l.text}`).join(NL + NL))}
                >
                  <PiDownloadSimpleBold /> TXT
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => save("transcript.srt", lines.map((l, i) => `${i + 1}${NL}${srtTime(l.start)} --> ${srtTime(l.end)}${NL}${l.text}${NL}`).join(NL))}
                >
                  <PiDownloadSimpleBold /> SRT
                </Button>
              </div>
              {transcript.entities && transcript.entities.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                  <p className="text-xs font-semibold text-white/60">Found in the speech</p>
                  <div className="flex flex-wrap gap-1.5">
                    {transcript.entities.map((e, i) => (
                      <span key={i} className="rounded-full bg-violet-500/15 px-2.5 py-1 text-xs text-violet-100">
                        {e.text}
                        {e.type && <span className="ml-1.5 text-white/45">{e.type.replace(/_/g, " ")}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <ol className="flex max-h-[28rem] flex-col gap-3 overflow-y-auto rounded-lg border p-4">
                {lines.map((l, i) => (
                  <li key={i} className="grid grid-cols-[3rem_1fr] gap-3 text-sm">
                    <span className="pt-0.5 text-xs tabular-nums text-muted-foreground">{clock(l.start)}</span>
                    <p>
                      {l.speaker && <span className="mr-2 font-medium">{speakerName(l.speaker)}</span>}
                      {l.text}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Output>
      }
    />
  );
}
