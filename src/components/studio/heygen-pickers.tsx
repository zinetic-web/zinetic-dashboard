"use client";

import * as React from "react";
import Image from "next/image";
import { LuCheck, LuCircleUserRound, LuImage, LuLoaderCircle, LuPlay, LuSearch, LuSparkles, LuUserRound, LuWand, LuX } from "react-icons/lu";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { VoiceAvatar } from "@/components/studio/voice-avatar";
import { Chip, FilterGroup, VoiceRow, cap, selectClass, usePreview, type Row, type VoiceChoice } from "@/components/studio/voice-library";
import type { AgentStyle, HeyGenVoice, Look, Page } from "@/lib/studio/heygen";

/* --------------------------------------------------------------- shared bits */

/** Loads a list a page at a time from the catalog route. */
function usePaged<T>(url: (token?: string) => string, enabled: boolean, deps: string) {
  const [items, setItems] = React.useState<T[]>([]);
  const [next, setNext] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const seq = React.useRef(0);
  const urlRef = React.useRef(url);
  React.useEffect(() => {
    urlRef.current = url;
  });

  const load = React.useCallback(async (token?: string) => {
    const my = ++seq.current;
    if (!token) {
      setItems([]);
      setNext(null);
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(urlRef.current(token));
      const json = (await res.json()) as Page<T>;
      if (my !== seq.current) return;
      if (!res.ok) throw new Error();
      setItems((cur) => (token ? [...cur, ...json.items] : json.items));
      setNext(json.next ?? null);
    } catch {
      if (my === seq.current) setError("Could not load this list. Try again in a moment.");
    }
    if (my === seq.current) setLoading(false);
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [enabled, deps, load]);

  return { items, next, loading, error, more: () => next && load(next) };
}

/** A tile with a still picture that plays a short preview clip while the pointer is over it. */
function MediaTile({
  image,
  video,
  label,
  sub,
  active,
  badge,
  ratio = "aspect-[3/4]",
  onClick,
}: {
  image?: string;
  video?: string;
  label: string;
  sub?: string;
  active: boolean;
  badge?: string;
  ratio?: string;
  onClick: () => void;
}) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-pressed={active}
      className={cn("group relative cursor-pointer overflow-hidden rounded-xl border bg-muted text-left transition-shadow focus-visible:ring-2 focus-visible:ring-ring", ratio, active && "ring-2 ring-primary")}
    >
      {image ? <Image src={image} alt={label} fill unoptimized sizes="200px" className="object-cover" /> : <span className="absolute inset-0 flex items-center justify-center text-muted-foreground"><LuImage className="size-6" /></span>}
      {hover && video && <video src={video} autoPlay muted loop playsInline className="absolute inset-0 size-full object-cover" />}
      {video && !hover && (
        <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <LuPlay className="size-3" />
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2.5 pt-8 pb-2 text-white">
        <span className="block truncate text-sm font-medium">{label}</span>
        {sub && <span className="block truncate text-[0.7rem] text-white/70">{sub}</span>}
      </span>
      {badge && <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[0.65rem] font-medium text-white backdrop-blur">{badge}</span>}
      {active && (
        <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <LuCheck className="size-3.5" />
        </span>
      )}
    </button>
  );
}

const typeLabel: Record<string, string> = { studio_avatar: "Studio", digital_twin: "Digital twin", photo_avatar: "Photo" };

/* ------------------------------------------------------------------ avatars */

export type AvatarChoice = { id: string; name: string; image: string; mine?: boolean; defaultVoiceId?: string; type?: string };
export type MyAvatar = { id: string; name: string; image: string };

/** The presenter picker: a card for the chosen avatar and a gallery of every stock avatar behind it. */
export function AvatarLibrary({ value, onChange, mine, required = true }: { value: AvatarChoice | null; onChange: (a: AvatarChoice | null) => void; mine: MyAvatar[]; required?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<"stock" | "mine">("stock");
  const [kind, setKind] = React.useState("");
  const [gender, setGender] = React.useState("");
  const [q, setQ] = React.useState("");

  const stock = usePaged<Look>((token) => `/api/studio/heygen/catalog?type=looks${kind ? `&avatarType=${kind}` : ""}${token ? `&token=${encodeURIComponent(token)}` : ""}`, open && tab === "stock", kind);

  const needle = q.trim().toLowerCase();
  const shown = stock.items.filter((l) => (!gender || l.gender === gender) && (!needle || l.name.toLowerCase().includes(needle) || l.tags.some((t) => t.toLowerCase().includes(needle))));
  const myShown = mine.filter((m) => !needle || m.name.toLowerCase().includes(needle));

  function pick(a: AvatarChoice | null) {
    onChange(a);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
        <span className="relative flex h-[4.5rem] w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground">
          {value?.image ? <Image src={value.image} alt="" fill unoptimized sizes="56px" className="object-cover" /> : <LuUserRound className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{value?.name ?? "No presenter chosen"}</p>
          <p className="truncate text-xs text-muted-foreground">{value ? (value.mine ? "Your photo avatar" : (typeLabel[value.type ?? ""] ?? "Stock avatar")) : "Pick one from the gallery"}</p>
        </div>
        {value && !required && (
          <Button variant="ghost" size="icon-sm" aria-label="Clear presenter" onClick={() => onChange(null)}>
            <LuX />
          </Button>
        )}
        <DialogTrigger render={<Button variant="outline" size="sm" className="shrink-0" />}>
          <LuSearch /> Browse avatars
        </DialogTrigger>
      </div>

      <DialogContent className="flex h-[min(46rem,92vh)] w-[calc(100vw-1.5rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogTitle className="sr-only">Avatar gallery</DialogTitle>
        <DialogDescription className="sr-only">Choose the presenter for your video.</DialogDescription>

        <div className="flex flex-col gap-3 border-b p-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg bg-muted p-1">
              {(
                [
                  ["stock", "Stock avatars"],
                  ["mine", `My photos${mine.length ? ` (${mine.length})` : ""}`],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setTab(id)} className={cn("cursor-pointer rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors", tab === id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {label}
                </button>
              ))}
            </div>
            <div className="relative min-w-48 flex-1">
              <LuSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="h-10 pl-9" />
            </div>
          </div>
          {tab === "stock" && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex flex-wrap gap-2">
                {[
                  ["", "All types"],
                  ["studio_avatar", "Studio"],
                  ["photo_avatar", "Photo"],
                  ["digital_twin", "Digital twin"],
                ].map(([id, label]) => (
                  <Chip key={id} active={kind === id} onClick={() => setKind(id)}>
                    {label}
                  </Chip>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["", "Any"],
                  ["female", "Female"],
                  ["male", "Male"],
                ].map(([id, label]) => (
                  <Chip key={id} active={gender === id} onClick={() => setGender(id)}>
                    {label}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {stock.error && tab === "stock" && <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{stock.error}</p>}

          {tab === "stock" && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {shown.map((l) => (
                  <MediaTile
                    key={l.id}
                    image={l.image}
                    video={l.video}
                    label={l.name}
                    sub={cap(l.gender)}
                    badge={typeLabel[l.type]}
                    active={value?.id === l.id}
                    onClick={() => pick({ id: l.id, name: l.name, image: l.image, defaultVoiceId: l.defaultVoiceId, type: l.type })}
                  />
                ))}
              </div>
              {stock.loading && (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <LuLoaderCircle className="size-4 animate-spin" /> Loading avatars
                </div>
              )}
              {!stock.loading && shown.length === 0 && <p className="py-16 text-center text-sm text-muted-foreground">{stock.next ? "No match in the avatars loaded so far. Load more to keep looking." : "No avatars match."}</p>}
              {!stock.loading && stock.next && (
                <div className="flex justify-center py-5">
                  <Button variant="outline" onClick={() => void stock.more()}>
                    Load more avatars
                  </Button>
                </div>
              )}
            </>
          )}

          {tab === "mine" &&
            (myShown.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {myShown.map((m) => (
                  <MediaTile key={m.id} image={m.image} label={m.name} badge="Yours" active={value?.id === m.id} onClick={() => pick({ id: m.id, name: m.name, image: m.image, mine: true })} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-muted-foreground">
                <LuCircleUserRound className="size-8" />
                <p>No photo avatars yet.</p>
                <p>Make one in the Avatar creator and it will be here.</p>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------- voices */

const HG_LANGUAGES = ["English", "Spanish", "French", "German", "Hindi", "Bengali", "Arabic", "Portuguese", "Italian", "Japanese", "Korean", "Chinese", "Russian", "Turkish", "Indonesian", "Urdu", "Tamil", "Telugu", "Dutch", "Polish", "Swedish", "Multilingual"];

/** The narrator picker for HeyGen videos: filter by language and gender, and listen before choosing. */
export function HeyGenVoiceLibrary({ value, onChange }: { value: VoiceChoice | null; onChange: (v: VoiceChoice) => void }) {
  const [open, setOpen] = React.useState(false);
  const [language, setLanguage] = React.useState("English");
  const [gender, setGender] = React.useState("");
  const [q, setQ] = React.useState("");
  const preview = usePreview();

  const list = usePaged<HeyGenVoice>(
    (token) => `/api/studio/heygen/catalog?type=voices${language ? `&language=${encodeURIComponent(language)}` : ""}${gender ? `&gender=${gender}` : ""}${token ? `&token=${encodeURIComponent(token)}` : ""}`,
    open,
    `${language}|${gender}`
  );

  const needle = q.trim().toLowerCase();
  const rows: Row[] = list.items
    .filter((v) => !needle || v.name.toLowerCase().includes(needle))
    .map((v) => ({ id: v.id, name: v.name, description: [cap(v.gender), v.pause ? "Supports pauses" : ""].filter(Boolean).join(" · "), language: v.language, gender: v.gender, previewUrl: v.preview }));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) preview.stop();
      }}
    >
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
        {value ? <VoiceAvatar id={value.id} size={48} /> : <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><LuSparkles className="size-5" /></span>}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{value?.name ?? "No voice chosen"}</p>
          <p className="truncate text-xs text-muted-foreground">{value?.meta || "Pick a narrator"}</p>
        </div>
        <DialogTrigger render={<Button variant="outline" size="sm" className="shrink-0" />}>
          <LuSearch /> Browse voices
        </DialogTrigger>
      </div>

      <DialogContent className="flex h-[min(44rem,92vh)] w-[calc(100vw-1.5rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogTitle className="sr-only">Voices</DialogTitle>
        <DialogDescription className="sr-only">Choose the narrator.</DialogDescription>

        <div className="flex flex-col gap-3 border-b p-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-48 flex-1">
              <LuSearch className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="h-10 pl-9" />
            </div>
            <select className={cn(selectClass, "w-44")} value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Language">
              <option value="">Any language</option>
              {HG_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <FilterGroup title="Gender">
            <div className="flex flex-wrap gap-2">
              {[
                ["", "Any"],
                ["female", "Female"],
                ["male", "Male"],
              ].map(([id, label]) => (
                <Chip key={id} active={gender === id} onClick={() => setGender(id)}>
                  {label}
                </Chip>
              ))}
            </div>
          </FilterGroup>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {list.error && <p className="m-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{list.error}</p>}
          <ul className="flex flex-col">
            {rows.map((r) => (
              <VoiceRow
                key={r.id}
                row={r}
                active={value?.id === r.id}
                busy={false}
                playing={preview.playing === r.id}
                onPlay={() => preview.toggle(r.id, r.previewUrl)}
                onPick={() => {
                  onChange({ id: r.id, name: r.name, meta: [r.language, cap(r.gender)].filter(Boolean).join(" · "), previewUrl: r.previewUrl ?? undefined });
                  preview.stop();
                  setOpen(false);
                }}
                action="Use voice"
              />
            ))}
          </ul>
          {list.loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <LuLoaderCircle className="size-4 animate-spin" /> Loading voices
            </div>
          )}
          {!list.loading && rows.length === 0 && !list.error && <p className="py-16 text-center text-sm text-muted-foreground">{list.next ? "No match in the voices loaded so far. Load more to keep looking." : "No voices match."}</p>}
          {!list.loading && list.next && (
            <div className="flex justify-center py-4">
              <Button variant="outline" onClick={() => void list.more()}>
                Load more voices
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------- styles */

const STYLE_TAGS = [
  ["", "All"],
  ["cinematic", "Cinematic"],
  ["retro-tech", "Retro tech"],
  ["iconic-artist", "Iconic artist"],
  ["pop-culture", "Pop culture"],
  ["handmade", "Handmade"],
  ["print", "Print"],
];

/** Looks for a prompt video: scene style, pacing and feel, each with a short preview. */
export function StylePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [tag, setTag] = React.useState("");
  const list = usePaged<AgentStyle>((token) => `/api/studio/heygen/catalog?type=styles${tag ? `&tag=${tag}` : ""}${token ? `&token=${encodeURIComponent(token)}` : ""}`, true, tag);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {STYLE_TAGS.map(([id, label]) => (
          <Chip key={id} active={tag === id} onClick={() => setTag(id)}>
            {label}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => onChange("")}
          aria-pressed={value === ""}
          className={cn("flex aspect-video cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border text-sm transition-colors hover:bg-muted/50", value === "" && "border-primary bg-primary/5 ring-1 ring-primary")}
        >
          <LuWand className="size-5" />
          Let it choose
        </button>
        {list.items.map((s) => (
          <MediaTile key={s.id} image={s.image} video={s.video} label={s.name} sub={s.ratio} ratio="aspect-video" active={value === s.id} onClick={() => onChange(s.id)} />
        ))}
      </div>
      {list.loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
          <LuLoaderCircle className="size-4 animate-spin" /> Loading styles
        </div>
      )}
      {!list.loading && list.next && (
        <Button variant="outline" size="sm" className="w-fit" onClick={() => void list.more()}>
          More styles
        </Button>
      )}
    </div>
  );
}
