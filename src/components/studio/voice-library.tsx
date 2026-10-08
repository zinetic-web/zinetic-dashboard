"use client";

import * as React from "react";
import { Dropdown } from "@/components/studio/dropdown";
import { FaMars, FaVenus } from "react-icons/fa6";
import { SparkIcon } from "@/components/spark-icon";
import {
  LuBookOpen,
  LuCheck,
  LuChevronDown,
  LuChevronLeft,
  LuChevronRight,
  LuGraduationCap,
  LuLoaderCircle,
  LuMegaphone,
  LuMessageCircle,
  LuPause,
  LuPlay,
  LuSearch,
  LuSlidersHorizontal,
  LuSmartphone,
  LuTv,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { VoiceAvatar } from "@/components/studio/voice-avatar";
import type { LibraryVoice } from "@/lib/studio/elevenlabs";

export type VoiceChoice = { id: string; name: string; meta?: string; previewUrl?: string };

type SavedVoice = {
  voice_id: string;
  name: string;
  gender: string | null;
  accent: string | null;
  language: string | null;
  locale: string | null;
  use_case: string | null;
  description: string | null;
  preview_url: string | null;
};

type Tab = "explore" | "default" | "mine";

const LANGUAGES: [string, string][] = [
  ["en", "English"], ["bn", "Bangla"], ["hi", "Hindi"], ["ur", "Urdu"], ["ar", "Arabic"], ["es", "Spanish"], ["fr", "French"], ["de", "German"],
  ["pt", "Portuguese"], ["it", "Italian"], ["tr", "Turkish"], ["ru", "Russian"], ["ja", "Japanese"], ["ko", "Korean"], ["zh", "Chinese"], ["id", "Indonesian"],
  ["ms", "Malay"], ["ta", "Tamil"], ["te", "Telugu"], ["ne", "Nepali"], ["fil", "Filipino"], ["vi", "Vietnamese"], ["th", "Thai"], ["nl", "Dutch"],
  ["pl", "Polish"], ["sv", "Swedish"], ["uk", "Ukrainian"], ["el", "Greek"], ["he", "Hebrew"], ["ro", "Romanian"], ["cs", "Czech"], ["da", "Danish"],
  ["fi", "Finnish"], ["hu", "Hungarian"], ["no", "Norwegian"], ["sk", "Slovak"], ["bg", "Bulgarian"], ["hr", "Croatian"],
];

const USE_CASES: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "conversational", label: "Conversational", icon: LuMessageCircle },
  { id: "narrative_story", label: "Narration", icon: LuBookOpen },
  { id: "characters_animation", label: "Characters", icon: SparkIcon },
  { id: "social_media", label: "Social media", icon: LuSmartphone },
  { id: "informative_educational", label: "Educational", icon: LuGraduationCap },
  { id: "advertisement", label: "Advertisement", icon: LuMegaphone },
  { id: "entertainment_tv", label: "Entertainment", icon: LuTv },
];

const ACCENTS = ["american", "british", "australian", "indian", "irish", "canadian", "south african", "scottish", "new zealand", "nigerian", "jamaican", "singaporean", "standard"];

const SORTS = [
  { id: "trending", label: "Trending" },
  { id: "usage_character_count_1y", label: "Most used" },
  { id: "cloned_by_count", label: "Most saved" },
  { id: "created_date", label: "Newest" },
];

/** male or female, read from a voice description such as "female · en · american". */
export const genderOf = (meta?: string | null): "male" | "female" | null => (/\bfemale\b/i.test(meta ?? "") ? "female" : /\bmale\b/i.test(meta ?? "") ? "male" : null);

export const cap = (s?: string | null) => (s ? s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : "");
const compact = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n));
const langName = (code?: string | null) => LANGUAGES.find(([c]) => c === code)?.[1] ?? (code ? code.toUpperCase() : "");

/** Flag of the country in a locale like en-US. A globe when there is none. */
function flag(locale?: string | null) {
  const region = locale?.split("-")[1];
  if (!region || region.length !== 2) return "🌐";
  return String.fromCodePoint(...[...region.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)));
}

export const selectClass = "h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40";

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active ? "border-foreground bg-foreground text-background" : "hover:bg-muted"
      )}
    >
      {children}
    </button>
  );
}

export function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      {children}
    </div>
  );
}

