import { unstable_cache } from "next/cache";

// HeyGen API v3. HeyGen retires v1 and v2 on 31 October 2026, so everything here uses v3 only.
const API = "https://api.heygen.com";

export const hasHeyGen = () => Boolean(process.env.HEYGEN_API_KEY);

type Fail = { ok: false; error: string };
type Ok<T> = { ok: true } & T;

const key = () => process.env.HEYGEN_API_KEY;
const NOT_CONFIGURED: Fail = { ok: false, error: "HeyGen is not configured yet." };

type Envelope<T> = {
  data?: T;
  has_more?: boolean;
  next_token?: string | null;
  error?: { message?: string; code?: string; param?: string | null } | string | null;
  message?: string;
};

type Called<T> = Ok<{ data: T; next: string | null }> | Fail;

/** One v3 request. Lists come back with a cursor in `next`. `revalidate` caches reads for a while. */
async function call<T>(path: string, init: RequestInit = {}, revalidate?: number): Promise<Called<T>> {
  const k = key();
  if (!k) return NOT_CONFIGURED;
  try {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: { "x-api-key": k, Accept: "application/json", ...(init.headers ?? {}) },
      ...(revalidate ? { next: { revalidate } } : { cache: "no-store" as const }),
    });
    const json = (await res.json().catch(() => ({}))) as Envelope<T>;
    if (!res.ok || json.error) {
      const e = json.error;
      const msg = typeof e === "string" ? e : (e?.message ?? json.message);
      return { ok: false, error: msg || `HeyGen returned ${res.status}.` };
    }
    return { ok: true, data: json.data as T, next: json.has_more ? (json.next_token ?? null) : null };
  } catch {
    return { ok: false, error: "Could not reach HeyGen." };
  }
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const qs = (o: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
};

/* ---------------------------------------------------------------- avatars */

/** A "look" is one appearance of an avatar, and the id a video is made with. */
export type Look = {
  id: string;
  name: string;
  groupId?: string;
  type: "studio_avatar" | "digital_twin" | "photo_avatar" | string;
  gender?: string;
  image: string;
  video?: string;
  orientation?: string;
  tags: string[];
  engines: string[];
  defaultVoiceId?: string;
};

type RawLook = {
  id: string;
  name: string;
  group_id?: string;
  avatar_type: string;
  gender?: string;
  preview_image_url?: string;
  preview_video_url?: string;
  preferred_orientation?: string;
  tags?: string[];
  supported_api_engines?: string[];
  default_voice_id?: string;
  status?: string;
};

export type Page<T> = { items: T[]; next: string | null };

export async function listLooks(opts: { ownership?: "public" | "private"; avatarType?: string; token?: string; limit?: number } = {}): Promise<Page<Look>> {
  const r = await call<RawLook[]>(
    `/v3/avatars/looks${qs({ ownership: opts.ownership ?? "public", avatar_type: opts.avatarType, token: opts.token, limit: Math.min(50, opts.limit ?? 24) })}`,
    {},
    1800
  );
  if (!r.ok) return { items: [], next: null };
  return {
    items: (r.data ?? [])
      .filter((l) => !l.status || l.status === "completed")
      .map((l) => ({
        id: l.id,
        name: l.name,
        groupId: l.group_id,
        type: l.avatar_type,
        gender: l.gender,
        image: l.preview_image_url ?? "",
        video: l.preview_video_url,
        orientation: l.preferred_orientation,
        tags: l.tags ?? [],
        engines: l.supported_api_engines ?? [],
        defaultVoiceId: l.default_voice_id,
      })),
    next: r.next,
  };
}

/* ----------------------------------------------------------------- voices */

export type HeyGenVoice = {
  id: string;
  name: string;
  language: string;
  gender?: string;
  preview?: string;
  pause: boolean;
  engines: string[];
};

type RawVoice = {
  voice_id: string;
  name: string;
  language: string;
  gender?: string;
  preview_audio_url?: string | null;
  support_pause?: boolean;
  available_engines?: string[];
};

export async function listVoicePage(opts: { language?: string; gender?: string; token?: string; limit?: number } = {}): Promise<Page<HeyGenVoice>> {
  const r = await call<RawVoice[]>(
    `/v3/voices${qs({ type: "public", language: opts.language, gender: opts.gender, token: opts.token, limit: Math.min(100, opts.limit ?? 40) })}`,
    {},
    1800
  );
  if (!r.ok) return { items: [], next: null };
  return {
    items: (r.data ?? []).map((v) => ({
      id: v.voice_id,
      name: v.name,
      language: v.language,
      gender: v.gender,
      preview: v.preview_audio_url ?? undefined,
      pause: Boolean(v.support_pause),
      engines: v.available_engines ?? [],
    })),
    next: r.next,
  };
}

/** The first page of voices, for tools that only need a few to start with. */
export const listVoices = async (): Promise<HeyGenVoice[]> => (await listVoicePage({ language: "English", limit: 60 })).items;

