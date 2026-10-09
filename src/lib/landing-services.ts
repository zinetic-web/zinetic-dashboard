import { CHECK_PRICE, PRICING_PLANS, getPlanPricing } from "@/lib/pricing-plans";

export type ServiceCategory = "music" | "voice" | "video" | "creator";

export type Tier = {
  name: string;
  price: number;
  period?: "year" | "month" | "avatar" | null;
  quota: string;
  perks?: string[];
};

/** One version (model) of a service. Plans cost the same on every version, what they give differs. */
export type ServiceVersion = {
  /** the engine key in AI Studio */
  id: string;
  label: string;
  note?: string;
  /** how much of the plan's base unit one unit of this version uses (Turbo: 0.5, so it goes twice as far) */
  factor: number;
  tiers: Tier[];
};

export type Service = {
  id: string;
  category: ServiceCategory;
  name: string;
  blurb: string;
  features: string[];
  cta: string;
  /** the plans of the default version */
  tiers: Tier[];
  /** services that come in several versions: pick one, then the plans change */
  versions?: ServiceVersion[];
};

/** "Starter" for the default version, "Starter~v4-turbo" for another. This is what an order stores. */
export const planKey = (tier: string, versionId?: string | null) => (versionId ? `${tier}~${versionId}` : tier);
export const splitPlanKey = (key: string): { tier: string; version: string | null } => {
  const i = key.indexOf("~");
  return i < 0 ? { tier: key, version: null } : { tier: key.slice(0, i), version: key.slice(i + 1) };
};

/** Finds what a plan key means for a service: the tier, the version it was bought on and that version's factor. */
export function resolvePlan(service: Service, key: string): { tier: Tier; version: ServiceVersion | null; factor: number; label: string } | null {
  const { tier: tierName, version: versionId } = splitPlanKey(key);
  if (!versionId || !service.versions) {
    const tier = service.tiers.find((t) => t.name === tierName);
    if (!tier) return null;
    const def = service.versions?.[0] ?? null;
    return { tier, version: def, factor: def?.factor ?? 1, label: def ? `${tier.name} · ${def.label}` : tier.name };
  }
  const version = service.versions.find((v) => v.id === versionId);
  const tier = version?.tiers.find((t) => t.name === tierName);
  if (!version || !tier) return null;
  return { tier, version, factor: version.factor, label: `${tier.name} · ${version.label}` };
}

export const CATEGORIES: { id: ServiceCategory; label: string; short: string }[] = [
  { id: "music", label: "Music", short: "Music" },
  { id: "voice", label: "AI Voice & Audio", short: "Voice & Audio" },
  { id: "video", label: "AI Video", short: "Video" },
  { id: "creator", label: "Creator Tools", short: "Creator Tools" },
];

const img = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;
const vid = (path: string) => `https://videos.pexels.com/video-files/${path}.mp4`;

