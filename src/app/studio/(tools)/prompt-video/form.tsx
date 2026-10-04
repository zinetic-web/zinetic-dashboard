"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { AvatarLibrary, HeyGenVoiceLibrary, StylePicker, type AvatarChoice } from "@/components/studio/heygen-pickers";
import type { VoiceChoice } from "@/components/studio/voice-library";
import { useJob } from "@/components/studio/use-job";
import { Field, Output, Segmented, SubmitButton, TextArea, VideoResult, Workspace, EnginePicker, useEngine } from "@/components/studio/ui";

const IDEAS = [
  "A promo for a new lo-fi album release, calm and cinematic",
  "Explain how music royalties work in simple words for new artists",
  "A friendly welcome video for new subscribers of a music channel",
];

export function PromptVideoForm() {
  const [mode, setMode] = React.useState("idea");
  const [text, setText] = React.useState("");
  const [seconds, setSeconds] = React.useState("30");
  const [orientation, setOrientation] = React.useState("auto");
  const [style, setStyle] = React.useState("");
  const [avatar, setAvatar] = React.useState<AvatarChoice | null>(null);
  const [voice, setVoice] = React.useState<VoiceChoice | null>(null);
  const { state, run } = useJob();
  const eng = useEngine();
  const script = mode === "script";

  return (
    <Workspace
      form={
        <>
          <EnginePicker />

          <Field label="What do you have?">
            <Segmented
              value={mode}
              onChange={setMode}
              options={[
                { value: "idea", label: "An idea" },
                { value: "script", label: "A script" },
              ]}
            />
          </Field>

          <Field label={script ? "Your script" : "Describe your video"} hint={script ? "Every word is used as written, one scene for each paragraph" : "What it is about, the tone, who it is for"}>
            <TextArea value={text} onChange={setText} max={8000} rows={8} placeholder={script ? "Paste the words the presenter should say." : "A video explaining..."} />
            {!script && (
              <div className="flex flex-col items-start gap-2">
                {IDEAS.map((i) => (
                  <Button key={i} variant="outline" size="xs" className="h-auto justify-start whitespace-normal py-1.5 text-left" onClick={() => setText(i)}>
                    {i}
                  </Button>
                ))}
              </div>
            )}
          </Field>

          <Field label="Length" hint="A longer video takes longer to make">
            <Segmented
              value={seconds}
              onChange={setSeconds}
              options={[
                { value: "15", label: "15s" },
                { value: "30", label: "30s" },
                { value: "45", label: "45s" },
                { value: "60", label: "1 min" },
                { value: "90", label: "90s" },
              ]}
            />
          </Field>

          <Field label="Shape">
            <Segmented
              value={orientation}
              onChange={setOrientation}
              options={[
                { value: "auto", label: "Let it decide" },
                { value: "landscape", label: "Wide" },
                { value: "portrait", label: "Vertical" },
              ]}
            />
          </Field>

          <Field label="Style" hint="The look and pacing of the scenes">
            <StylePicker value={style} onChange={setStyle} />
          </Field>

          <Field label="Presenter (optional)" hint="Leave empty and it picks one that fits">
            <AvatarLibrary value={avatar} onChange={(a) => setAvatar(a && !a.mine ? a : null)} mine={[]} required={false} />
          </Field>
          <Field label="Voice (optional)">
            <HeyGenVoiceLibrary value={voice} onChange={setVoice} />
          </Field>

          <SubmitButton
            busy={state.phase === "working"}
            disabled={!text.trim()}
            busyLabel="Creating video"
            onClick={() =>
              run(
                () =>
                  fetch("/api/studio/video/agent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      engine: eng.key,
                      prompt: text,
                      script,
                      seconds: Number(seconds),
                      orientation: orientation === "auto" ? undefined : orientation,
                      styleId: style || undefined,
                      avatarId: avatar?.id,
                      voiceId: voice?.id,
                    }),
                  }),
                { async: true, message: "Your video is being made", eta: "Prompt videos usually take 6 to 13 minutes." }
              )
            }
          >
            Create video
          </SubmitButton>
        </>
      }
      output={
        <Output state={state} idle="Your video will appear here." working="Prompt videos take several minutes. You can leave this page, it will be in your Library.">
          {state.phase === "done" && <VideoResult id={state.id} name="video.mp4" vertical={orientation === "portrait"} />}
        </Output>
      }
    />
  );
}
