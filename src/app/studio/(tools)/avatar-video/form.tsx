"use client";

import * as React from "react";
import { PiArrowCounterClockwiseBold, PiCaretDownBold } from "react-icons/pi";
import { AvatarLibrary, HeyGenVoiceLibrary, type AvatarChoice, type MyAvatar } from "@/components/studio/heygen-pickers";
import type { VoiceChoice } from "@/components/studio/voice-library";
import { Slider } from "@/components/studio/slider";
import { useJob } from "@/components/studio/use-job";
import { EnginePicker, Field, Output, Segmented, SubmitButton, TextArea, VideoResult, Workspace, useEngine } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const DEFAULTS = { speed: 1, pitch: 0 };

export function AvatarVideoForm({ mine }: { mine: MyAvatar[] }) {
  const [avatar, setAvatar] = React.useState<AvatarChoice | null>(null);
  const [voice, setVoice] = React.useState<VoiceChoice | null>(null);
  const [script, setScript] = React.useState("");
  const [ratio, setRatio] = React.useState("16:9");
  const [quality, setQuality] = React.useState("720p");
  const [background, setBackground] = React.useState<string | null>(null);
  const [captions, setCaptions] = React.useState(false);
  const [speech, setSpeech] = React.useState(DEFAULTS);
  const [expressiveness, setExpressiveness] = React.useState("medium");
  const [motion, setMotion] = React.useState("");
  const [showMore, setShowMore] = React.useState(false);
  const { state, run } = useJob();
  const eng = useEngine();

  // an avatar brings its own voice, until a voice is picked on purpose
  function chooseAvatar(a: AvatarChoice | null) {
    setAvatar(a);
    if (a?.defaultVoiceId && !voice?.id) setVoice({ id: a.defaultVoiceId, name: "The avatar's own voice", meta: "Chosen to match this avatar" });
  }

  function submit() {
    return run(
      () =>
        fetch("/api/studio/video/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            engine: eng.key,
            [avatar?.mine ? "myAvatarId" : "avatarId"]: avatar?.id,
            voiceId: voice?.id,
            script,
            ratio,
            resolution: quality,
            background: background ?? undefined,
            captions,
            speed: speech.speed,
            pitch: speech.pitch,
            ...(avatar?.mine ? { expressiveness, motion: motion || undefined } : {}),
          }),
        }),
      { async: true, message: "Your video is being made", eta: "Avatar videos usually take 2 to 6 minutes." }
    );
  }

  return (
    <Workspace
      form={
        <>
          <EnginePicker />
          <Field label="Presenter">
            <AvatarLibrary value={avatar} onChange={chooseAvatar} mine={mine} />
          </Field>
          <Field label="Voice">
            <HeyGenVoiceLibrary value={voice} onChange={setVoice} />
          </Field>
          <Field label="Script">
            <TextArea value={script} onChange={setScript} max={4000} rows={6} placeholder="What should the presenter say?" />
          </Field>
          <Field label="Shape">
            <Segmented
              value={ratio}
              onChange={setRatio}
              options={[
                { value: "16:9", label: "Wide" },
                { value: "9:16", label: "Vertical" },
                { value: "1:1", label: "Square" },
                { value: "4:5", label: "Portrait" },
              ]}
            />
          </Field>

          <div className="rounded-xl border">
            <button type="button" onClick={() => setShowMore((v) => !v)} aria-expanded={showMore} className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium">
              More options
              <PiCaretDownBold className={cn("size-4 text-muted-foreground transition-transform", showMore && "rotate-180")} />
            </button>
            {showMore && (
              <div className="flex flex-col gap-5 border-t p-4">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Quality</span>
                  <Segmented value={quality} onChange={setQuality} options={[{ value: "720p", label: "720p" }, { value: "1080p", label: "1080p" }]} />
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium">Background</span>
                  <Segmented value={background === null ? "original" : "color"} onChange={(v) => setBackground(v === "color" ? (background ?? "#0f172a") : null)} options={[{ value: "original", label: "Original" }, { value: "color", label: "Solid colour" }]} />
                  {background !== null && (
                    <label className="flex items-center gap-3 text-sm text-muted-foreground">
                      <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} aria-label="Background colour" className="h-9 w-14 cursor-pointer rounded-md border bg-transparent p-1" />
                      {background.toUpperCase()}
                    </label>
                  )}
                </div>

                <Slider label="Speaking speed" value={speech.speed} min={0.5} max={1.5} step={0.05} onChange={(v) => setSpeech((s) => ({ ...s, speed: v }))} left="Slower" right="Faster" />
                <Slider label="Voice pitch" value={speech.pitch} min={-50} max={50} step={5} onChange={(v) => setSpeech((s) => ({ ...s, pitch: v }))} left="Lower" right="Higher" />

                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium">Captions</span>
                    <span className="block text-xs text-muted-foreground">Also gives you a subtitle file.</span>
                  </span>
                  <Switch checked={captions} onCheckedChange={setCaptions} />
                </label>

                {avatar?.mine && (
                  <>
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium">How lively</span>
                      <Segmented value={expressiveness} onChange={setExpressiveness} options={[{ value: "low", label: "Calm" }, { value: "medium", label: "Natural" }, { value: "high", label: "Lively" }]} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium">Movement</span>
                      <input
                        value={motion}
                        onChange={(e) => setMotion(e.target.value.slice(0, 300))}
                        placeholder="For example: nods gently and smiles while speaking"
                        className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      />
                    </div>
                  </>
                )}

                <Button variant="ghost" size="sm" className="w-fit" onClick={() => { setSpeech(DEFAULTS); setBackground(null); setCaptions(false); setQuality("720p"); }}>
                  <PiArrowCounterClockwiseBold /> Reset options
                </Button>
              </div>
            )}
          </div>

          <SubmitButton busy={state.phase === "working"} disabled={!avatar || !voice || !script.trim()} busyLabel="Creating video" onClick={submit}>
            Create video
          </SubmitButton>
        </>
      }
      output={
        <Output state={state} idle="Your video will appear here." working="Videos usually take a few minutes. You can leave this page, it will be in your Library.">
          {state.phase === "done" && <VideoResult id={state.id} name="avatar-video.mp4" vertical={ratio === "9:16"} />}
        </Output>
      }
    />
  );
}
