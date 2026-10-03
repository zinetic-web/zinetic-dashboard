// What the code can actually run. A provider can only be assigned to a service
// that has an adapter here; everything else about an engine (model, cost,
// limits, options, on/off) lives in the studio_engines table.
//
// Adding a new provider later: write its adapter, list it here, then add
// engines for it in /admin/engines. No other part of the system changes.

export type ProviderId = "elevenlabs" | "heygen" | "local";

export const PROVIDERS: Record<ProviderId, { name: string; services: string[] }> = {
  elevenlabs: {
    name: "ElevenLabs",
    services: ["voice", "voice-changer", "sound-effects", "music", "transcribe", "audio-cleaner", "dubbing", "video-translation"],
  },
  heygen: {
    name: "HeyGen",
    services: ["dubbing", "video-translation", "avatar-video", "avatar-creator", "prompt-video"],
  },
  local: { name: "Built-in (ffmpeg)", services: ["short-clips", "filler-remover"] },
};

export const providerSupports = (provider: string, service: string) =>
  PROVIDERS[provider as ProviderId]?.services.includes(service) ?? false;

export const COST_UNITS = [
  { value: "generation", label: "per generation" },
  { value: "minute", label: "per minute of media" },
  { value: "1k_chars", label: "per 1,000 characters" },
] as const;

export type CostUnit = (typeof COST_UNITS)[number]["value"];

export const FEATURE_LABELS: Record<string, string> = {
  multilingual: "Many languages",
  expressive: "Most expressive",
  "audio-tags": "Audio tags",
  loop: "Seamless loops",
  speakers: "Speaker labels",
  timestamps: "Timestamps",
  audio: "Audio files",
  video: "Video files",
  "speaker-voices": "Keeps speaker voices",
  lipsync: "Lip sync",
  avatars: "Stock avatars",
  "photo-avatars": "Photo avatars",
  vertical: "Vertical 9:16",
};