export const MEDIA = {
  neonSinger: vid("8042155/8042155-sd_506_960_25fps"),
  neonMaleSinger: vid("8040199/8040199-sd_960_506_25fps"),
  smilingSinger: vid("8043131/8043131-sd_960_506_25fps"),
  womanTalking: vid("4962731/4962731-sd_960_540_25fps"),
  manTalking: vid("7261920/7261920-sd_540_960_25fps"),
  headphonesCloseUp: vid("8135207/8135207-hd_1080_1920_25fps"),
  concertLights: vid("8515272/8515272-hd_1280_720_25fps"),
  djDeck: vid("16510380/16510380-sd_960_540_30fps"),
  studioVocalist: vid("8134963/8134963-sd_960_540_25fps"),
  studioSession: vid("7086749/7086749-sd_960_506_25fps"),
  djPurple: vid("20612353/20612353-sd_640_360_24fps"),
  guitar: vid("854923/854923-sd_960_540_25fps"),
  guitarClose: vid("5390403/5390403-sd_640_360_30fps"),
  piano: vid("4251009/4251009-sd_640_360_30fps"),
  pianoHands: vid("6645557/6645557-sd_360_640_24fps"),
  bandStage: vid("6274264/6274264-sd_640_360_30fps"),
  drummer: vid("7502731/7502731-sd_640_360_30fps"),
  djHands: vid("3134595/3134595-sd_640_360_24fps"),
  launchpad: vid("3403451/3403451-sd_640_338_25fps"),
  podcastA: vid("6878208/6878208-sd_640_338_25fps"),
  podcastB: vid("6878209/6878209-sd_640_338_25fps"),
  presenterWoman: vid("5940726/5940726-sd_640_360_25fps"),
  speakerWoman: vid("6563872/6563872-sd_640_360_25fps"),
  manCloseUp: vid("6144018/6144018-sd_640_338_25fps"),
  suitSpeaker: vid("6567834/6567834-sd_338_640_25fps"),
  videoEditing: vid("1536315/1536315-sd_960_540_30fps"),
  neonDancer: vid("6944411/6944411-sd_640_360_25fps"),
  neonGirl: vid("6944413/6944413-sd_640_360_25fps"),
  neonShades: vid("6973341/6973341-sd_360_640_24fps"),
  hoop: vid("7197685/7197685-sd_640_360_25fps"),
  micClose: vid("991407/991407-sd_960_540_25fps"),
  purpleMic: vid("1645926/1645926-sd_960_540_24fps"),
  headphonesEyes: vid("4194834/4194834-sd_640_360_24fps"),
  smilingHeadphones: vid("6496235/6496235-sd_640_360_30fps"),
  gimbalPhone: vid("6325290/6325290-sd_360_640_24fps"),
  ringLight: vid("6332248/6332248-sd_640_338_25fps"),
  greenPresenterA: vid("5907299/5907299-sd_640_360_25fps"),
  greenPresenterB: vid("5907300/5907300-sd_640_360_25fps"),
  greenMan: vid("5907304/5907304-sd_640_360_25fps"),
  studioSinger: vid("4985232/4985232-sd_640_360_25fps"),
  studioSinger2: vid("4985250/4985250-sd_360_640_25fps"),
  violinist: vid("7095057/7095057-sd_338_640_25fps"),
  saxophone: vid("4264958/4264958-sd_640_360_30fps"),

  pinkNeonPortrait: img("photo-1507856745667-48442b4e5da9"),
  purpleStage: img("photo-1583244532610-2a234e7c3eca"),
  purpleWoman: img("photo-1633259751487-d550cd6b13a3"),
  greenStage: img("photo-1526218626217-dc65a29bb444"),
  blueGuitarist: img("photo-1598295893369-1918ffaf89a2"),
  portraitWoman: img("photo-1496203695688-3b8985780d6a"),
  portraitCloseUp: img("photo-1520529277867-dbf8c5e0b340"),
  studioRoom: img("photo-1598488035139-bdbb2231ce04"),
  microphone: img("photo-1478737270239-2f02b77fc618"),
  amberVinyl: img("photo-1616714109948-c74fe5029a4d"),
  concertOrange: img("photo-1470229722913-7c0e2dbbafd3"),
  crowdPurple: img("photo-1540039155733-5bb30b53aa14"),
  headphonesRed: img("photo-1650379058468-3c2d5d78f5b6"),
  micRedCurtain: img("photo-1689771455000-7ca175aa03fe"),
  djRed: img("photo-1651065699236-6a6885503943"),
  editTimeline: img("photo-1574717024653-61fd2cf4d44d"),
  cameraLights: img("photo-1625690303837-654c9666d2d0"),
  bearded: img("photo-1637059880830-59a90102de77"),
};

const three = (
  [a, b, c]: [number, number, number],
  [qa, qb, qc]: [string, string, string],
  period: Tier["period"] = null
): Tier[] => [
  { name: "Starter", price: a, period, quota: qa },
  { name: "Creator", price: b, period, quota: qb },
  { name: "Pro", price: c, period, quota: qc },
];

/** Starter, Creator and Pro for one version, with the same perks as the service's base plans. */
const plans = (rows: [number, string][], period: Tier["period"] = null, perks: string[][] = []): Tier[] =>
  (["Starter", "Creator", "Pro"] as const).map((name, i) => ({ name, price: rows[i][0], period, quota: rows[i][1], perks: perks[i] }));

const mcnTiers: Tier[] = [
  { name: "Single Check", price: CHECK_PRICE, quota: "1 Credit" },
  ...PRICING_PLANS.map((plan) => ({
    name: plan.label,
    price: getPlanPricing(plan).price,
    quota: `${plan.checks} Credits`,
    perks: [`${plan.discountPercent}% off`],
  })),
];

