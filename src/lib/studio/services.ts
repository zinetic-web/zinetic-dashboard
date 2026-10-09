import { SERVICES, type Tier } from "@/lib/landing-services";

// What a customer can buy for AI Studio. Each pricing-page service maps to one Studio
// tool and counts its plan in one fixed unit (characters, minutes, generations).
export type Unit = "characters" | "minutes" | "generations" | "avatars";

export type StudioService = {
  /** service id on the pricing page */
  id: string;
  /** Studio tool that uses it */
  tool: string;
  unit: Unit;
};

export const STUDIO_SERVICES: StudioService[] = [
  { id: "voice-generator", tool: "voice", unit: "characters" },
  { id: "voice-changer", tool: "voice-changer", unit: "minutes" },
  { id: "sound-effects", tool: "sound-effects", unit: "generations" },
  { id: "music-generator", tool: "music", unit: "minutes" },
  { id: "speech-to-text", tool: "transcribe", unit: "minutes" },
  { id: "speech-engine", tool: "speech-engine", unit: "minutes" },
  { id: "audio-cleaner", tool: "audio-cleaner", unit: "minutes" },
  { id: "dubbing", tool: "dubbing", unit: "minutes" },
  { id: "avatar-video", tool: "avatar-video", unit: "minutes" },
  { id: "avatar-creator", tool: "avatar-creator", unit: "avatars" },
  { id: "video-translation", tool: "video-translation", unit: "minutes" },
  { id: "translation-lipsync", tool: "video-translation", unit: "minutes" },
  { id: "lip-sync", tool: "lip-sync", unit: "minutes" },
  { id: "prompt-to-video", tool: "prompt-video", unit: "minutes" },
  { id: "short-clips", tool: "short-clips", unit: "minutes" },
  { id: "filler-remover", tool: "filler-remover", unit: "minutes" },
];

export const studioService = (id: string) => STUDIO_SERVICES.find((s) => s.id === id);
export const servicesForTool = (tool: string) => STUDIO_SERVICES.filter((s) => s.tool === tool);

/** Plans promise things like "30,000 characters" or "5 hours". This reads that into a number and a unit. */
export function parseQuota(serviceId: string, tier: Tier): { amount: number; unit: Unit } | null {
  const svc = studioService(serviceId);
  if (!svc) return null;
  if (svc.unit === "avatars") return { amount: 1, unit: "avatars" };
  const m = /^([\d,]+(?:\.\d+)?)\s*(characters?|generations?|hours?|(?:video |source )?minutes?)/i.exec(tier.quota.trim());
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  const word = m[2].toLowerCase();
  return { amount: word.startsWith("hour") ? n * 60 : n, unit: svc.unit };
}

/** How long a purchase lasts: monthly plans run 30 days, yearly 365, one-time plans never expire. */
export const validityDays = (period: Tier["period"]) => (period === "month" ? 30 : period === "year" ? 365 : null);

export const serviceName = (id: string) => SERVICES.find((s) => s.id === id)?.name ?? id;

/** "30,000 characters", "7.5 minutes", "25 generations" */
export function formatUnits(amount: number, unit: Unit) {
  const rounded = unit === "minutes" ? Math.round(amount * 10) / 10 : Math.round(amount);
  const n = rounded.toLocaleString("en-US");
  if (unit === "characters") return `${n} characters`;
  if (unit === "minutes") return `${n} ${rounded === 1 ? "minute" : "minutes"}`;
  if (unit === "generations") return `${n} ${rounded === 1 ? "generation" : "generations"}`;
  return `${n} ${rounded === 1 ? "avatar" : "avatars"}`;
}