/** One preview player shared by every row, so only one voice speaks at a time. */
export function usePreview() {
  const [playing, setPlaying] = React.useState<string | null>(null);
  const audio = React.useRef<HTMLAudioElement | null>(null);
  React.useEffect(() => () => audio.current?.pause(), []);
  const toggle = React.useCallback(
    (id: string, url?: string | null) => {
      if (!url) return;
      audio.current?.pause();
      if (playing === id) return setPlaying(null);
      const a = new Audio(url);
      a.onended = () => setPlaying((p) => (p === id ? null : p));
      audio.current = a;
      void a.play().catch(() => setPlaying(null));
      setPlaying(id);
    },
    [playing]
  );
  const stop = React.useCallback(() => {
    audio.current?.pause();
    setPlaying(null);
  }, []);
  return { playing, toggle, stop };
}

export type Row = {
  id: string;
  name: string;
  description?: string | null;
  locale?: string | null;
  language?: string | null;
  accent?: string | null;
  gender?: string | null;
  age?: string | null;
  useCase?: string | null;
  category?: string | null;
  previewUrl?: string | null;
  saves?: number;
  usage?: number;
};

export function VoiceRow({
  row,
  active,
  busy,
  playing,
  onPlay,
  onPick,
  action,
}: {
  row: Row;
  active: boolean;
  busy: boolean;
  playing: boolean;
  onPlay: () => void;
  onPick: () => void;
  action: string;
}) {
  const where = [langName(row.language), cap(row.accent)].filter(Boolean).join(" · ");
  return (
    <li className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60", active && "bg-muted")}>
      <button
        type="button"
        onClick={onPlay}
        disabled={!row.previewUrl}
        aria-label={playing ? `Pause ${row.name}` : `Play ${row.name}`}
        className="relative shrink-0 cursor-pointer disabled:cursor-default"
      >
        <VoiceAvatar id={row.id} size={44} />
        {row.previewUrl && (
          <span className={cn("absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-white transition-opacity", playing ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
            {playing ? <LuPause className="size-4" /> : <LuPlay className="size-4" />}
          </span>
        )}
      </button>

      <div className="min-w-0 flex-1 overflow-hidden">
        <p className="flex items-center gap-1.5 truncate font-medium">
          <span className="truncate">{row.name}</span>
          {row.category === "professional" && (
            <span title="Professional voice" className="shrink-0 text-sky-500">
              <LuCheck className="size-3.5" />
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">{row.description || [cap(row.gender), cap(row.age), cap(row.useCase)].filter(Boolean).join(" · ")}</p>
      </div>

      <div className="hidden shrink-0 items-center gap-2 text-sm md:flex">
        <span className="text-base leading-none">{flag(row.locale)}</span>
        <span className="text-muted-foreground">{where}</span>
      </div>

      {row.saves !== undefined && (
        <div className="hidden w-20 shrink-0 items-center justify-end gap-1.5 text-xs text-muted-foreground tabular-nums lg:flex" title="People who saved this voice">
          <LuUsers className="size-3.5" />
          {compact(row.saves)}
        </div>
      )}

      <Button size="sm" variant={active ? "secondary" : "outline"} onClick={onPick} disabled={busy} className="shrink-0">
        {busy ? <LuLoaderCircle className="animate-spin" /> : active ? <LuCheck /> : null}
        {active ? "Selected" : action}
      </Button>
    </li>
  );
}

/**
 * The voice picker: a card showing the chosen voice, and a full library behind it with search,
 * language, use case, gender, age, accent and quality filters, and a preview of every voice.
 */
export function VoiceLibrary({ value, onChange, defaults }: { value: VoiceChoice | null; onChange: (v: VoiceChoice) => void; defaults: VoiceChoice[] }) {
  const [open, setOpen] = React.useState(false);
  const strip = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const [tab, setTab] = React.useState<Tab>("explore");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [language, setLanguage] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [age, setAge] = React.useState("");
  const [accent, setAccent] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [useCase, setUseCase] = React.useState("");
  const [sort, setSort] = React.useState("trending");
  const [rows, setRows] = React.useState<LibraryVoice[]>([]);
  const [page, setPage] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mine, setMine] = React.useState<SavedVoice[] | null>(null);
  const [saving, setSaving] = React.useState<string | null>(null);
  const preview = usePreview();
  const seq = React.useRef(0);

  const filterKey = [q, language, gender, age, accent, category, useCase, sort].join("|");

  // library search, debounced while typing
  React.useEffect(() => {
    if (!open || tab !== "explore") return;
    const my = ++seq.current;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const p = new URLSearchParams({ sort, page: "0" });
        if (q.trim()) p.set("q", q.trim());
        if (language) p.set("language", language);
        if (gender) p.set("gender", gender);
        if (age) p.set("age", age);
        if (accent) p.set("accent", accent);
        if (category) p.set("category", category);
        if (useCase) p.set("useCase", useCase);
        const res = await fetch(`/api/studio/voices/library?${p}`);
        const json = (await res.json()) as { voices?: LibraryVoice[]; hasMore?: boolean; total?: number };
        if (my !== seq.current) return;
        if (!res.ok) throw new Error();
        setRows(json.voices ?? []);
        setHasMore(Boolean(json.hasMore));
        setTotal(json.total ?? 0);
        setPage(0);
      } catch {
        if (my === seq.current) setError("Could not load the voice library. Try again in a moment.");
      }
      if (my === seq.current) setLoading(false);
    }, q ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filterKey stands for every filter
  }, [open, tab, filterKey]);

  async function loadMore() {
    setLoading(true);
    try {
      const p = new URLSearchParams({ sort, page: String(page + 1) });
      if (q.trim()) p.set("q", q.trim());
      if (language) p.set("language", language);
      if (gender) p.set("gender", gender);
      if (age) p.set("age", age);
      if (accent) p.set("accent", accent);
      if (category) p.set("category", category);
      if (useCase) p.set("useCase", useCase);
      const res = await fetch(`/api/studio/voices/library?${p}`);
      const json = (await res.json()) as { voices?: LibraryVoice[]; hasMore?: boolean };
      if (res.ok) {
        setRows((r) => [...r, ...(json.voices ?? [])]);
        setHasMore(Boolean(json.hasMore));
        setPage((n) => n + 1);
      }
    } catch {}
    setLoading(false);
  }

  // saved voices load when that tab is opened
  React.useEffect(() => {
    if (!open || tab !== "mine" || mine) return;
    void fetch("/api/studio/voices/mine")
      .then((r) => r.json())
      .then((j: { voices?: SavedVoice[] }) => setMine(j.voices ?? []))
      .catch(() => setMine([]));
  }, [open, tab, mine]);

  function choose(v: VoiceChoice) {
    onChange(v);
    preview.stop();
    setOpen(false);
  }

  async function pickFromLibrary(v: LibraryVoice) {
    setSaving(v.id);
    setError(null);
    try {
      const res = await fetch("/api/studio/voices/mine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: v.id,
          ownerId: v.ownerId,
          name: v.name,
          gender: v.gender,
          age: v.age,
          accent: v.accent,
          language: v.language,
          locale: v.locale,
          useCase: v.useCase,
          description: v.description,
          previewUrl: v.previewUrl,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not add this voice.");
      setMine(null);
      choose({ id: v.id, name: v.name, meta: [langName(v.language), cap(v.accent), cap(v.gender)].filter(Boolean).join(" · "), previewUrl: v.previewUrl });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add this voice.");
    }
    setSaving(null);
  }

  async function removeSaved(id: string) {
    setMine((m) => m?.filter((x) => x.voice_id !== id) ?? m);
    await fetch(`/api/studio/voices/mine?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }

  const reset = () => {
    setLanguage("");
    setGender("");
    setAge("");
    setAccent("");
    setCategory("");
    setUseCase("");
  };
  const activeFilters = [language, gender, age, accent, category, useCase].filter(Boolean).length;

  const filters = (
    <div className="flex flex-col gap-6">
      <FilterGroup title="Language">
        <Dropdown inline value={language} onChange={setLanguage} label="Language" placeholder="Any language" options={[{ value: "", label: "Any language" }, ...LANGUAGES.map(([c, n]) => ({ value: c, label: n }))]} />
      </FilterGroup>

      <FilterGroup title="Use case">
        <div className="flex flex-wrap gap-2">
          {USE_CASES.map((u) => (
            <Chip key={u.id} active={useCase === u.id} onClick={() => setUseCase(useCase === u.id ? "" : u.id)}>
              <u.icon className="size-3.5" /> {u.label}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Gender">
        <div className="flex flex-wrap gap-2">
          {["male", "female", "neutral"].map((g) => (
            <Chip key={g} active={gender === g} onClick={() => setGender(gender === g ? "" : g)}>
              {cap(g)}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Age">
        <div className="flex flex-wrap gap-2">
          {["young", "middle_aged", "old"].map((a) => (
            <Chip key={a} active={age === a} onClick={() => setAge(age === a ? "" : a)}>
              {cap(a)}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Accent">
        <Dropdown inline value={accent} onChange={setAccent} label="Accent" placeholder="Any accent" options={[{ value: "", label: "Any accent" }, ...ACCENTS.map((x) => ({ value: x, label: cap(x) }))]} />
      </FilterGroup>

      <FilterGroup title="Quality">
        <div className="flex flex-wrap gap-2">
          {[
            ["professional", "Professional"],
            ["high_quality", "High quality"],
          ].map(([id, label]) => (
            <Chip key={id} active={category === id} onClick={() => setCategory(category === id ? "" : id)}>
              {label}
            </Chip>
          ))}
        </div>
      </FilterGroup>

      {activeFilters > 0 && (
        <Button variant="ghost" size="sm" className="w-fit" onClick={reset}>
          <LuX /> Clear filters
        </Button>
      )}
    </div>
  );

  const savedRows: Row[] = (mine ?? []).map((v) => ({
    id: v.voice_id,
    name: v.name,
    description: v.description,
    locale: v.locale,
    language: v.language,
    accent: v.accent,
    gender: v.gender,
    useCase: v.use_case,
    previewUrl: v.preview_url,
  }));
  const defaultRows: Row[] = defaults.map((d) => ({ id: d.id, name: d.name, description: d.meta, previewUrl: d.previewUrl }));

  const list = (items: Row[], action: string, onPick: (r: Row) => void) => (
    <ul className="flex flex-col">
      {items.map((r) => (
        <VoiceRow
          key={r.id}
          row={r}
          active={value?.id === r.id}
          busy={saving === r.id}
          playing={preview.playing === r.id}
          onPlay={() => preview.toggle(r.id, r.previewUrl)}
          onPick={() => onPick(r)}
          action={action}
        />
      ))}
    </ul>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) preview.stop();
      }}
    >
      <div className="group/strip relative">
        <div
          ref={strip}
          onPointerDown={(e) => {
            if (e.pointerType !== "mouse" || !strip.current) return;
            drag.current = { x: e.clientX, left: strip.current.scrollLeft, moved: false };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d || !strip.current) return;
            const dx = e.clientX - d.x;
            if (Math.abs(dx) > 4) {
              d.moved = true;
              strip.current.scrollLeft = d.left - dx;
            }
          }}
          onPointerUp={() => setTimeout(() => (drag.current = null), 0)}
          onPointerLeave={() => (drag.current = null)}
          onClickCapture={(e) => {
            if (drag.current?.moved) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
          className="flex cursor-grab gap-2.5 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
        >
          {[...(value && !defaults.some((d) => d.id === value.id) ? [value] : []), ...defaults].slice(0, 12).map((v) => {
            const on = value?.id === v.id;
            const g = genderOf(v.meta);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onChange(v)}
                aria-pressed={on}
                className={cn(
                  "flex w-[7.25rem] shrink-0 cursor-pointer select-none flex-col items-center gap-2 rounded-2xl border px-2 py-3.5 text-center transition-all",
                  on ? "border-violet-400/70 bg-violet-500/15 shadow-[0_8px_26px_-12px_rgb(124_58_237/0.8)]" : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                )}
              >
                <VoiceAvatar id={v.id} size={56} />
                <span className="w-full truncate text-sm font-medium">{v.name.split(" - ")[0]}</span>
                {g ? (
                  <span className={cn("flex items-center gap-1 text-[0.72rem]", g === "female" ? "text-pink-300" : "text-sky-300")}>
                    {g === "female" ? <FaVenus className="size-3.5" /> : <FaMars className="size-3.5" />}
                    {g === "female" ? "Female" : "Male"}
                  </span>
                ) : (
                  <span className="text-[0.72rem] text-white/40">Voice</span>
                )}
              </button>
            );
          })}
          <DialogTrigger
            render={
              <button
                type="button"
                className="flex w-[7.25rem] shrink-0 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-2 py-3.5 text-center text-white/60 transition-colors hover:border-violet-400/50 hover:text-white"
              />
            }
          >
            <span className="flex size-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
              <LuSearch className="size-5" />
            </span>
            <span className="text-sm font-medium">Browse all</span>
          </DialogTrigger>
        </div>
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => strip.current?.scrollBy({ left: -280 })}
          className="absolute top-1/2 -left-3 hidden size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[#12121f]/95 text-white shadow-lg backdrop-blur transition-colors hover:bg-white/15 group-hover/strip:flex"
        >
          <LuChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => strip.current?.scrollBy({ left: 280 })}
          className="absolute top-1/2 -right-3 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-[#12121f]/95 text-white shadow-lg backdrop-blur transition-colors hover:bg-white/15"
        >
          <LuChevronRight className="size-4" />
        </button>
      </div>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-left text-sm text-white/55 transition-colors hover:border-violet-400/50 hover:bg-white/[0.06] hover:text-white"
          />
        }
      >
        <LuSearch className="size-4" />
        <span className="flex-1">Search and filter thousands of voices</span>
        <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-xs text-white/70">Browse all</span>
      </DialogTrigger>

      <DialogContent className="flex! h-[min(46rem,92vh)] w-[calc(100vw-1.5rem)] max-w-none grid-cols-[minmax(0,1fr)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl" showCloseButton>
        <DialogTitle className="sr-only">Voice library</DialogTitle>
        <DialogDescription className="sr-only">Search, preview and choose a voice.</DialogDescription>

        <div className="grid min-h-0 min-w-0 flex-1 md:grid-cols-[17.5rem_minmax(0,1fr)]">
          <aside className="hidden overflow-y-auto border-r bg-muted/20 p-5 md:block">{filters}</aside>

          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="flex flex-col gap-3 border-b p-4 pr-12">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-lg bg-muted p-1">
                  {(
                    [
                      ["explore", "Explore"],
                      ["default", "Default"],
                      ["mine", "My voices"],
                    ] as [Tab, string][]
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={cn("cursor-pointer rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors", tab === id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {tab === "explore" && (
                  <>
                    <div className="relative min-w-48 flex-1">
                      <LuSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, mood or style" className="h-10 pl-9" />
                    </div>
                    <Dropdown className="w-40" align="right" value={sort} onChange={setSort} label="Sort voices" options={SORTS.map((x) => ({ value: x.id, label: x.label }))} />
                    <Button variant="outline" size="sm" className="md:hidden" onClick={() => setFiltersOpen((v) => !v)}>
                      <LuSlidersHorizontal /> Filters{activeFilters ? ` (${activeFilters})` : ""}
                      <LuChevronDown className={cn("transition-transform", filtersOpen && "rotate-180")} />
                    </Button>
                  </>
                )}
              </div>
              {tab === "explore" && filtersOpen && <div className="max-h-64 overflow-y-auto rounded-lg border bg-muted/20 p-4 md:hidden">{filters}</div>}
              {tab === "explore" && !loading && total > 0 && <p className="text-xs text-muted-foreground">{total.toLocaleString()} voices</p>}
            </div>

            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
              {error && <p className="m-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

              {tab === "explore" && (
                <>
                  {rows.length > 0 && list(rows.map((v) => ({ ...v })), "Use voice", (r) => void pickFromLibrary(rows.find((x) => x.id === r.id)!))}
                  {loading && (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                      <LuLoaderCircle className="size-4 animate-spin" /> Loading voices
                    </div>
                  )}
                  {!loading && rows.length === 0 && !error && <p className="py-16 text-center text-sm text-muted-foreground">No voices match. Try fewer filters.</p>}
                  {!loading && hasMore && (
                    <div className="flex justify-center py-4">
                      <Button variant="outline" onClick={loadMore}>
                        Show more voices
                      </Button>
                    </div>
                  )}
                </>
              )}

              {tab === "default" &&
                (defaultRows.length ? (
                  list(defaultRows, "Use voice", (r) => choose({ id: r.id, name: r.name, meta: r.description ?? undefined, previewUrl: r.previewUrl ?? undefined }))
                ) : (
                  <p className="py-16 text-center text-sm text-muted-foreground">No default voices are available.</p>
                ))}

              {tab === "mine" &&
                (mine === null ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <LuLoaderCircle className="size-4 animate-spin" /> Loading
                  </div>
                ) : savedRows.length ? (
                  <div className="flex flex-col">
                    {savedRows.map((r) => (
                      <div key={r.id} className="flex items-center">
                        <div className="min-w-0 flex-1">
                          {list([r], "Use voice", (x) => choose({ id: x.id, name: x.name, meta: [langName(x.language), cap(x.accent), cap(x.gender)].filter(Boolean).join(" · "), previewUrl: x.previewUrl ?? undefined }))}
                        </div>
                        <Button variant="ghost" size="icon-sm" aria-label={`Remove ${r.name}`} onClick={() => void removeSaved(r.id)}>
                          <LuX />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center text-sm text-muted-foreground">
                    <p>No saved voices yet.</p>
                    <p className="mt-1">Choose a voice from Explore and it will be saved here.</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