export const SERVICES: Service[] = [
  {
    id: "distribution",
    category: "music",
    name: "Music Distribution",
    blurb: "Release worldwide to every major streaming platform and keep up to 90% of your royalties.",
    features: [
      "Unlimited releases",
      "Worldwide distribution",
      "Major DSPs & streaming platforms",
      "Monthly royalty reports",
    ],
    cta: "Choose Plan",
    tiers: [
      {
        name: "Artist",
        price: 15.99,
        period: "year",
        quota: "1 Artist",
        perks: ["Unlimited releases", "Analytics dashboard", "Monthly royalty reports", "80% royalty share", "Standard support"],
      },
      {
        name: "Pro",
        price: 29.99,
        period: "year",
        quota: "Up to 3 Artists",
        perks: ["Unlimited releases", "Advanced analytics", "Monthly royalty reports", "85% royalty share", "Priority support"],
      },
      {
        name: "Label",
        price: 79.99,
        period: "year",
        quota: "Unlimited Artists",
        perks: ["Unlimited releases", "Advanced analytics", "Monthly royalty reports", "90% royalty share", "Priority support"],
      },
    ],
  },
  {
    id: "music-generator",
    category: "music",
    name: "AI Music Generator",
    blurb: "Describe a song and get vocals, instrumentals and a finished track back.",
    features: ["Vocal & instrumental generation", "Prompt-to-music", "Download generated audio", "Generation history"],
    cta: "Generate Music",
    tiers: plans([[6.9, "40 minutes"], [24.7, "147 minutes"], [108.9, "660 minutes"]], "month", [["Vocal & instrumental", "Prompt-to-music", "Audio download"], ["Everything in Starter", "Generation history"], ["All Creator features", "Priority generation", "Generation history"]]),
  },
  {
    id: "voice-generator",
    category: "voice",
    name: "AI Voice Generator",
    blurb: "Turn any script into natural speech, in multiple voices and languages.",
    features: ["Text to natural AI voice", "Multiple voices", "Multiple languages", "MP3 download", "Generation history"],
    cta: "Generate Voice",
    tiers: plans([[6.9, "75,000 characters"], [24.64, "275,000 characters"], [108.9, "1,237,500 characters"]], "month"),
    versions: [
      { id: "v4", label: "Eleven v4", note: "Most expressive. $0.08 per 1K characters.", factor: 1, tiers: plans([[6.9, "75,000 characters"], [24.64, "275,000 characters"], [108.9, "1,237,500 characters"]], "month") },
      { id: "v4-turbo", label: "Eleven v4 Turbo", note: "Fast and light, goes twice as far.", factor: 0.5, tiers: plans([[6.9, "150,000 characters"], [24.64, "550,000 characters"], [108.9, "2,475,000 characters"]], "month") },
      { id: "v3", label: "Eleven v3", note: "Dramatic delivery with audio tags.", factor: 1, tiers: plans([[6.9, "75,000 characters"], [24.64, "275,000 characters"], [108.95, "1,238,000 characters"]], "month") },
      { id: "v3-conversational", label: "Eleven v3 Conversational", note: "Natural, lower cost. Goes twice as far.", factor: 0.5, tiers: plans([[6.9, "150,000 characters"], [24.64, "550,000 characters"], [108.9, "2,475,000 characters"]], "month") },
      { id: "v1", label: "Multilingual v2", note: "Steady narration in 29 languages.", factor: 1, tiers: plans([[6.9, "75,000 characters"], [24.64, "275,000 characters"], [108.95, "1,238,000 characters"]], "month") },
      { id: "flash", label: "Flash / Turbo", note: "Real-time speed. Goes twice as far.", factor: 0.5, tiers: plans([[6.9, "150,000 characters"], [24.64, "550,000 characters"], [108.9, "2,475,000 characters"]], "month") },
    ],
  },
  {
    id: "voice-changer",
    category: "voice",
    name: "AI Voice Changer",
    blurb: "Re-voice a recording while keeping its timing and emotion intact.",
    features: ["Upload audio", "Select target voice", "Voice-to-voice conversion", "Preserves timing & emotion", "Download converted audio"],
    cta: "Change Voice",
    tiers: plans([[6.9, "50 minutes"], [24.6, "183 minutes"], [108.9, "825 minutes"]]),
  },
  {
    id: "sound-effects",
    category: "voice",
    name: "AI Sound Effects",
    blurb: "Type the sound you need. Ambience, cinematic hits and seamless loops.",
    features: ["Text-to-sound effects", "Ambient sounds", "Cinematic effects", "Loop generation", "Audio download"],
    cta: "Generate Sound",
    tiers: plans([[6.9, "150 generations"], [24.64, "605 generations"], [108.9, "3,000 generations"]]),
  },
  {
    id: "speech-to-text",
    category: "voice",
    name: "Speech to Text",
    blurb: "Accurate transcripts with speakers and timestamps, from audio or video.",
    features: ["Upload audio/video", "AI transcription", "Multiple languages", "Speaker detection", "Timestamps", "Transcript download"],
    cta: "Transcribe Audio",
    tiers: plans([[6.84, "27 hours"], [24.64, "100 hours"], [108.9, "450 hours"]]),
    versions: [
      { id: "v2", label: "Scribe v2", note: "Files and recordings. $0.22 per hour.", factor: 1, tiers: plans([[6.84, "27 hours"], [24.64, "100 hours"], [108.9, "450 hours"]]) },
      { id: "realtime", label: "Scribe v2 Realtime", note: "Live transcription as you speak. $0.39 per hour.", factor: 1.773, tiers: plans([[6.73, "15 hours"], [24.47, "56 hours"], [108.97, "254 hours"]]) },
    ],
  },
  {
    id: "speech-engine",
    category: "voice",
    name: "Speech Engine",
    blurb: "Talk to a voice agent you design. It listens, thinks and answers out loud in real time.",
    features: ["Design your own voice agent", "Pick its voice and language", "Talk to it live", "Conversation history"],
    cta: "Talk to an Agent",
    tiers: plans([[6.9, "75 minutes"], [24.64, "275 minutes"], [108.95, "1,238 minutes"]], "month"),
  },
  {
    id: "audio-cleaner",
    category: "voice",
    name: "AI Voice / Audio Cleaner",
    blurb: "Strip background noise and isolate the voice. Studio sound from a phone recording.",
    features: ["Upload audio", "Background noise removal", "Voice isolation", "Clean audio download"],
    cta: "Clean Audio",
    tiers: plans([[6.9, "50 minutes"], [24.6, "183 minutes"], [108.9, "825 minutes"]]),
  },
  {
    id: "dubbing",
    category: "voice",
    name: "AI Dubbing",
    blurb: "Translate and dub audio or video while keeping the original speaker's voice and timing.",
    features: ["Audio/video upload", "AI translation & dubbing", "Multiple languages", "Preserves speaker voice & timing", "Download dubbed content"],
    cta: "Start Dubbing",
    tiers: plans([[6.9, "12 minutes"], [24.64, "44 minutes"], [108.9, "198 minutes"]]),
    versions: [
      { id: "v1", label: "Dubbing v1 · No watermark", note: "Clean output. $0.50 per minute.", factor: 1, tiers: plans([[6.9, "12 minutes"], [24.64, "44 minutes"], [108.9, "198 minutes"]]) },
      { id: "v1-watermark", label: "Dubbing v1 · With watermark", note: "Marked output, lower cost. $0.33 per minute.", factor: 0.66, tiers: plans([[6.84, "18 minutes"], [24.77, "67 minutes"], [108.9, "300 minutes"]]) },
      { id: "v2", label: "Dubbing v2", note: "Keeps voice and emotion. 90+ languages. $2.20 per minute.", factor: 4.4, tiers: plans([[7.59, "3 minutes"], [24.64, "10 minutes"], [108.9, "45 minutes"]]) },
    ],
  },
  {
    id: "avatar-video",
    category: "video",
    name: "AI Avatar Video",
    blurb: "Professional talking-avatar videos from a script. No camera, no studio.",
    features: ["Enter script", "Select avatar", "Select voice", "Generate talking video", "Video download"],
    cta: "Generate Video",
    tiers: [
      { name: "Starter", price: 4.99, quota: "2 video minutes", perks: ["Standard avatar", "Up to 720p", "Script-to-video"] },
      { name: "Creator", price: 14.99, quota: "10 video minutes", perks: ["Multiple avatar options", "Up to 1080p", "Script-to-video", "Generation history"] },
      { name: "Pro", price: 39.99, quota: "30 video minutes", perks: ["Premium avatar options", "Up to 1080p", "Generation history", "Priority processing"] },
    ],
  },
  {
    id: "video-translation",
    category: "video",
    name: "AI Video Translation",
    blurb: "Take one video into new markets. Translated speech in the speaker's own voice.",
    features: ["Upload video", "Select target language", "AI translation", "AI voice translation", "Download translated video"],
    cta: "Translate Video",
    tiers: three([4.99, 12.99, 39.99], ["3 video minutes", "10 video minutes", "40 video minutes"]),
  },
  {
    id: "translation-lipsync",
    category: "video",
    name: "Translation + Lip Sync",
    blurb: "Translated audio with lip movement re-synced to match. Reads as if it was shot that way.",
    features: ["Video translation", "AI voice", "Automatic lip sync", "Multiple languages", "Download final video"],
    cta: "Translate & Lip Sync",
    tiers: three([7.99, 19.99, 69.99], ["3 video minutes", "10 video minutes", "40 video minutes"]),
  },
  {
    id: "lip-sync",
    category: "video",
    name: "AI Lip Sync",
    blurb: "Match any audio track or voice to a person's lip movement on video.",
    features: ["Upload video", "Upload or select audio", "Automatic lip synchronization", "Download final video"],
    cta: "Lip Sync Video",
    tiers: three([5.99, 14.99, 49.99], ["3 video minutes", "10 video minutes", "40 video minutes"]),
  },
  {
    id: "short-clips",
    category: "video",
    name: "AI Short Clip Generator",
    blurb: "Find the best moments in a long video and cut them into Shorts, Reels and TikToks.",
    features: ["Upload long video", "AI highlight detection", "Generate short clips", "Shorts/Reels/TikTok ready", "Download clips"],
    cta: "Generate Clips",
    tiers: three([7.99, 24.99, 59.99], ["10 source minutes", "40 source minutes", "100 source minutes"]),
  },
  {
    id: "filler-remover",
    category: "video",
    name: "AI Filler Word Remover",
    blurb: "Cut the ums, uhs and dead air automatically. Tighter videos without an editor.",
    features: ["Upload video", "Automatic filler word detection", "Remove long silences", "Processed video download"],
    cta: "Clean Video",
    tiers: three([3.99, 9.99, 19.99], ["10 video minutes", "40 video minutes", "100 video minutes"]),
  },
  {
    id: "avatar-creator",
    category: "video",
    name: "AI Avatar Creator",
    blurb: "Build your own avatar once, then use it across every compatible video generation.",
    features: ["Photo avatar creation", "Custom video avatar creation", "Saved to your account", "Reusable in video generations"],
    cta: "Create Avatar",
    tiers: [
      { name: "Photo Avatar", price: 2.99, period: "avatar", quota: "From one photo" },
      { name: "Custom Video Avatar", price: 4.99, period: "avatar", quota: "From a short video" },
    ],
  },
  {
    id: "prompt-to-video",
    category: "video",
    name: "AI Prompt to Video",
    blurb: "Write what you want to see. Get a generated video clip back.",
    features: ["Text prompt to video", "AI video generation", "Video preview", "Generation history", "Video download"],
    cta: "Generate AI Video",
    tiers: three([9.99, 39.99, 69.99], ["1 video minute", "5 video minutes", "10 video minutes"]),
  },
  {
    id: "mcn-checker",
    category: "creator",
    name: "MCN / CMS Channel Checking",
    blurb: "Find which network a YouTube channel belongs to, with the network's contact email.",
    features: ["1 Credit = 1 channel check", "Network / CMS ownership", "Network contact email", "Credits never expire"],
    cta: "Check Channel",
    tiers: mcnTiers,
  },
];

export function servicesIn(category: ServiceCategory) {
  return SERVICES.filter((s) => s.category === category);
}

export function formatPrice(tier: Tier) {
  const amount = `$${tier.price % 1 === 0 ? tier.price.toFixed(0) : tier.price.toFixed(2)}`;
  const suffix =
    tier.period === "year" ? "/year" : tier.period === "month" ? "/month" : tier.period === "avatar" ? "/avatar" : "";
  return { amount, suffix };
}

/** Services that are shown but cannot be bought yet (their dashboard is not built). */
export const COMING_SOON = new Set(["distribution"]);
export const isComingSoon = (serviceId: string) => COMING_SOON.has(serviceId);