// Language names HeyGen can translate into. They hardly ever change, so they are cached for hours.
const fetchLanguages = unstable_cache(
  async (): Promise<string[]> => {
    const r = await call<{ languages: string[] }>("/v3/video-translations/languages");
    if (!r.ok) throw new Error(r.error);
    return r.data.languages;
  },
  ["heygen-languages-v3"],
  { revalidate: 6 * 60 * 60, tags: ["heygen-catalog"] }
);

export const listTranslateLanguages = async (): Promise<string[]> => {
  try {
    return await fetchLanguages();
  } catch {
    return [];
  }
};

/* ----------------------------------------------------------------- styles */

export type AgentStyle = { id: string; name: string; image?: string; video?: string; ratio?: string; tags: string[] };

export async function listAgentStyles(opts: { tag?: string; token?: string } = {}): Promise<Page<AgentStyle>> {
  const r = await call<{ style_id: string; name: string; thumbnail_url?: string | null; preview_video_url?: string | null; aspect_ratio?: string | null; tags?: string[] | null }[]>(
    `/v3/video-agents/styles${qs({ tag: opts.tag, token: opts.token, limit: 24 })}`,
    {},
    3600
  );
  if (!r.ok) return { items: [], next: null };
  return {
    items: (r.data ?? []).map((s) => ({ id: s.style_id, name: s.name, image: s.thumbnail_url ?? undefined, video: s.preview_video_url ?? undefined, ratio: s.aspect_ratio ?? undefined, tags: s.tags ?? [] })),
    next: r.next,
  };
}

/* ----------------------------------------------------------------- assets */

/** Uploads a file (up to 32 MB: PNG, JPEG, MP4, WebM, MP3, WAV, PDF, SRT) to HeyGen's asset store. */
export async function uploadAsset(file: Blob, filename = "upload"): Promise<Ok<{ url: string; assetId: string }> | Fail> {
  const form = new FormData();
  form.append("file", file, filename);
  const r = await call<{ asset_id: string; url: string }>("/v3/assets", { method: "POST", body: form });
  if (!r.ok) return r;
  return { ok: true, url: r.data.url, assetId: r.data.asset_id };
}

export const ASSET_LIMIT_MB = 32;

/* ----------------------------------------------------------------- videos */

export type VideoJob = Ok<{ videoId: string }> | Fail;

export type Ratio = "16:9" | "9:16" | "1:1" | "4:5";

export type VideoOptions = {
  resolution?: "720p" | "1080p";
  /** a plain colour behind the presenter, or a picture from a link */
  background?: { type: "color"; value: string } | { type: "image"; url: string };
  captions?: boolean;
  speed?: number;
  pitch?: number;
  engine?: "avatar_iii" | "avatar_iv" | "avatar_v";
};

const voiceSettings = (o: VideoOptions) => {
  const v: Record<string, number> = {};
  if (typeof o.speed === "number" && o.speed !== 1) v.speed = Math.min(1.5, Math.max(0.5, o.speed));
  if (typeof o.pitch === "number" && o.pitch !== 0) v.pitch = Math.min(50, Math.max(-50, Math.round(o.pitch)));
  return Object.keys(v).length ? { voice_settings: v } : {};
};

const common = (o: VideoOptions, ratio: Ratio) => ({
  aspect_ratio: ratio,
  title: "Studio video",
  ...(o.resolution ? { resolution: o.resolution } : {}),
  ...(o.background ? { background: o.background } : {}),
  ...(o.captions ? { caption: { file_format: "srt" } } : {}),
  ...voiceSettings(o),
  ...(o.engine ? { engine: { type: o.engine } } : {}),
});

export async function generateAvatarVideo(opts: { avatarId: string; voiceId: string; script: string; ratio: Ratio } & VideoOptions): Promise<VideoJob> {
  const r = await call<{ video_id: string }>(
    "/v3/videos",
    post({ type: "avatar", avatar_id: opts.avatarId, script: opts.script, voice_id: opts.voiceId, ...common(opts, opts.ratio) })
  );
  return r.ok ? { ok: true, videoId: r.data.video_id } : r;
}

/** A talking video from a still photo, uploaded earlier as an asset. */
export async function generatePhotoVideo(
  opts: { assetId: string; voiceId: string; script: string; ratio?: Ratio; motion?: string; expressiveness?: "low" | "medium" | "high" } & VideoOptions
): Promise<VideoJob> {
  const r = await call<{ video_id: string }>(
    "/v3/videos",
    post({
      type: "image",
      image: { type: "asset_id", asset_id: opts.assetId },
      script: opts.script,
      voice_id: opts.voiceId,
      // the image variant takes no engine setting: photos always use the photo engine
      ...common({ ...opts, engine: undefined }, opts.ratio ?? "16:9"),
      ...(opts.motion ? { motion_prompt: opts.motion } : {}),
      ...(opts.expressiveness ? { expressiveness: opts.expressiveness } : {}),
    })
  );
  return r.ok ? { ok: true, videoId: r.data.video_id } : r;
}

