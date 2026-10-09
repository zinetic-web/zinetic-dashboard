const BASE = "https://api.elevenlabs.io/v1";

export type Voice = { id: string; name: string; category?: string; previewUrl?: string; labels?: string };

export const hasElevenLabs = () => Boolean(process.env.ELEVENLABS_API_KEY);

type Ok<T> = { ok: true } & T;
type Fail = { ok: false; error: string };
export type AudioResult = Ok<{ audio: Buffer; mime: string }> | Fail;

const key = () => process.env.ELEVENLABS_API_KEY;
const NOT_CONFIGURED: Fail = { ok: false, error: "ElevenLabs is not configured yet." };

async function readError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { detail?: { message?: string } | string };
    const d = j.detail;
    const msg = typeof d === "string" ? d : d?.message;
    if (msg) return msg;
  } catch {}
  return `ElevenLabs returned ${res.status}.`;
}

async function audioCall(url: string, init: RequestInit): Promise<AudioResult> {
  const k = key();
  if (!k) return NOT_CONFIGURED;
  try {
    const res = await fetch(url, { ...init, headers: { "xi-api-key": k, ...(init.headers ?? {}) } });
    if (!res.ok) return { ok: false, error: await readError(res) };
    return {
      ok: true,
      audio: Buffer.from(await res.arrayBuffer()),
      mime: res.headers.get("content-type") ?? "audio/mpeg",
    };
  } catch {
    return { ok: false, error: "Could not reach ElevenLabs." };
  }
}

