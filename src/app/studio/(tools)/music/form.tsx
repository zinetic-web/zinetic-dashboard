"use client";

import * as React from "react";
import {
  LuBriefcase,
  LuCheck,
  LuChevronDown,
  LuClapperboard,
  LuDumbbell,
  LuGamepad2,
  LuGraduationCap,
  LuHeart,
  LuMegaphone,
  LuMic,
  LuSmartphone,
  LuSparkles,
  LuX,
} from "react-icons/lu";
import type { Finetune } from "@/lib/studio/elevenlabs";
import { useJob } from "@/components/studio/use-job";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AudioResult, EnginePicker, Field, Output, SubmitButton, TextArea, Workspace, useEngine } from "@/components/studio/ui";
import { cn } from "@/lib/utils";

const SUGGESTIONS = ["Upbeat Pop Anthem", "Melancholy Piano Ballad", "Driving Electronic Track", "Warm lo-fi hip hop with vinyl crackle", "Upbeat Bengali pop with dhol and a catchy chorus"];

// what each use case sounds like, added in front of the description
const STYLES: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; text: string }[] = [
  { id: "corporate", label: "Corporate", icon: LuBriefcase, text: "Clean, uplifting corporate background music, confident and modern" },
  { id: "cinematic", label: "Cinematic", icon: LuClapperboard, text: "Epic cinematic score with sweeping orchestral build" },
  { id: "podcasts", label: "Podcasts", icon: LuMic, text: "Warm, unobtrusive podcast intro and background bed" },
  { id: "advertising", label: "Advertising", icon: LuMegaphone, text: "Catchy, high-energy advertising track with a strong hook" },
  { id: "education", label: "Education", icon: LuGraduationCap, text: "Calm, focused music for learning and explainer videos" },
  { id: "social", label: "Social", icon: LuSmartphone, text: "Trendy, punchy short-form music for social videos" },
  { id: "lifestyle", label: "Lifestyle", icon: LuHeart, text: "Relaxed, feel-good lifestyle and vlog music" },
  { id: "fitness", label: "Fitness", icon: LuDumbbell, text: "Driving, high-tempo workout music with a strong beat" },
  { id: "gaming", label: "Gaming", icon: LuGamepad2, text: "Dynamic game soundtrack with energy and momentum" },
];

const GENRES = ["Pop", "Rock", "Hip Hop", "Electronic", "Lo-fi", "Jazz", "Classical", "Folk", "R&B", "Ambient", "Cinematic", "Country", "Latin", "Reggae", "Metal", "Indie", "EDM", "House", "Trap", "Baul", "Bollywood"];
const INSTRUMENTS = ["Piano", "Acoustic guitar", "Electric guitar", "Synth", "Drums", "Bass", "Strings", "Violin", "Flute", "Sitar", "Tabla", "Dhol", "Harmonium", "Saxophone", "Trumpet", "Choir"];
const MOODS = ["Happy", "Sad", "Energetic", "Calm", "Dark", "Epic", "Romantic", "Mysterious", "Uplifting", "Melancholic", "Aggressive", "Dreamy", "Nostalgic"];

const LENGTHS: [number, string][] = [
  [15, "0:15"],
  [30, "0:30"],
  [60, "1:00"],
  [90, "1:30"],
  [120, "2:00"],
  [180, "3:00"],
  [240, "4:00"],
  [300, "5:00"],
];

type Group = "genre" | "instrument" | "mood";

