"use client";

import * as React from "react";
import { LuChevronDown, LuRotateCcw, LuSparkles } from "react-icons/lu";
import type { Voice } from "@/lib/studio/elevenlabs";
import { useJob } from "@/components/studio/use-job";
import { VoiceLibrary, type VoiceChoice } from "@/components/studio/voice-library";
import { Slider } from "@/components/studio/slider";
import { AudioResult, EnginePicker, Field, Output, SelectField, SubmitButton, TextArea, Workspace, useEngine } from "@/components/studio/ui";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const DEFAULTS = { stability: 0.5, similarity: 0.75, style: 0, speed: 1, speakerBoost: true };

// speech in these is set with a language code instead of being guessed from the text
const LANGUAGES: [string, string][] = [
  ["", "Detect from the text"], ["en", "English"], ["bn", "Bangla"], ["hi", "Hindi"], ["ur", "Urdu"], ["ar", "Arabic"], ["es", "Spanish"], ["fr", "French"],
  ["de", "German"], ["pt", "Portuguese"], ["it", "Italian"], ["tr", "Turkish"], ["ru", "Russian"], ["ja", "Japanese"], ["ko", "Korean"], ["zh", "Chinese"],
  ["id", "Indonesian"], ["ta", "Tamil"], ["nl", "Dutch"], ["pl", "Polish"],
];

const TAGS = ["[laughs]", "[whispers]", "[sighs]", "[excited]", "[sarcastic]", "[curious]", "[crying]", "[shouting]", "[calm]", "[pauses]"];

export function VoiceForm({ voices, initialText = "" }: { voices: Voice[]; initialText?: string }) {
  const defaults: VoiceChoice[] = React.useMemo(() => voices.map((v) => ({ id: v.id, name: v.name, meta: v.labels ?? v.category, previewUrl: v.previewUrl })), [voices]);
  const [text, setText] = React.useState(initialText);
  const [voice, setVoice] = React.useState<VoiceChoice | null>(defaults[0] ?? null);
  const [language, setLanguage] = React.useState("");
  const [settings, setSettings] = React.useState(DEFAULTS);
  const [touched, setTouched] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const { state, run } = useJob();
  const eng = useEngine();

  const set = <K extends keyof typeof DEFAULTS>(k: K, v: (typeof DEFAULTS)[K]) => {
    setSettings((s) => ({ ...s, [k]: v }));
    setTouched(true);
  };
  const tagged = eng.has("audio-tags") || eng.has("expressive");
  const max = eng.engine?.max_chars ?? 5000;

  return (
    <Workspace
      form={
        <>
          <EnginePicker />

          <Field label="Voice">
            <VoiceLibrary value={voice} onChange={setVoice} defaults={defaults} />
          </Field>

          <Field label="Script">
            <TextArea value={text} onChange={setText} max={max} rows={9} placeholder="Type or paste what the voice should say." />
            {tagged && (
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <LuSparkles className="size-3.5" /> Add feeling with audio tags. Click one to add it to the script.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {TAGS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setText((s) => (s ? `${s}${/\s$/.test(s) ? "" : " "}${t} ` : `${t} `).slice(0, max))}
                      className="cursor-pointer rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs text-violet-100 transition-colors hover:bg-violet-500/25"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Field>

          <Field label="Language">
            <SelectField value={language} onChange={setLanguage} options={LANGUAGES.map(([value, label]) => ({ value, label }))} />
          </Field>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
            <button type="button" onClick={() => setShowSettings((v) => !v)} aria-expanded={showSettings} className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium">
              Advanced settings
              <LuChevronDown className={cn("size-4 text-muted-foreground transition-transform", showSettings && "rotate-180")} />
            </button>
            {showSettings && (
              <div className="flex flex-col gap-5 border-t border-white/[0.07] p-4">
                <Slider label="Stability" value={settings.stability} onChange={(v) => set("stability", v)} left="More expressive" right="More steady" />
                <Slider label="Similarity" value={settings.similarity} onChange={(v) => set("similarity", v)} left="More freedom" right="Closer to the voice" />
                <Slider label="Style" value={settings.style} onChange={(v) => set("style", v)} left="Neutral" right="Exaggerated" />
                <Slider label="Speed" value={settings.speed} min={0.7} max={1.2} step={0.05} onChange={(v) => set("speed", v)} left="Slower" right="Faster" />
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium">Speaker boost</span>
                    <span className="block text-xs text-muted-foreground">Makes the voice sound a little more like the original.</span>
                  </span>
                  <Switch checked={settings.speakerBoost} onCheckedChange={(c) => set("speakerBoost", c)} />
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit"
                  onClick={() => {
                    setSettings(DEFAULTS);
                    setTouched(false);
                  }}
                >
                  <LuRotateCcw /> Reset to default
                </Button>
              </div>
            )}
          </div>

          <SubmitButton
            busy={state.phase === "working"}
            disabled={!text.trim() || !voice}
            busyLabel="Generating"
            onClick={() =>
              run(() =>
                fetch("/api/studio/voice", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    engine: eng.key,
                    text,
                    voiceId: voice?.id,
                    language: language || undefined,
                    settings: touched ? settings : undefined,
                  }),
                })
              )
            }
          >
            Generate audio
          </SubmitButton>
        </>
      }
      output={
        <Output state={state} idle="Your audio will appear here, ready to play and download." working="Generating your audio.">
          {state.phase === "done" && <AudioResult id={state.id} name="voice.mp3" />}
        </Output>
      }
    />
  );
}
