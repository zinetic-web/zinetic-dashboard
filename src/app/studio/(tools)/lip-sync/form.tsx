"use client";

import * as React from "react";
import { postForm } from "@/components/studio/upload";
import { useJob } from "@/components/studio/use-job";
import { EnginePicker, Field, FileDrop, Output, Segmented, SubmitButton, VideoResult, Workspace, useEngine } from "@/components/studio/ui";
import { Switch } from "@/components/ui/switch";

export function LipSyncForm() {
  const [video, setVideo] = React.useState<File | null>(null);
  const [audio, setAudio] = React.useState<File | null>(null);
  const [mode, setMode] = React.useState("speed");
  const [enhance, setEnhance] = React.useState(false);
  const { state, run } = useJob();
  const eng = useEngine();

  function submit() {
    const fd = new FormData();
    fd.append("engine", eng.key);
    fd.append("video", video!);
    fd.append("audio", audio!);
    fd.append("mode", mode);
    fd.append("enhance", enhance ? "true" : "false");
    return run(() => postForm("/api/studio/video/lipsync", fd), { async: true, message: "Matching the lips to your audio", eta: "Usually a few minutes for every minute of video." });
  }

  return (
    <Workspace
      form={
        <>
          <EnginePicker />
          <Field label="Video" hint="Someone speaking to the camera works best">
            <FileDrop accept="video/*" file={video} onFile={setVideo} hint="MP4 or WebM, with a clear view of the face." />
          </Field>
          <Field label="New audio" hint="The speech the video should be matched to">
            <FileDrop accept="audio/*" file={audio} onFile={setAudio} hint="MP3 or WAV." />
          </Field>
          <Field label="Quality">
            <Segmented value={mode} onChange={setMode} options={[{ value: "speed", label: "Fast" }, { value: "precision", label: "Best quality" }]} />
            <p className="text-xs text-muted-foreground">Best quality handles faces that turn, move a lot or are partly covered, and takes longer.</p>
          </Field>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              <span className="font-medium">Clean up the speech</span>
              <span className="block text-xs text-muted-foreground">Reduces background noise in the new audio.</span>
            </span>
            <Switch checked={enhance} onCheckedChange={setEnhance} />
          </label>
          <SubmitButton busy={state.phase === "working"} disabled={!video || !audio} busyLabel="Working" onClick={submit}>
            Match lips to audio
          </SubmitButton>
        </>
      }
      output={
        <Output state={state} idle="The result appears here." working="This takes a few minutes. You can leave this page, it will be in your Library.">
          {state.phase === "done" && <VideoResult id={state.id} name="lip-sync.mp4" />}
        </Output>
      }
    />
  );
}
