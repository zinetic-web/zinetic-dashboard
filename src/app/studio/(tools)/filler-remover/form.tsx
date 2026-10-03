"use client";

import * as React from "react";
import { postForm } from "@/components/studio/upload";
import { useJob } from "@/components/studio/use-job";
import { Field, FileDrop, Output, Segmented, SubmitButton, VideoResult, Workspace, EnginePicker, useEngine } from "@/components/studio/ui";

type Report = { fillers: number; pauses: number; savedSeconds: number; originalSeconds: number };

export function FillerForm() {
  const [file, setFile] = React.useState<File | null>(null);
  const [fillers, setFillers] = React.useState("yes");
  const [pauses, setPauses] = React.useState("1");
  const { state, run } = useJob<Report>();
  const eng = useEngine();

  function submit() {
    const fd = new FormData();
    fd.append("engine", eng.key);
    fd.append("video", file!);
    fd.append("fillers", fillers === "yes" ? "true" : "false");
    fd.append("pauses", pauses === "off" ? "0" : pauses);
    return run(() => postForm("/api/studio/video/fillers", fd), { message: "Cleaning up your video" });
  }

  const report = state.phase === "done" ? state.data : undefined;

  return (
    <Workspace
      form={
        <>
          <EnginePicker />
          <Field label="Video" hint="Up to 200 MB">
            <FileDrop accept="video/*" file={file} onFile={setFile} hint="The speech is transcribed, then the ums and long pauses are cut out." />
          </Field>
          <Field label="Remove ums and ahs">
            <Segmented value={fillers} onChange={setFillers} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
          </Field>
          <Field label="Shorten pauses longer than">
            <Segmented
              value={pauses}
              onChange={setPauses}
              options={[{ value: "off", label: "Off" }, { value: "0.6", label: "0.6s" }, { value: "1", label: "1s" }, { value: "2", label: "2s" }]}
            />
          </Field>
          <SubmitButton busy={state.phase === "working"} disabled={!file} busyLabel="Processing" onClick={submit}>
            Clean up video
          </SubmitButton>
        </>
      }
      output={
        <Output state={state} idle="Your edited video appears here, with a summary of what was removed." working="Transcribing and editing. A few minutes for a long video.">
          {state.phase === "done" && (
            <div className="flex flex-col gap-4">
              <VideoResult id={state.id} name="cleaned.mp4" />
              {report && (
                <p className="text-sm text-white/65">
                  Removed {report.fillers} filler {report.fillers === 1 ? "word" : "words"} and shortened {report.pauses} {report.pauses === 1 ? "pause" : "pauses"}.
                  {" "}Saved {report.savedSeconds}s of {report.originalSeconds}s.
                </p>
              )}
            </div>
          )}
        </Output>
      }
    />
  );
}
