"use client";

import * as React from "react";
import { postForm } from "@/components/studio/upload";
import { VideoPlayer } from "@/components/studio/video-player";
import { useJob } from "@/components/studio/use-job";
import { Field, FileDrop, Output, Segmented, SubmitButton, Workspace, EnginePicker, useEngine } from "@/components/studio/ui";

export function ClipsForm() {
  const [file, setFile] = React.useState<File | null>(null);
  const [count, setCount] = React.useState("3");
  const [length, setLength] = React.useState("45");
  const [format, setFormat] = React.useState("vertical");
  const { state, run } = useJob<{ ids: string[] }>();
  const eng = useEngine();

  function submit() {
    const fd = new FormData();
    fd.append("engine", eng.key);
    fd.append("video", file!);
    fd.append("count", count);
    fd.append("length", length);
    fd.append("format", format);
    return run(() => postForm("/api/studio/video/clips", fd), { message: "Finding your best moments" });
  }

  const ids = state.phase === "done" ? (state.data?.ids ?? [state.id]) : [];

  return (
    <Workspace
      form={
        <>
          <EnginePicker />
          <Field label="Long video" hint="Up to 200 MB">
            <FileDrop accept="video/*" file={file} onFile={setFile} hint="Podcasts, interviews, talks and tutorials work best." />
          </Field>
          <Field label="How many clips">
            <Segmented value={count} onChange={setCount} options={[{ value: "3", label: "3" }, { value: "5", label: "5" }, { value: "8", label: "8" }]} />
          </Field>
          <Field label="Length of each">
            <Segmented value={length} onChange={setLength} options={[{ value: "30", label: "30s" }, { value: "45", label: "45s" }, { value: "60", label: "60s" }, { value: "90", label: "90s" }]} />
          </Field>
          <Field label="Shape">
            <Segmented value={format} onChange={setFormat} options={[{ value: "vertical", label: "Vertical 9:16" }, { value: "original", label: "Original" }]} />
          </Field>
          <SubmitButton busy={state.phase === "working"} disabled={!file} busyLabel="Creating clips" onClick={submit}>
            Create clips
          </SubmitButton>
        </>
      }
      output={
        <Output state={state} idle="Your clips appear here, ready for Shorts, Reels and TikTok." working="Transcribing, picking moments and cutting. A few minutes for a long video.">
          {state.phase === "done" && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {ids.map((id, n) => (
                <div key={id} className="flex flex-col gap-2">
                  <VideoPlayer compact vertical={format === "vertical"} src={`/api/studio/files/${id}`} name={`clip-${n + 1}.mp4`} />
                </div>
              ))}
            </div>
          )}
        </Output>
      }
    />
  );
}