function TagGroup({ title, options, picked, onToggle, open, onOpen }: { title: string; options: string[]; picked: string[]; onToggle: (v: string) => void; open: boolean; onOpen: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        className={cn("flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm transition-colors", open || picked.length ? "border-foreground/40 bg-muted/50" : "hover:bg-muted/50")}
      >
        {title}
        {picked.length > 0 && <span className="rounded-full bg-foreground px-1.5 text-[0.65rem] font-medium text-background">{picked.length}</span>}
        <LuChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex flex-wrap gap-1.5 rounded-lg border bg-muted/20 p-2.5">
          {options.map((o) => {
            const on = picked.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => onToggle(o)}
                aria-pressed={on}
                className={cn("flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors", on ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}
              >
                {on && <LuCheck className="size-3" />}
                {o}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MusicForm({ finetunes }: { finetunes: Finetune[] }) {
  const [prompt, setPrompt] = React.useState("");
  const [style, setStyle] = React.useState("");
  const [tags, setTags] = React.useState<Record<Group, string[]>>({ genre: [], instrument: [], mood: [] });
  const [panel, setPanel] = React.useState<Group | null>(null);
  const [seconds, setSeconds] = React.useState(60);
  const [instrumental, setInstrumental] = React.useState(false);
  const [finetune, setFinetune] = React.useState("");
  const [seed, setSeed] = React.useState("");
  const { state, run } = useJob();
  const eng = useEngine();

  const toggle = (g: Group) => (v: string) => setTags((t) => ({ ...t, [g]: t[g].includes(v) ? t[g].filter((x) => x !== v) : [...t[g], v] }));

  // a ready-made style only works on the engine that offers them, so choosing one moves to that engine
  const finetuneEngine = eng.engines.find((e) => e.features.includes("finetunes"));
  function pickFinetune(id: string) {
    setFinetune(id);
    if (id && finetuneEngine && !eng.has("finetunes")) eng.setKey(finetuneEngine.key);
  }

  const brief = [
    STYLES.find((s) => s.id === style)?.text,
    prompt.trim(),
    tags.genre.length ? `Genre: ${tags.genre.join(", ")}.` : "",
    tags.instrument.length ? `Instruments: ${tags.instrument.join(", ")}.` : "",
    tags.mood.length ? `Mood: ${tags.mood.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(". ")
    .replace(/\.\./g, ".");

  const byGenre = finetunes.reduce<Record<string, Finetune[]>>((m, f) => ((m[f.genre] ??= []).push(f), m), {});
  const seedNumber = seed.trim() === "" ? undefined : Number(seed);

  return (
    <Workspace
      form={
        <>
          <EnginePicker />

          <Field label="Start from a style">
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map((s) => {
                const on = style === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(on ? "" : s.id)}
                    aria-pressed={on}
                    className={cn("flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs transition-colors", on ? "border-foreground bg-muted" : "hover:bg-muted/50")}
                  >
                    <s.icon className="size-5" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Describe the track" hint="Add lyrics here if you want it sung as written">
            <TextArea value={prompt} onChange={setPrompt} max={1500} rows={6} placeholder="Make a soulful blues track with a gritty electric guitar" />
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((i) => (
                <Button key={i} variant="outline" size="xs" onClick={() => setPrompt(i)}>
                  {i}
                </Button>
              ))}
            </div>
          </Field>

          <div className="flex flex-wrap items-start gap-2">
            <TagGroup title="Genre" options={GENRES} picked={tags.genre} onToggle={toggle("genre")} open={panel === "genre"} onOpen={() => setPanel(panel === "genre" ? null : "genre")} />
            <TagGroup title="Instrument" options={INSTRUMENTS} picked={tags.instrument} onToggle={toggle("instrument")} open={panel === "instrument"} onOpen={() => setPanel(panel === "instrument" ? null : "instrument")} />
            <TagGroup title="Mood" options={MOODS} picked={tags.mood} onToggle={toggle("mood")} open={panel === "mood"} onOpen={() => setPanel(panel === "mood" ? null : "mood")} />
          </div>

          <Field label="Length">
            <div className="flex flex-wrap gap-1.5">
              {LENGTHS.map(([s, label]) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeconds(s)}
                  aria-pressed={seconds === s}
                  className={cn("h-8 cursor-pointer rounded-lg border px-3 text-sm tabular-nums transition-colors", seconds === s ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              <span className="font-medium">Instrumental</span>
              <span className="block text-xs text-muted-foreground">Music only, no singing.</span>
            </span>
            <Switch checked={instrumental} onCheckedChange={setInstrumental} />
          </label>

          {finetunes.length > 0 && (
            <Field label="Ready-made style" hint={finetuneEngine ? "Shapes the sound of the whole track. Uses the Music v2 engine." : undefined}>
              <div className="flex items-center gap-2">
                <select
                  value={finetune}
                  onChange={(e) => pickFinetune(e.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  <option value="">None</option>
                  {Object.entries(byGenre)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([genre, list]) => (
                      <optgroup key={genre} label={genre}>
                        {list.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                </select>
                {finetune && (
                  <Button variant="ghost" size="icon-sm" aria-label="Clear style" onClick={() => setFinetune("")}>
                    <LuX />
                  </Button>
                )}
              </div>
            </Field>
          )}

          <Field label="Seed (optional)" hint="The same seed and description give a similar result again">
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value.replace(/[^\d]/g, "").slice(0, 9))}
              inputMode="numeric"
              placeholder="Random"
              className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </Field>

          <SubmitButton
            busy={state.phase === "working"}
            disabled={!brief.trim()}
            busyLabel="Composing"
            onClick={() =>
              run(() =>
                fetch("/api/studio/music", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ engine: eng.key, prompt: brief, seconds, instrumental, finetuneId: finetune || undefined, seed: seedNumber }),
                })
              )
            }
          >
            <LuSparkles /> Generate music
          </SubmitButton>
        </>
      }
      output={
        <Output state={state} idle="Your track will appear here." working="Composing your track. Longer tracks take a minute or two.">
          {state.phase === "done" && <AudioResult id={state.id} name="track.mp3" />}
        </Output>
      }
    />
  );
}