export async function listVoices(): Promise<Voice[]> {
  const k = key();
  if (!k) return [];
  try {
    const res = await fetch(`${BASE}/voices`, { headers: { "xi-api-key": k }, next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      voices: {
        voice_id: string;
        name: string;
        category?: string;
        preview_url?: string;
        labels?: Record<string, string>;
      }[];
    };
    return json.voices.map((v) => ({
      id: v.voice_id,
      name: v.name,
      category: v.category,
      previewUrl: v.preview_url,
      labels: v.labels ? Object.values(v.labels).filter(Boolean).slice(0, 3).join(" · ") : undefined,
    }));
  } catch {
    return [];
  }
}

export type VoiceSettings = {
  /** 0 steadier ... 1 more varied */
  stability?: number;
  /** how closely it sticks to the original voice */
  similarity?: number;
  /** how much of the speaker's style to exaggerate */
  style?: number;
  speed?: number;
  speakerBoost?: boolean;
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
/** The v3 family only takes three stability steps: creative, natural and robust. */
const snapStability = (n: number) => (n < 0.25 ? 0 : n < 0.75 ? 0.5 : 1);

export function textToSpeech(opts: { text: string; voiceId: string; modelId?: string; settings?: VoiceSettings; languageCode?: string; seed?: number }) {
  const model = opts.modelId ?? "eleven_multilingual_v2";
  const s = opts.settings ?? {};
  const voice_settings: Record<string, number | boolean> = {};
  if (typeof s.stability === "number") voice_settings.stability = model.startsWith("eleven_v3") ? snapStability(s.stability) : clamp(s.stability, 0, 1);
  if (typeof s.similarity === "number") voice_settings.similarity_boost = clamp(s.similarity, 0, 1);
  if (typeof s.style === "number") voice_settings.style = clamp(s.style, 0, 1);
  if (typeof s.speed === "number") voice_settings.speed = clamp(s.speed, 0.7, 1.2);
  if (typeof s.speakerBoost === "boolean") voice_settings.use_speaker_boost = s.speakerBoost;
  return audioCall(`${BASE}/text-to-speech/${encodeURIComponent(opts.voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text: opts.text,
      model_id: model,
      ...(Object.keys(voice_settings).length ? { voice_settings } : {}),
      ...(opts.languageCode ? { language_code: opts.languageCode } : {}),
      ...(typeof opts.seed === "number" ? { seed: Math.trunc(opts.seed) } : {}),
    }),
  });
}

/* ------------------------------------------------------------- voice library */

export type LibraryVoice = {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  gender?: string;
  age?: string;
  accent?: string;
  language?: string;
  locale?: string;
  useCase?: string;
  /** professional | high_quality | famous ... */
  category?: string;
  previewUrl?: string;
  /** how many people saved it, and characters spoken in the last year */
  saves: number;
  usage: number;
};

export type LibraryQuery = {
  search?: string;
  language?: string;
  gender?: string;
  age?: string;
  accent?: string;
  category?: string;
  useCase?: string;
  featured?: boolean;
  sort?: "trending" | "created_date" | "usage_character_count_1y" | "cloned_by_count";
  page?: number;
  pageSize?: number;
};

type RawShared = {
  public_owner_id: string;
  voice_id: string;
  name: string;
  description?: string;
  gender?: string;
  age?: string;
  accent?: string;
  language?: string;
  locale?: string;
  use_case?: string;
  category?: string;
  preview_url?: string;
  cloned_by_count?: number;
  usage_character_count_1y?: number;
};

/** Searches the public voice library (thousands of voices) with the same filters ElevenLabs has. */
export async function searchLibrary(q: LibraryQuery): Promise<{ voices: LibraryVoice[]; hasMore: boolean; total: number }> {
  const k = key();
  if (!k) return { voices: [], hasMore: false, total: 0 };
  const p = new URLSearchParams({ page_size: String(clamp(q.pageSize ?? 30, 1, 100)), sort: q.sort ?? "trending", page: String(Math.max(0, q.page ?? 0)) });
  if (q.search) p.set("search", q.search);
  if (q.language) p.set("language", q.language);
  if (q.gender) p.set("gender", q.gender);
  if (q.age) p.set("age", q.age);
  if (q.accent) p.set("accent", q.accent);
  if (q.category) p.set("category", q.category);
  if (q.useCase) p.set("use_cases", q.useCase);
  if (q.featured) p.set("featured", "true");
  try {
    const res = await fetch(`${BASE}/shared-voices?${p}`, { headers: { "xi-api-key": k }, next: { revalidate: 300 } });
    if (!res.ok) return { voices: [], hasMore: false, total: 0 };
    const j = (await res.json()) as { voices: RawShared[]; has_more?: boolean; total_count?: number };
    return {
      voices: j.voices.map((v) => ({
        id: v.voice_id,
        ownerId: v.public_owner_id,
        name: v.name,
        description: v.description,
        gender: v.gender,
        age: v.age,
        accent: v.accent,
        language: v.language,
        locale: v.locale,
        useCase: v.use_case,
        category: v.category,
        previewUrl: v.preview_url,
        saves: v.cloned_by_count ?? 0,
        usage: v.usage_character_count_1y ?? 0,
      })),
      hasMore: Boolean(j.has_more),
      total: j.total_count ?? 0,
    };
  } catch {
    return { voices: [], hasMore: false, total: 0 };
  }
}

/** Makes a library voice usable for speech by adding it to the studio's voice list. Safe to repeat. */
export async function addLibraryVoice(opts: { ownerId: string; voiceId: string; name: string }): Promise<{ ok: true } | Fail> {
  const k = key();
  if (!k) return NOT_CONFIGURED;
  try {
    const res = await fetch(`${BASE}/voices/add/${encodeURIComponent(opts.ownerId)}/${encodeURIComponent(opts.voiceId)}`, {
      method: "POST",
      headers: { "xi-api-key": k, "Content-Type": "application/json" },
      body: JSON.stringify({ new_name: opts.name }),
    });
    if (res.ok) return { ok: true };
    const msg = await readError(res);
    // already in the list is fine, that is what we wanted
    if (res.status === 400 && /already/i.test(msg)) return { ok: true };
    return { ok: false, error: msg };
  } catch {
    return { ok: false, error: "Could not reach ElevenLabs." };
  }
}

export function voiceChanger(opts: { audio: Blob; filename: string; voiceId: string; modelId?: string }) {
  const form = new FormData();
  form.append("audio", opts.audio, opts.filename);
  form.append("model_id", opts.modelId ?? "eleven_multilingual_sts_v2");
  return audioCall(`${BASE}/speech-to-speech/${encodeURIComponent(opts.voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    body: form,
  });
}

export function soundEffect(opts: { text: string; durationSeconds?: number; loop?: boolean; modelId?: string }) {
  return audioCall(`${BASE}/sound-generation?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: opts.text,
      model_id: opts.modelId ?? "eleven_text_to_sound_v2",
      ...(opts.durationSeconds ? { duration_seconds: opts.durationSeconds } : {}),
      ...(opts.loop ? { loop: true } : {}),
    }),
  });
}

export type MusicOptions = {
  prompt: string;
  seconds: number;
  modelId?: string;
  /** no singing, music only */
  instrumental?: boolean;
  /** one of the ready-made styles from listFinetunes (they need the v2 model) */
  finetuneId?: string;
  seed?: number;
};

export function composeMusic(opts: MusicOptions) {
  return audioCall(`${BASE}/music?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: opts.prompt,
      music_length_ms: Math.round(clamp(opts.seconds, 3, 600) * 1000),
      ...(opts.modelId ? { model_id: opts.modelId } : {}),
      ...(opts.instrumental ? { force_instrumental: true } : {}),
      ...(opts.finetuneId ? { finetune_id: opts.finetuneId } : {}),
      ...(typeof opts.seed === "number" ? { seed: Math.trunc(opts.seed) } : {}),
    }),
  });
}

