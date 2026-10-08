import type { IconType } from "react-icons";
import { SparkIcon } from "@/components/spark-icon";
import { MEDIA } from "@/lib/landing-services";
import { PiEraserBold, PiFileTextBold, PiFilmSlateBold, PiMagicWandBold, PiMicrophoneBold, PiMusicNotesBold, PiScissorsBold, PiSmileyBold, PiSpeakerHighBold, PiTranslateBold, PiUserCircleBold, PiVideoCameraBold, PiWaveSineBold, PiWaveformBold } from "react-icons/pi";

export type ToolGroup = "audio" | "video";

export type StudioTool = {
  id: string;
  name: string;
  blurb: string;
  group: ToolGroup;
  icon: IconType;
  href?: string;
  /** generation kinds this tool writes, used for its recent list */
  kinds?: string[];
  /** not buildable on the current providers yet */
  soon?: string;
  /** cover artwork: a looping clip or a still */
  media: { type: "video" | "image"; src: string };
  /** gradient used for the icon tile and accents, tailwind from/to classes */
  accent: string;
};

export const GROUPS: { id: ToolGroup; label: string; blurb: string }[] = [
  { id: "audio", label: "Voice and audio", blurb: "Speech, music, sound and transcripts." },
  { id: "video", label: "Video", blurb: "Avatars, translation and prompt-made video." },
];

export const TOOLS: StudioTool[] = [
  { id: "voice", name: "Voice generator", blurb: "Turn a script into natural speech in any voice.", group: "audio", icon: PiWaveformBold, href: "/studio/voice", kinds: ["voice"], media: { type: "video", src: MEDIA.micClose }, accent: "from-fuchsia-500 to-rose-500" },
  { id: "voice-changer", name: "Voice changer", blurb: "Re-voice a recording and keep its timing and emotion.", group: "audio", icon: PiMicrophoneBold, href: "/studio/voice-changer", kinds: ["voice-changer"], media: { type: "video", src: MEDIA.purpleMic }, accent: "from-violet-500 to-fuchsia-500" },
  { id: "sound-effects", name: "Sound effects", blurb: "Describe a sound: ambience, impacts, seamless loops.", group: "audio", icon: PiSpeakerHighBold, href: "/studio/sound-effects", kinds: ["sfx"], media: { type: "video", src: MEDIA.concertLights }, accent: "from-amber-500 to-orange-600" },
  { id: "music", name: "Music generator", blurb: "Describe a song and get a finished track back.", group: "audio", icon: PiMusicNotesBold, href: "/studio/music", kinds: ["music"], media: { type: "video", src: MEDIA.djDeck }, accent: "from-pink-500 to-purple-600" },
  { id: "transcribe", name: "Speech to text", blurb: "Transcripts with speakers and timestamps.", group: "audio", icon: PiFileTextBold, href: "/studio/transcribe", kinds: ["transcribe"], media: { type: "video", src: MEDIA.podcastA }, accent: "from-sky-500 to-blue-600" },
  { id: "audio-cleaner", name: "Audio cleaner", blurb: "Remove noise and isolate the voice.", group: "audio", icon: PiWaveSineBold, href: "/studio/audio-cleaner", kinds: ["audio-cleaner"], media: { type: "video", src: MEDIA.studioSession }, accent: "from-emerald-500 to-teal-600" },
  { id: "dubbing", name: "Dubbing", blurb: "Dub audio or video into another language.", group: "audio", icon: PiTranslateBold, href: "/studio/dubbing", kinds: ["dubbing"], media: { type: "video", src: MEDIA.videoEditing }, accent: "from-indigo-500 to-blue-500" },

  { id: "avatar-video", name: "Avatar video", blurb: "A presenter that speaks your script.", group: "video", icon: PiFilmSlateBold, href: "/studio/avatar-video", kinds: ["avatar-video"], media: { type: "video", src: MEDIA.presenterWoman }, accent: "from-rose-500 to-orange-500" },
  { id: "avatar-creator", name: "Avatar creator", blurb: "Turn a photo into an avatar you can reuse.", group: "video", icon: PiUserCircleBold, href: "/studio/avatar-creator", media: { type: "image", src: MEDIA.portraitWoman }, accent: "from-purple-500 to-pink-500" },
  { id: "video-translation", name: "Video translation", blurb: "Translate a video, with optional lip sync.", group: "video", icon: PiVideoCameraBold, href: "/studio/video-translation", kinds: ["video-translation", "translation-lipsync"], media: { type: "video", src: MEDIA.womanTalking }, accent: "from-cyan-500 to-blue-600" },
  { id: "prompt-video", name: "Prompt to video", blurb: "Describe a video and get it made.", group: "video", icon: SparkIcon, href: "/studio/prompt-video", kinds: ["prompt-video"], media: { type: "video", src: MEDIA.neonDancer }, accent: "from-fuchsia-500 to-indigo-600" },
  { id: "lip-sync", name: "Lip sync", blurb: "Match a video to new audio.", group: "video", icon: PiSmileyBold, href: "/studio/lip-sync", kinds: ["lip-sync"], media: { type: "video", src: MEDIA.smilingSinger }, accent: "from-pink-500 to-red-500" },
  { id: "short-clips", name: "Short clip generator", blurb: "Cut a long video into Shorts, Reels and TikToks.", group: "video", icon: PiScissorsBold, href: "/studio/short-clips", kinds: ["short-clips"], media: { type: "video", src: MEDIA.gimbalPhone }, accent: "from-lime-500 to-emerald-600" },
  { id: "filler-remover", name: "Filler word remover", blurb: "Remove ums, ahs and long silences.", group: "video", icon: PiEraserBold, href: "/studio/filler-remover", kinds: ["filler-remover"], media: { type: "video", src: MEDIA.ringLight }, accent: "from-yellow-500 to-orange-500" },
];

export const toolByHref = (href: string) => TOOLS.find((t) => t.href === href);
export { PiMagicWandBold };
