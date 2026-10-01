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
  { id: "music-generator", tool: "music", unit: "generations" },
  { id: "speech-to-text", tool: "transcribe", unit: "minutes" },
  { id: "audio-cleaner", tool: "audio-cleaner", unit: "minutes" },
  { id: "dubbing", tool: "dubbing", unit: "minutes" },
  { id: "avatar-video", tool: "avatar-video", unit: "minutes" },
  { id: "avatar-creator", tool: "avatar-creator", unit: "avatars" },
  { id: "video-translation", tool: "video-translation", unit: "minutes" },
  { id: "translation-lipsync", tool: "video-translation", unit: "minutes" },
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

export const TRIAL_PLAN = "Free trial";

/**
 * What the free trial of each service gives: a small fraction of its Starter plan. It is
 * taken once per account and never renews, so when it is used up the customer has to buy.
 */
export const TRIALS: Record<string, number> = {
  "voice-generator": 2000, // characters (Starter: 30,000)
  "voice-changer": 2, // minutes (Starter: 30)
  "sound-effects": 3, // generations (Starter: 25)
  "music-generator": 1, // one generation of up to a minute (Starter: 20)
  "speech-to-text": 10, // minutes (Starter: 5 hours)
  "audio-cleaner": 2, // minutes (Starter: 30)
  dubbing: 1, // minutes (Starter: 10)
  "avatar-video": 0.3, // video minutes (Starter: 2)
  "avatar-creator": 1, // avatars
  "video-translation": 0.5, // video minutes (Starter: 3)
  "translation-lipsync": 0.3, // video minutes (Starter: 3)
  "prompt-to-video": 1, // one prompt-made video (Starter: 1 video minute)
  "short-clips": 2, // source minutes (Starter: 10)
  "filler-remover": 2, // video minutes (Starter: 10)
};

export const hasTrial = (serviceId: string) => serviceId in TRIALS;

/** The trial as a plan card, the same shape as a paid plan. */
export function trialTier(serviceId: string): Tier | null {
  const svc = studioService(serviceId);
  const amount = TRIALS[serviceId];
  if (!svc || !amount) return null;
  const quota = serviceId === "music-generator" ? "1 generation, up to 1 minute" : serviceId === "prompt-to-video" ? "1 short video" : formatUnits(amount, svc.unit);
  return { name: TRIAL_PLAN, price: 0, period: null, quota, perks: ["No payment needed", "Used once, never resets", "Upgrade any time"] };
}