export type Finetune = { id: string; name: string; genre: string; tags: string[] };

/** The ready-made music styles ElevenLabs offers, such as "Deep Hip-Hop Voice (Male)". They rarely change. */
export async function listFinetunes(): Promise<Finetune[]> {
  const k = key();
  if (!k) return [];
  try {
    const res = await fetch(`${BASE}/music/finetunes?page_size=100`, { headers: { "xi-api-key": k }, next: { revalidate: 6 * 3600 } });
    if (!res.ok) return [];
    const j = (await res.json()) as { finetunes: { id: string; name: string; primary_genre?: string; tags?: string[]; status?: string }[] };
    return j.finetunes
      .filter((f) => !f.status || f.status === "completed")
      .map((f) => ({ id: f.id, name: f.name, genre: f.primary_genre ?? "Other", tags: f.tags ?? [] }));
  } catch {
    return [];
  }
}

export function isolateAudio(opts: { audio: Blob; filename: string }) {
  const form = new FormData();
  form.append("audio", opts.audio, opts.filename);
  return audioCall(`${BASE}/audio-isolation`, { method: "POST", body: form });
}

export type Entity = { text: string; type: string; start?: number; end?: number };

export type Transcript = {
  language: string;
  text: string;
  words: { text: string; start: number; end: number; speaker?: string }[];
  /** names, places, numbers and other things found in the speech, when entity detection was asked for */
  entities?: Entity[];
};

/** The kinds of things Scribe can pick out of speech. "all" asks for every kind. */
export const ENTITY_KINDS = [
  { value: "all", label: "Everything" },
  { value: "pii", label: "Personal details" },
  { value: "phi", label: "Health details" },
  { value: "pci", label: "Payment details" },
  { value: "offensive_language", label: "Offensive language" },
] as const;

export async function transcribe(opts: {
  file: Blob;
  filename: string;
  language?: string;
  diarize?: boolean;
  modelId?: string;
  /** words and names the speech is likely to contain, so they are spelled right (up to 1,000) */
  keyterms?: string[];
  /** which kinds of entity to find, or "all" */
  entities?: string[];
}): Promise<Ok<{ transcript: Transcript }> | Fail> {
  const k = key();
  if (!k) return NOT_CONFIGURED;
  const form = new FormData();
  form.append("file", opts.file, opts.filename);
  form.append("model_id", opts.modelId ?? "scribe_v2");
  form.append("timestamps_granularity", "word");
  form.append("tag_audio_events", "false");
  if (opts.diarize) form.append("diarize", "true");
  if (opts.language) form.append("language_code", opts.language);
  for (const term of opts.keyterms ?? []) form.append("keyterms", term);
  for (const e of opts.entities ?? []) form.append("entity_detection", e);
  try {
    const res = await fetch(`${BASE}/speech-to-text`, { method: "POST", headers: { "xi-api-key": k }, body: form });
    if (!res.ok) return { ok: false, error: await readError(res) };
    const j = (await res.json()) as {
      language_code?: string;
      text: string;
      words?: { text: string; start: number; end: number; type: string; speaker_id?: string }[];
      entities?: { text?: string; entity_type?: string; type?: string; start_time?: number; end_time?: number; start?: number; end?: number }[];
    };
    const entities = (j.entities ?? [])
      .map((e) => ({ text: String(e.text ?? ""), type: String(e.entity_type ?? e.type ?? ""), start: e.start_time ?? e.start, end: e.end_time ?? e.end }))
      .filter((e) => e.text);
    return {
      ok: true,
      transcript: {
        language: j.language_code ?? "",
        text: j.text,
        words: (j.words ?? [])
          .filter((w) => w.type === "word")
          .map((w) => ({ text: w.text, start: w.start, end: w.end, speaker: w.speaker_id })),
        ...(opts.entities?.length ? { entities } : {}),
      },
    };
  } catch {
    return { ok: false, error: "Could not reach ElevenLabs." };
  }
}

