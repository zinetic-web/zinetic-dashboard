"use client";

import * as React from "react";
import { postForm } from "@/components/studio/upload";
import { AudioPlayer } from "@/components/studio/audio-player";
import { useJob } from "@/components/studio/use-job";
import { AudioResult, Field, FileDrop, Output, SubmitButton, useObjectUrl, Workspace, EnginePicker, useEngine } from "@/components/studio/ui";

export function CleanerForm() {
  const [file, setFile] = React.useState<File | null>(null);
  const { state, run } = useJob();
  const eng = useEngine();
  const original = useObjectUrl(file);

  function submit() {
    const fd = new FormData();
    fd.append("engine", eng.key);
    fd.append("audio", file!);
    return run(() => postForm("/api/studio/isolate", fd));
  }

  return (
    <Workspace
      form={
        <>
          <EnginePicker />
          <Field label="Audio" hint="MP3, WAV, M4A">
            <FileDrop accept="audio/*" file={file} onFile={setFile} hint="Background noise is removed and the voice is isolated." />
          </Field>
          {original && (
            <Field label="Original">
              <AudioPlayer compact src={original} seed="original" name="original.mp3" />
            </Field>
          )}
          <SubmitButton busy={state.phase === "working"} disabled={!file} busyLabel="Cleaning" onClick={submit}>
            Clean audio
          </SubmitButton>
        </>
      }
      output={
        <Output state={state} idle="The cleaned audio will appear here, so you can compare it with the original." working="Removing the noise.">
          {state.phase === "done" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Cleaned</p>
              <AudioResult id={state.id} name="cleaned.mp3" />
            </div>
          )}
        </Output>
      }
    />
  );
}
