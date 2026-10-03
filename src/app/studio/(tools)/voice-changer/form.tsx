"use client";

import * as React from "react";
import { postForm } from "@/components/studio/upload";
import type { Voice } from "@/lib/studio/elevenlabs";
import { useJob } from "@/components/studio/use-job";
import { VoiceLibrary, type VoiceChoice } from "@/components/studio/voice-library";
import { AudioResult, Field, FileDrop, Output, SubmitButton, Workspace, EnginePicker, useEngine } from "@/components/studio/ui";

export function VoiceChangerForm({ voices }: { voices: Voice[] }) {
  const [file, setFile] = React.useState<File | null>(null);
  const defaults: VoiceChoice[] = React.useMemo(() => voices.map((v) => ({ id: v.id, name: v.name, meta: v.labels ?? v.category, previewUrl: v.previewUrl })), [voices]);
  const [voice, setVoice] = React.useState<VoiceChoice | null>(defaults[0] ?? null);
  const { state, run } = useJob();
  const eng = useEngine();

  function submit() {
    const fd = new FormData();
    fd.append("engine", eng.key);
    fd.append("audio", file!);
    fd.append("voiceId", voice!.id);
    return run(() => postForm("/api/studio/voice-changer", fd));
  }

  return (
    <Workspace
      form={
        <>
          <EnginePicker />
          <Field label="Recording" hint="MP3, WAV, M4A">
            <FileDrop accept="audio/*" file={file} onFile={setFile} hint="The voice in this file is replaced. Timing and emotion stay." />
          </Field>
          <Field label="Change into">
            <VoiceLibrary value={voice} onChange={setVoice} defaults={defaults} />
          </Field>
          <SubmitButton busy={state.phase === "working"} disabled={!file || !voice} busyLabel="Converting" onClick={submit}>
            Change voice
          </SubmitButton>
        </>
      }
      output={
        <Output state={state} idle="The converted audio will appear here." working="Converting your recording.">
          {state.phase === "done" && <AudioResult id={state.id} name="converted.mp3" />}
        </Output>
      }
    />
  );
}