/** A short-lived token that lets the browser open a live transcription session without ever seeing our key. */
export async function realtimeScribeToken(): Promise<Ok<{ token: string }> | Fail> {
  const k = key();
  if (!k) return NOT_CONFIGURED;
  try {
    const res = await fetch(`${BASE}/single-use-token/realtime_scribe`, { method: "POST", headers: { "xi-api-key": k } });
    if (!res.ok) return { ok: false, error: await readError(res) };
    const j = (await res.json()) as { token?: string };
    return j.token ? { ok: true, token: j.token } : { ok: false, error: "ElevenLabs did not return a session token." };
  } catch {
    return { ok: false, error: "Could not reach ElevenLabs." };
  }
}

export async function startDubbing(opts: {
  file: Blob;
  filename: string;
  targetLang: string;
  /** the cheaper version puts a watermark on the result */
  watermark?: boolean;
}): Promise<Ok<{ dubbingId: string }> | Fail> {
  const k = key();
  if (!k) return NOT_CONFIGURED;
  const form = new FormData();
  form.append("file", opts.file, opts.filename);
  form.append("target_lang", opts.targetLang);
  form.append("source_lang", "auto");
  form.append("num_speakers", "0");
  form.append("watermark", opts.watermark ? "true" : "false");
  try {
    const res = await fetch(`${BASE}/dubbing`, { method: "POST", headers: { "xi-api-key": k }, body: form });
    if (!res.ok) return { ok: false, error: await readError(res) };
    const j = (await res.json()) as { dubbing_id: string };
    return { ok: true, dubbingId: j.dubbing_id };
  } catch {
    return { ok: false, error: "Could not reach ElevenLabs." };
  }
}

export async function dubbingStatus(id: string): Promise<{ status: "processing" | "done" | "failed"; error?: string }> {
  const k = key();
  if (!k) return { status: "failed", error: "ElevenLabs is not configured." };
  try {
    const res = await fetch(`${BASE}/dubbing/${encodeURIComponent(id)}`, { headers: { "xi-api-key": k } });
    if (!res.ok) return { status: "processing" };
    const j = (await res.json()) as { status: string; error?: string };
    if (j.status === "dubbed") return { status: "done" };
    if (j.status === "failed") return { status: "failed", error: j.error ?? "Dubbing failed." };
    return { status: "processing" };
  } catch {
    return { status: "processing" };
  }
}

export function downloadDub(id: string, lang: string) {
  return audioCall(`${BASE}/dubbing/${encodeURIComponent(id)}/audio/${encodeURIComponent(lang)}`, { method: "GET" });
}

/* ------------------------------------------------------------ dubbing v2 */

/** Dubbing v2 is project based. This makes the project and queues the first language in one call. */
export async function startDubbingV2(opts: { file: Blob; filename: string; targetLang: string }): Promise<Ok<{ projectId: string }> | Fail> {
  const k = key();
  if (!k) return NOT_CONFIGURED;
  const form = new FormData();
  form.append("file", opts.file, opts.filename);
  form.append("model_id", "dubbing_v2");
  form.append("target_language", opts.targetLang);
  try {
    const res = await fetch(`${BASE}/dubbing/project`, { method: "POST", headers: { "xi-api-key": k }, body: form });
    if (!res.ok) return { ok: false, error: await readError(res) };
    const j = (await res.json()) as { project_id?: string };
    return j.project_id ? { ok: true, projectId: j.project_id } : { ok: false, error: "ElevenLabs did not start the dub." };
  } catch {
    return { ok: false, error: "Could not reach ElevenLabs." };
  }
}

type V2Language = { status?: string; outputs?: { lossless_audio?: string | { url?: string } } };

/** Where a Dubbing v2 project stands, and the signed link to the dubbed audio once it is finished. */
export async function dubbingV2Status(projectId: string): Promise<{ status: "processing" | "done" | "failed"; url?: string; error?: string }> {
  const k = key();
  if (!k) return { status: "failed", error: "ElevenLabs is not configured." };
  const get = (path: string) => fetch(`${BASE}/dubbing/project/${encodeURIComponent(projectId)}${path}`, { headers: { "xi-api-key": k } });
  try {
    const pr = await get("");
    if (!pr.ok) return { status: "processing" };
    const project = (await pr.json()) as { status?: string; language_ids?: string[]; error?: { error?: string; message?: string } | string | null };
    if (project.status === "failed") {
      const e = project.error;
      return { status: "failed", error: (typeof e === "string" ? e : (e?.error ?? e?.message)) || "Dubbing failed." };
    }
    if (project.status !== "ready") return { status: "processing" };

    const id = project.language_ids?.[0];
    if (!id) return { status: "processing" };
    const lr = await get(`/language/${encodeURIComponent(id)}`);
    if (!lr.ok) return { status: "processing" };
    const language = (await lr.json()) as V2Language;
    if (language.status === "failed") return { status: "failed", error: "Dubbing that language failed." };
    if (language.status !== "completed") return { status: "processing" };
    const out = language.outputs?.lossless_audio;
    const url = typeof out === "string" ? out : out?.url;
    return url ? { status: "done", url } : { status: "processing" };
  } catch {
    return { status: "processing" };
  }
}

