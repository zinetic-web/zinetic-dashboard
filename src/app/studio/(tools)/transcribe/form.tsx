"use client";

import * as React from "react";
import { postForm } from "@/components/studio/upload";
import { PiDownloadSimpleBold } from "react-icons/pi";
import type { Transcript } from "@/lib/studio/elevenlabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useJob } from "@/components/studio/use-job";
import { Field, FileDrop, Output, Segmented, SubmitButton, Workspace, EnginePicker, useEngine } from "@/components/studio/ui";

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
  const { state, run } = useJob<{ transcript: Transcript }>();
  const eng = useEngine();

  function submit() {
    const fd = new FormData();
    fd.append("engine", eng.key);
    fd.append("file", file!);
    fd.append("diarize", speakers === "yes" ? "true" : "false");
    return run(() => postForm("/api/studio/transcribe", fd));
  }

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
