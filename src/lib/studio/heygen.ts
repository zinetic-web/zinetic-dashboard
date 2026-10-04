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

/**
 * What a customer is told for the errors HeyGen documents. Anything about credit or plan limits is
 * our problem, not theirs, so it is logged for us and shown as a plain "try again later".
 */
const FRIENDLY: Record<string, string> = {
  content_policy_violation: "This request was turned down because it may break the content rules. Change the wording and try again.",
  avatar_not_usable: "This avatar cannot be used right now. Please choose another one.",
  avatar_expired: "This avatar cannot be used right now. Please choose another one.",
  avatar_not_found: "This avatar was not found. Please choose another one.",
  voice_not_found: "This voice was not found. Please choose another one.",
  voice_not_usable: "This voice cannot be used right now. Please choose another one.",
  voice_unavailable: "This voice cannot be used right now. Please choose another one.",
  voice_expired: "This voice cannot be used right now. Please choose another one.",
  script_too_short: "The script is too short. Write a little more.",
  no_audio_track: "That video has no audio to work with.",
  video_too_long: "That video is too long for this tool.",
  rate_limit_exceeded: "A lot of videos are being made right now. Please try again in a minute.",
  service_unavailable: "The video service is busy right now. Please try again in a minute.",
  gateway_timeout: "The video service is busy right now. Please try again in a minute.",
  insufficient_credit: "Video making is paused for a short while. Please try again later.",
  quota_exceeded: "Video making is paused for a short while. Please try again later.",
  trial_limit_exceeded: "Video making is paused for a short while. Please try again later.",
  subscription_required: "Video making is paused for a short while. Please try again later.",
  plan_upgrade_required: "Video making is paused for a short while. Please try again later.",
};
const OUR_PROBLEM = new Set(["insufficient_credit", "quota_exceeded", "trial_limit_exceeded", "subscription_required", "plan_upgrade_required"]);

const RETRY_STATUS = new Set([429, 502, 503, 504]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One v3 request. Lists come back with a cursor in `next`. `revalidate` caches reads for a while.
 * Busy answers (429, 502, 503, 504) are retried twice, waiting as long as HeyGen asks.
 */
async function call<T>(path: string, init: RequestInit = {}, revalidate?: number): Promise<Called<T>> {
  const k = key();
  if (!k) return NOT_CONFIGURED;
  try {
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(`${API}${path}`, {
        ...init,
        headers: { "x-api-key": k, Accept: "application/json", ...(init.headers ?? {}) },
        ...(revalidate ? { next: { revalidate } } : { cache: "no-store" as const }),
      });
      if (RETRY_STATUS.has(res.status) && attempt < 2) {
        const wait = Number(res.headers.get("retry-after"));
        await sleep(Math.min(5000, (Number.isFinite(wait) && wait > 0 ? wait : 1 + attempt * 2) * 1000));
        continue;
      }
      const json = (await res.json().catch(() => ({}))) as Envelope<T>;
      if (!res.ok || json.error) {
        const e = json.error;
        const code = typeof e === "object" && e ? e.code : undefined;
        const msg = typeof e === "string" ? e : (e?.message ?? json.message);
        if (code && OUR_PROBLEM.has(code)) console.error(`HeyGen refused a request because of our account (${code}): ${msg}`);
        return { ok: false, error: (code && FRIENDLY[code]) || msg || `HeyGen returned ${res.status}.` };
      }
      return { ok: true, data: json.data as T, next: json.has_more ? (json.next_token ?? null) : null };
    }
  } catch {
    return { ok: false, error: "Could not reach HeyGen." };
  }
}

/** A JSON POST. The key lets HeyGen recognise a repeat of the same request, so a retry never makes two videos. */
const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
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

/**
 * A video made from a written idea, by HeyGen's Video Agent. The agent is a conversation: it plans, writes
 * scenes and renders, which takes 5 to 10 times the length of the video. We start it in one-shot mode and,
 * as HeyGen documents, follow the SESSION (not just the video) until it has finished. Incognito mode keeps
 * one customer's prompts from shaping another customer's video, as all of them share one HeyGen account.
 */
export async function generateFromPrompt(opts: { prompt: string; orientation?: "landscape" | "portrait"; avatarId?: string; voiceId?: string; styleId?: string }): Promise<VideoJob> {
  const r = await call<{ session_id: string }>(
    "/v3/video-agents",
    post({
      prompt: opts.prompt,
      mode: "generate",
      incognito_mode: true,
      ...(opts.orientation ? { orientation: opts.orientation } : {}),
      ...(opts.avatarId ? { avatar_id: opts.avatarId } : {}),
      ...(opts.voiceId ? { voice_id: opts.voiceId } : {}),
      ...(opts.styleId ? { style_id: opts.styleId } : {}),
    })
  );
  return r.ok ? { ok: true, videoId: `agent:${r.data.session_id}` } : r;
}

