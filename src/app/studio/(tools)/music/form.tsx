"use client";

import * as React from "react";
import {
  LuBriefcase,
  LuCheck,
  LuChevronDown,
  LuClapperboard,
  LuDices,
  LuDumbbell,
  LuGamepad2,
  LuGraduationCap,
  LuHeart,
  LuMegaphone,
  LuMic,
  LuSlidersHorizontal,
  LuSmartphone,
  LuX,
} from "react-icons/lu";
import type { Finetune } from "@/lib/studio/elevenlabs";
import { useJob } from "@/components/studio/use-job";
import { Slider } from "@/components/studio/slider";
import { Switch } from "@/components/ui/switch";
import { AudioResult, EnginePicker, Field, Output, SubmitButton, Workspace, useEngine } from "@/components/studio/ui";
import { cn } from "@/lib/utils";

const IDEAS = [
  "Upbeat pop anthem with a big singalong chorus",
  "Melancholy piano ballad, late at night",
  "Driving electronic track with a pulsing bassline",
  "Warm lo-fi hip hop with vinyl crackle",
  "Upbeat Bengali pop with dhol and a catchy chorus",
  "Dark cinematic trap with heavy 808s",
];

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

const OPTIONS = {
  genre: ["Pop", "Rock", "Hip Hop", "Electronic", "Lo-fi", "Jazz", "Classical", "Folk", "R&B", "Ambient", "Cinematic", "Country", "Latin", "Reggae", "Metal", "Indie", "EDM", "House", "Trap", "Baul", "Bollywood"],
  instrument: ["Piano", "Acoustic guitar", "Electric guitar", "Synth", "Drums", "Bass", "Strings", "Violin", "Flute", "Sitar", "Tabla", "Dhol", "Harmonium", "Saxophone", "Trumpet", "Choir"],
  mood: ["Happy", "Sad", "Energetic", "Calm", "Dark", "Epic", "Romantic", "Mysterious", "Uplifting", "Melancholic", "Aggressive", "Dreamy", "Nostalgic"],
};
type Group = keyof typeof OPTIONS;
const GROUP_LABEL: Record<Group, string> = { genre: "Genre", instrument: "Instruments", mood: "Mood" };

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export function MusicForm({ finetunes, initialPrompt = "" }: { finetunes: Finetune[]; initialPrompt?: string }) {
  const [prompt, setPrompt] = React.useState(initialPrompt);
  const [style, setStyle] = React.useState("");
  const [tags, setTags] = React.useState<Record<Group, string[]>>({ genre: [], instrument: [], mood: [] });
  const [tab, setTab] = React.useState<Group>("genre");
  const [seconds, setSeconds] = React.useState(60);
  const [instrumental, setInstrumental] = React.useState(false);
  const [finetune, setFinetune] = React.useState("");
  const [seed, setSeed] = React.useState("");
  const [more, setMore] = React.useState(false);
  const { state, run } = useJob();
  const eng = useEngine();

  const toggle = (g: Group, v: string) => setTags((t) => ({ ...t, [g]: t[g].includes(v) ? t[g].filter((x) => x !== v) : [...t[g], v] }));

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
  const chosen = (Object.keys(OPTIONS) as Group[]).flatMap((g) => tags[g].map((v) => ({ g, v })));

  return (
    <Workspace
      form={
        <>
          <EnginePicker />

          <section className="flex flex-col gap-3">
            <h2 className="font-heading text-base font-semibold">Describe your track</h2>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20 transition-colors focus-within:border-violet-400/50">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 1500))}
                rows={5}
                placeholder="A soulful blues track with a gritty electric guitar. Add lyrics here if you want them sung as written."
                className="w-full resize-none bg-transparent px-4 pt-3.5 pb-2 text-[0.95rem] leading-relaxed text-white outline-none placeholder:text-white/30"
              />
              <div className="flex items-center justify-between gap-2 border-t border-white/[0.07] px-2.5 py-2">
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPrompt(IDEAS[Math.floor(Math.random() * IDEAS.length)])}
                    className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-white/75 transition-colors hover:bg-white/[0.09] hover:text-white"
                  >
                    <LuDices className="size-3.5" /> Inspire me
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrompt("")}
                    disabled={!prompt}
                    className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs text-white/75 transition-colors hover:bg-white/[0.09] hover:text-white disabled:opacity-40"
                  >
                    <LuX className="size-3.5" /> Clear
                  </button>
                </div>
                <span className="text-xs tabular-nums text-white/40">{prompt.length.toLocaleString()} / 1,500</span>
              </div>
            </div>
          </section>

          <Field label="Use case" hint="Optional">
            <div className="flex flex-wrap gap-2">
              {STYLES.map((s) => {
                const on = style === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStyle(on ? "" : s.id)}
                    aria-pressed={on}
                    className={cn(
                      "flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3.5 text-sm transition-all",
                      on ? "border-violet-400/70 bg-violet-500/15 text-white shadow-[0_6px_20px_-10px_rgb(124_58_237/0.9)]" : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/20 hover:text-white"
                    )}
                  >
                    <s.icon className={cn("size-4", on ? "text-violet-300" : "text-white/45")} />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Sound</h2>
              {chosen.length > 0 && (
                <button type="button" onClick={() => setTags({ genre: [], instrument: [], mood: [] })} className="cursor-pointer text-xs text-white/45 transition-colors hover:text-white">
                  Clear {chosen.length}
                </button>
              )}
            </div>
            <div role="tablist" className="grid grid-cols-3 gap-1 rounded-xl bg-white/[0.04] p-1 ring-1 ring-white/10">
              {(Object.keys(OPTIONS) as Group[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  role="tab"
                  aria-selected={tab === g}
                  onClick={() => setTab(g)}
                  className={cn("flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm transition-colors", tab === g ? "zs-grad-bg font-medium text-white shadow-[0_6px_20px_-8px_rgb(124_58_237/0.9)]" : "text-white/60 hover:text-white")}
                >
                  {GROUP_LABEL[g]}
                  {tags[g].length > 0 && <span className={cn("rounded-full px-1.5 text-[0.65rem] font-semibold", tab === g ? "bg-white/25" : "bg-violet-500/30 text-violet-100")}>{tags[g].length}</span>}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {OPTIONS[tab].map((o) => {
                const on = tags[tab].includes(o);
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => toggle(tab, o)}
                    aria-pressed={on}
                    className={cn("flex h-8 cursor-pointer items-center gap-1 rounded-full border px-3 text-xs transition-colors", on ? "border-violet-400/70 bg-violet-500/20 text-white" : "border-white/10 text-white/65 hover:border-white/25 hover:text-white")}
                  >
                    {on && <LuCheck className="size-3 text-violet-300" />}
                    {o}
                  </button>
                );
              })}
            </div>
          </section>

          <Slider label="Length" value={seconds} min={10} max={300} step={5} onChange={setSeconds} left="0:10" right="5:00" format={mmss} />

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
            <span>
              <span className="font-semibold">Instrumental</span>
              <span className="block text-xs text-white/45">Music only, no singing.</span>
            </span>
            <Switch checked={instrumental} onCheckedChange={setInstrumental} />
          </label>

          <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
            <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-sm font-medium">
              <span className="flex items-center gap-2.5">
                <LuSlidersHorizontal className="size-4 text-violet-300" />
                Advanced settings
                {(finetune || seed) && <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[0.65rem] text-violet-200">Changed</span>}
              </span>
              <LuChevronDown className={cn("size-4 text-white/50 transition-transform", more && "rotate-180")} />
            </button>
            {more && (
              <div className="flex flex-col gap-5 border-t border-white/[0.07] p-4">
                {finetunes.length > 0 && (
                  <Field label="Ready-made style" hint={finetuneEngine ? "Uses the Music v2 engine" : undefined}>
                    <div className="flex items-center gap-2">
                      <select
                        value={finetune}
                        onChange={(e) => pickFinetune(e.target.value)}
                        className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0e0e1a] px-3 text-sm text-white outline-none focus:border-violet-400/60"
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
                        <button type="button" aria-label="Clear style" onClick={() => setFinetune("")} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-white/50 hover:bg-white/10 hover:text-white">
                          <LuX className="size-4" />
                        </button>
                      )}
                    </div>
                  </Field>
                )}
                <Field label="Seed" hint="Same seed and description, similar result">
                  <input
                    value={seed}
                    onChange={(e) => setSeed(e.target.value.replace(/[^\d]/g, "").slice(0, 9))}
                    inputMode="numeric"
                    placeholder="Random"
                    className="h-11 rounded-xl border border-white/10 bg-[#0e0e1a] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-violet-400/60"
                  />
                </Field>
              </div>
            )}
          </div>

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
            Generate music
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