/** A video made from a written idea. The first job id may be a session, finished by videoStatus. */
export async function generateFromPrompt(opts: { prompt: string; orientation?: "landscape" | "portrait"; avatarId?: string; voiceId?: string; styleId?: string }): Promise<VideoJob> {
  const r = await call<{ session_id: string; video_id?: string | null }>(
    "/v3/video-agents",
    post({
      prompt: opts.prompt,
      mode: "generate",
      ...(opts.orientation ? { orientation: opts.orientation } : {}),
      ...(opts.avatarId ? { avatar_id: opts.avatarId } : {}),
      ...(opts.voiceId ? { voice_id: opts.voiceId } : {}),
      ...(opts.styleId ? { style_id: opts.styleId } : {}),
    })
  );
  if (!r.ok) return r;
  return { ok: true, videoId: r.data.video_id || `agent:${r.data.session_id}` };
}

export type JobState = { status: "processing" | "done" | "failed"; url?: string; error?: string };

async function plainVideoStatus(videoId: string): Promise<JobState> {
  const r = await call<{ status: string; video_url?: string | null; failure_message?: string | null }>(`/v3/videos/${encodeURIComponent(videoId)}`);
  if (!r.ok) return { status: "processing" };
  if (r.data.status === "completed" && r.data.video_url) return { status: "done", url: r.data.video_url };
  if (r.data.status === "failed") return { status: "failed", error: r.data.failure_message || "HeyGen could not make this video." };
  return { status: "processing" };
}

export async function videoStatus(id: string): Promise<JobState> {
  if (!id.startsWith("agent:")) return plainVideoStatus(id);
  const r = await call<{ status: string; video_id?: string | null; error?: { message?: string } | string | null }>(`/v3/video-agents/${encodeURIComponent(id.slice(6))}`);
  if (!r.ok) return { status: "processing" };
  if (r.data.video_id) return plainVideoStatus(r.data.video_id);
  if (r.data.status === "failed") {
    const e = r.data.error;
    return { status: "failed", error: (typeof e === "string" ? e : e?.message) || "HeyGen could not make this video." };
  }
  return { status: "processing" };
}

/* ----------------------------------------------------------- translation */

export type MediaSource = { url: string } | { assetId: string };
const source = (s: MediaSource) => ("url" in s ? { type: "url", url: s.url } : { type: "asset_id", asset_id: s.assetId });

export async function translateVideo(opts: {
  video: MediaSource;
  language: string;
  audioOnly?: boolean;
  /** precision redraws faces more carefully and takes longer */
  mode?: "speed" | "precision";
  speakers?: number;
}): Promise<Ok<{ translateId: string }> | Fail> {
  const r = await call<{ video_translation_ids: string[] }>(
    "/v3/video-translations",
    post({
      video: source(opts.video),
      output_languages: [opts.language],
      title: "Studio translation",
      translate_audio_only: Boolean(opts.audioOnly),
      mode: opts.mode ?? "speed",
      ...(opts.speakers ? { speaker_num: opts.speakers } : {}),
    })
  );
  const id = r.ok ? r.data.video_translation_ids?.[0] : undefined;
  return r.ok ? (id ? { ok: true, translateId: id } : { ok: false, error: "HeyGen did not start the translation." }) : r;
}

export async function translateStatus(id: string): Promise<JobState> {
  const r = await call<{ status: string; video_url?: string | null; audio_url?: string | null; failure_message?: string | null }>(`/v3/video-translations/${encodeURIComponent(id)}`);
  if (!r.ok) return { status: "processing" };
  const url = r.data.video_url || r.data.audio_url;
  if (r.data.status === "completed" && url) return { status: "done", url };
  if (r.data.status === "failed") return { status: "failed", error: r.data.failure_message || "Translation failed." };
  return { status: "processing" };
}

/* --------------------------------------------------------------- lip sync */

/** Replaces the speech in a video with another recording, with the mouth redrawn to match. */
export async function startLipsync(opts: { video: MediaSource; audio: MediaSource; mode?: "speed" | "precision"; enhance?: boolean }): Promise<Ok<{ lipsyncId: string }> | Fail> {
  const r = await call<{ lipsync_id: string }>(
    "/v3/lipsyncs",
    post({
      video: source(opts.video),
      audio: source(opts.audio),
      title: "Studio lip sync",
      mode: opts.mode ?? "speed",
      ...(opts.enhance ? { enable_speech_enhancement: true } : {}),
    })
  );
  return r.ok ? { ok: true, lipsyncId: r.data.lipsync_id } : r;
}

export async function lipsyncStatus(id: string): Promise<JobState> {
  const r = await call<{ status: string; video_url?: string | null; failure_message?: string | null }>(`/v3/lipsyncs/${encodeURIComponent(id)}`);
  if (!r.ok) return { status: "processing" };
  if (r.data.status === "completed" && r.data.video_url) return { status: "done", url: r.data.video_url };
  if (r.data.status === "failed") return { status: "failed", error: r.data.failure_message || "Lip sync failed." };
  return { status: "processing" };
}
