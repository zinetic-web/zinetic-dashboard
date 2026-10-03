"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { AvatarLibrary, HeyGenVoiceLibrary, StylePicker, type AvatarChoice } from "@/components/studio/heygen-pickers";
import type { VoiceChoice } from "@/components/studio/voice-library";
import { useJob } from "@/components/studio/use-job";
import { Field, Output, Segmented, SubmitButton, TextArea, VideoResult, Workspace, EnginePicker, useEngine } from "@/components/studio/ui";

const IDEAS = [
  "A 30 second promo for a new lo-fi album release, calm and cinematic",
  "Explain how music royalties work in simple words for new artists",
  "A friendly welcome video for new subscribers of a music channel",
];

export function PromptVideoForm() {
  const [prompt, setPrompt] = React.useState("");
  const [orientation, setOrientation] = React.useState("auto");
  const [style, setStyle] = React.useState("");
  const [avatar, setAvatar] = React.useState<AvatarChoice | null>(null);
  const [voice, setVoice] = React.useState<VoiceChoice | null>(null);
  const { state, run } = useJob();
  const eng = useEngine();

  return (
    <Workspace
      form={
        <>
          <EnginePicker />
          <Field label="Describe your video" hint="Topic, tone, length">
            <TextArea value={prompt} onChange={setPrompt} max={2000} rows={8} placeholder="A 45 second video explaining..." />
            <div className="flex flex-col items-start gap-2">
              {IDEAS.map((i) => (
                <Button key={i} variant="outline" size="xs" className="h-auto justify-start whitespace-normal py-1.5 text-left" onClick={() => setPrompt(i)}>{i}</Button>
              ))}
            </div>
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
            disabled={!prompt.trim()}
            busyLabel="Creating video"
            onClick={() =>
              run(
                () =>
                  fetch("/api/studio/video/agent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      engine: eng.key,
                      prompt,
                      orientation: orientation === "auto" ? undefined : orientation,
                      styleId: style || undefined,
                      avatarId: avatar?.id,
                      voiceId: voice?.id,
                    }),
                  }),
                { async: true, message: "Your video is being made" }
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