export type JobState = { status: "processing" | "done" | "failed"; url?: string; error?: string; progress?: number; stage?: string };

async function plainVideoStatus(videoId: string): Promise<JobState> {
  const r = await call<{ status: string; video_url?: string | null; failure_message?: string | null }>(`/v3/videos/${encodeURIComponent(videoId)}`);
  if (!r.ok) return { status: "processing" };
  if (r.data.status === "completed" && r.data.video_url) return { status: "done", url: r.data.video_url };
  if (r.data.status === "failed") return { status: "failed", error: r.data.failure_message || "HeyGen could not make this video." };
  return { status: "processing", stage: r.data.status === "processing" ? "Rendering your video" : "Waiting in line" };
}

type AgentMessage = { role?: string; type?: string; content?: string | null; created_at?: number | null };
type AgentSession = {
  status: string;
  video_id?: string | null;
  progress?: number | null;
  error?: { message?: string } | string | null;
  messages?: AgentMessage[];
};

/** What the agent last said about its own work, as one short line a customer can read. */
function latestNote(messages: AgentMessage[] = []): string | undefined {
  const m = messages.find((x) => x.role === "model" && x.type === "text" && x.content);
  if (!m?.content) return undefined;
  const first = m.content.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s/)[0] ?? "";
  return first.length > 110 ? `${first.slice(0, 107)}...` : first || undefined;
}

/**
 * Where a prompt video stands. The session is the source of truth: it can fail (a plan or content problem),
 * or stop to ask a question, while the video it reserved just looks "pending". If it does ask, we answer once
 * so a customer's video is never left waiting on a question nobody can see.
 */
async function agentStatus(sessionId: string): Promise<JobState> {
  const r = await call<AgentSession>(`/v3/video-agents/${encodeURIComponent(sessionId)}`);
  if (!r.ok) return { status: "processing" };
  const d = r.data;
  const note = latestNote(d.messages);

  if (d.status === "failed" || d.error) {
    const e = d.error;
    const reason = (typeof e === "string" ? e : e?.message) || "";
    if (reason) console.error(`Video agent session ${sessionId} failed: ${reason}`);
    return { status: "failed", error: "The video could not be made. Please try again, with a shorter or simpler description if it keeps happening." };
  }

  if (d.status === "waiting_for_input") {
    const last = d.messages?.[0];
    await call(
      `/v3/video-agents/${encodeURIComponent(sessionId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": `continue-${sessionId}-${last?.created_at ?? 0}` },
        body: JSON.stringify({ message: "Please continue. Use your best judgement for anything that is unclear, and do not ask more questions." }),
      }
    );
    return { status: "processing", stage: "Planning your video", progress: undefined };
  }

  if (d.video_id) {
    const v = await plainVideoStatus(d.video_id);
    if (v.status === "done") return v;
    // a reserved draft can show "failed" while the agent is still working, so only believe it once the agent is finished
    if (v.status === "failed" && d.status === "completed") return v;
    return { status: "processing", stage: note ?? v.stage, progress: typeof d.progress === "number" && d.progress > 0 ? d.progress : undefined };
  }

  const stage = d.status === "generating" ? "Creating the scenes" : d.status === "reviewing" ? "Checking the plan" : "Planning your video";
  return { status: "processing", stage: note ?? stage, progress: typeof d.progress === "number" && d.progress > 0 ? d.progress : undefined };
}

export async function videoStatus(id: string): Promise<JobState> {
  return id.startsWith("agent:") ? agentStatus(id.slice(6)) : plainVideoStatus(id);
}

/** HeyGen's remaining credit in dollars, so a low balance is seen before it stops every video. */
export async function heygenBalance(): Promise<number | null> {
  const r = await call<{ wallet?: { remaining_balance?: number } }>("/v3/users/me", {}, 300);
  return r.ok && typeof r.data?.wallet?.remaining_balance === "number" ? r.data.wallet.remaining_balance : null;
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
  return { status: "processing", stage: r.data.status === "running" ? "Translating and matching the lips" : "Waiting in line" };
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
  return { status: "processing", stage: r.data.status === "running" ? "Matching the lips" : "Waiting in line" };
}