/** Downloads a signed dubbing link right away: it stops working after about an hour. */
export async function downloadSigned(url: string): Promise<AudioResult> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, error: `Could not download the dub (${res.status}).` };
    return { ok: true, audio: Buffer.from(await res.arrayBuffer()), mime: res.headers.get("content-type") ?? "audio/wav" };
  } catch {
    return { ok: false, error: "Could not download the dub." };
  }
}

/* --------------------------------------------------- voice agents (Speech Engine) */

export type AgentConfig = {
  name: string;
  voiceId: string;
  /** what the agent says first */
  firstMessage: string;
  /** who the agent is and how it should behave */
  instructions: string;
  /** language code such as en, bn, hi */
  language: string;
  /** may go past the account's concurrency limit, the extra calls cost twice as much */
  burst: boolean;
};

const agentBody = (c: AgentConfig) => ({
  name: c.name,
  conversation_config: {
    agent: { first_message: c.firstMessage, language: c.language, prompt: { prompt: c.instructions } },
    tts: { voice_id: c.voiceId, model_id: "eleven_flash_v2_5" },
  },
  platform_settings: { call_limits: { bursting_enabled: c.burst } },
});

async function agentCall<T>(path: string, init: RequestInit): Promise<Ok<{ data: T }> | Fail> {
  const k = key();
  if (!k) return NOT_CONFIGURED;
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, headers: { "xi-api-key": k, "Content-Type": "application/json", ...(init.headers ?? {}) } });
    if (!res.ok) return { ok: false, error: await readError(res) };
    const text = await res.text();
    return { ok: true, data: (text ? JSON.parse(text) : {}) as T };
  } catch {
    return { ok: false, error: "Could not reach ElevenLabs." };
  }
}

export async function createAgent(c: AgentConfig): Promise<Ok<{ agentId: string }> | Fail> {
  const r = await agentCall<{ agent_id?: string }>("/convai/agents/create", { method: "POST", body: JSON.stringify(agentBody(c)) });
  if (!r.ok) return r;
  return r.data.agent_id ? { ok: true, agentId: r.data.agent_id } : { ok: false, error: "ElevenLabs did not create the agent." };
}

export async function updateAgent(agentId: string, c: AgentConfig): Promise<{ ok: true } | Fail> {
  const r = await agentCall(`/convai/agents/${encodeURIComponent(agentId)}`, { method: "PATCH", body: JSON.stringify(agentBody(c)) });
  return r.ok ? { ok: true } : r;
}

export async function deleteAgent(agentId: string): Promise<{ ok: true } | Fail> {
  const r = await agentCall(`/convai/agents/${encodeURIComponent(agentId)}`, { method: "DELETE" });
  return r.ok ? { ok: true } : r;
}

/** A one-time link that lets the browser talk to an agent, without ever seeing our key. */
export async function agentSignedUrl(agentId: string): Promise<Ok<{ url: string }> | Fail> {
  const r = await agentCall<{ signed_url?: string }>(`/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`, { method: "GET" });
  if (!r.ok) return r;
  return r.data.signed_url ? { ok: true, url: r.data.signed_url } : { ok: false, error: "ElevenLabs did not return a conversation link." };
}

export type ConversationFacts = { seconds: number | null; burst: boolean; status: string | null };

/** What the provider recorded about a finished conversation: how long it really ran and whether it was billed as a burst. */
export async function conversationFacts(conversationId: string): Promise<ConversationFacts | null> {
  const r = await agentCall<{ status?: string; metadata?: { call_duration_secs?: number; charging?: { is_burst?: boolean } } }>(`/convai/conversations/${encodeURIComponent(conversationId)}`, { method: "GET" });
  if (!r.ok) return null;
  const secs = r.data.metadata?.call_duration_secs;
  return { seconds: typeof secs === "number" ? secs : null, burst: Boolean(r.data.metadata?.charging?.is_burst), status: r.data.status ?? null };
}
