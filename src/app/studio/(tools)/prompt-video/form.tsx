"use client";

import * as React from "react";
import { LuChevronDown, LuDices, LuRectangleHorizontal, LuRectangleVertical, LuSparkles, LuX } from "react-icons/lu";
import { AvatarLibrary, HeyGenVoiceLibrary, StylePicker, type AvatarChoice } from "@/components/studio/heygen-pickers";
import type { VoiceChoice } from "@/components/studio/voice-library";
import { useJob } from "@/components/studio/use-job";
import { Field, Output, Segmented, SubmitButton, VideoResult, Workspace, EnginePicker, useEngine } from "@/components/studio/ui";
import { cn } from "@/lib/utils";

const IDEAS = [
  "A promo for a new lo-fi album release, calm and cinematic",
  "Explain how music royalties work in simple words for new artists",
  "A friendly welcome video for new subscribers of a music channel",
  "A neon-lit city at night, a lone musician walking home with a guitar",
  "Behind the scenes of a studio session, warm light and close-up hands on keys",
];

export function PromptVideoForm({ initialPrompt = "" }: { initialPrompt?: string }) {
  const [mode, setMode] = React.useState("idea");
  const [text, setText] = React.useState(initialPrompt);
  const [seconds, setSeconds] = React.useState("30");
  const [orientation, setOrientation] = React.useState("auto");
  const [style, setStyle] = React.useState("");
  const [avatar, setAvatar] = React.useState<AvatarChoice | null>(null);
  const [voice, setVoice] = React.useState<VoiceChoice | null>(null);
  const [more, setMore] = React.useState(false);
  const { state, run } = useJob();
  const eng = useEngine();
  const script = mode === "script";
  const max = 8000;

  return (
    <Workspace
      form={
        <>
          <EnginePicker />

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-base font-semibold">{script ? "Your script" : "Prompt"}</h2>
              <div className="w-44">
                <Segmented
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "idea", label: "Idea" },
                    { value: "script", label: "Script" },
                  ]}
                />
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20 focus-within:border-violet-400/50">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, max))}
                rows={6}
                placeholder={script ? "Paste the words the presenter should say. Every word is used as written." : "Describe the video: what it is about, the tone, who it is for."}
                className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[0.95rem] leading-relaxed text-white outline-none placeholder:text-white/30"
              />
              <div className="flex items-center justify-between gap-2 border-t border-white/[0.07] px-2.5 py-2">
                <div className="flex gap-1.5">
                  {!script && (
                    <button
                      type="button"
                      onClick={() => setText(IDEAS[Math.floor(Math.random() * IDEAS.length)])}
                      className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-white/75 transition-colors hover:bg-white/[0.09] hover:text-white"
                    >
                      <LuDices className="size-3.5" /> Inspire me
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setText("")}
                    disabled={!text}
                    className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-white/75 transition-colors hover:bg-white/[0.09] hover:text-white disabled:opacity-40"
                  >
                    <LuX className="size-3.5" /> Clear
                  </button>
                </div>
                <span className="text-xs tabular-nums text-white/40">
                  {text.length.toLocaleString()} / {max.toLocaleString()}
                </span>
              </div>
            </div>
          </section>

          <Field label="Aspect ratio">
            <Segmented
              value={orientation}
              onChange={setOrientation}
              options={[
                { value: "auto", label: "Let it decide", icon: <LuSparkles className="size-5" /> },
                { value: "landscape", label: "16:9", icon: <LuRectangleHorizontal className="size-5" /> },
                { value: "portrait", label: "9:16", icon: <LuRectangleVertical className="size-5" /> },
              ]}
            />
          </Field>

          <Field label="Style" hint="The look and pacing of the scenes">
            <StylePicker value={style} onChange={setStyle} />
          </Field>

          <Field label="Duration" hint="Longer videos take longer to make">
            <Segmented
              value={seconds}
              onChange={setSeconds}
              options={[
                { value: "15", label: "15 seconds" },
                { value: "30", label: "30 seconds" },
                { value: "45", label: "45 seconds" },
                { value: "60", label: "1 minute" },
                { value: "90", label: "90 seconds" },
              ]}
            />
          </Field>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
            <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-sm font-medium">
              Advanced settings
              <LuChevronDown className={cn("size-4 text-white/50 transition-transform", more && "rotate-180")} />
            </button>
            {more && (
              <div className="flex flex-col gap-5 border-t border-white/[0.07] p-4">
                <Field label="Presenter" hint="Leave empty and it picks one that fits">
                  <AvatarLibrary value={avatar} onChange={(a) => setAvatar(a && !a.mine ? a : null)} mine={[]} required={false} />
                </Field>
                <Field label="Voice">
                  <HeyGenVoiceLibrary value={voice} onChange={setVoice} />
                </Field>
              </div>
            )}
          </div>

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
            Generate video
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
