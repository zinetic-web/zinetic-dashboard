import { MEDIA, SERVICES, type Service } from "@/lib/landing-services";

export type ServicePage = {
  hero: string;
  tagline: string;
  steps: { title: string; body: string }[];
  useCases: { title: string; body: string }[];
};

const step = (title: string, body: string) => ({ title, body });

export const SERVICE_PAGES: Record<string, ServicePage> = {
  distribution: {
    hero: MEDIA.guitar,
    tagline: "Release worldwide and keep up to 90% of your royalties.",
    steps: [
      step("Pick your plan", "Artist, Pro or Label, depending on how many artists you release for. One yearly price."),
      step("Upload your release", "Add your audio, artwork and release details. Unlimited releases on every plan."),
      step("Go live and get paid", "Your music reaches the major streaming platforms, with an analytics dashboard and a royalty report every month."),
    ],
    useCases: [
      step("Independent artists", "Put your songs on every major platform without a per-release fee."),
      step("Managers", "Run up to three artists from one Pro account."),
      step("Labels", "Unlimited artists and releases, with the highest royalty share."),
    ],
  },
  "music-generator": {
    hero: MEDIA.piano,
    tagline: "Describe a song and get a finished track back.",
    steps: [
      step("Describe it", "Write the mood, genre or idea in plain words. That is your prompt."),
      step("Choose vocals or instrumental", "Generate a track with vocals, or an instrumental only."),
      step("Download", "Listen, keep the ones you like and download the audio."),
    ],
    useCases: [
      step("Demos and sketches", "Hear an idea in minutes before you commit studio time."),
      step("Background music", "Original tracks for videos, streams and presentations."),
      step("Song starters", "Get a direction to build on when you are stuck."),
    ],
  },
  "voice-generator": {
    hero: MEDIA.micClose,
    tagline: "Turn any script into natural speech.",
    steps: [
      step("Paste your script", "Type or paste the text you want spoken."),
      step("Pick a voice and language", "Choose from multiple voices and languages."),
      step("Generate and download", "Get an MP3 in moments, and find it again in your generation history."),
    ],
    useCases: [
      step("Narration", "Voiceovers for videos, courses and audiobooks."),
      step("Ads and explainers", "Clean, consistent voiceovers without booking a studio."),
      step("Audio versions", "Turn articles and documents into something people can listen to."),
    ],
  },
  "voice-changer": {
    hero: MEDIA.smilingHeadphones,
    tagline: "Re-voice a recording and keep its timing and emotion.",
    steps: [
      step("Upload your audio", "Bring the recording you want to change."),
      step("Select a target voice", "Pick the voice the recording should become."),
      step("Convert and download", "Timing and emotion are preserved. Download the converted audio."),
    ],
    useCases: [
      step("Character voices", "Play several roles from one performance."),
      step("Alternate takes", "Try the same performance in a different voice."),
      step("Voice-over polish", "Swap in a voice that suits the project better."),
    ],
  },
  "sound-effects": {
    hero: MEDIA.djHands,
    tagline: "Type the sound you need. Get it back in seconds.",
    steps: [
      step("Describe the sound", "Write what you want to hear, like rain on a tin roof."),
      step("Choose the style", "Ambient sounds, cinematic effects or seamless loops."),
      step("Download", "Save the audio and drop it straight into your project."),
    ],
    useCases: [
      step("Video editing", "Whooshes, hits and ambience for your timeline."),
      step("Games and apps", "Custom effects instead of generic packs."),
      step("Podcasts and audio", "Add atmosphere to stories and intros."),
    ],
  },
  "speech-to-text": {
    hero: MEDIA.podcastA,
    tagline: "Accurate transcripts, with speakers and timestamps.",
    steps: [
      step("Upload audio or video", "Add the file you want transcribed."),
      step("Transcribe", "AI transcription with speaker detection and timestamps, in multiple languages."),
      step("Download the transcript", "Take the text away, ready to edit and share."),
    ],
    useCases: [
      step("Interviews and podcasts", "Searchable text from every conversation."),
      step("Subtitles", "Timed text to start your captions from."),
      step("Meeting notes", "Know who said what, and when."),
    ],
  },
  "speech-engine": {
    hero: MEDIA.podcastB,
    tagline: "Design a voice agent, then talk to it live.",
    steps: [
      step("Describe your agent", "Give it a name, a voice, a language and instructions on who it is and how it should behave."),
      step("Start talking", "Press talk and speak. The agent listens, thinks and answers out loud in real time."),
      step("Keep the transcript", "Every conversation is saved to your Library as a transcript."),
    ],
    useCases: [
      step("Front desk", "A receptionist that answers questions about hours, prices and bookings."),
      step("Language practice", "A patient tutor to speak with in any language, any time."),
      step("Sales and support", "Rehearse calls or answer common questions with a consistent voice."),
    ],
  },
  "audio-cleaner": {
    hero: MEDIA.studioSinger,
    tagline: "Studio-clean voice from a noisy recording.",
    steps: [
      step("Upload your audio", "Add the recording with background noise."),
      step("Clean and isolate", "Background noise is removed and the voice is isolated."),
      step("Download clean audio", "Get the cleaned file, ready to publish."),
    ],
    useCases: [
      step("Phone recordings", "Make voice memos sound professional."),
      step("Podcasts", "Take the room out of the recording."),
      step("Interviews", "Rescue a great answer from a noisy location."),
    ],
  },
  dubbing: {
    hero: MEDIA.greenMan,
    tagline: "Translate and dub, keeping the speaker's voice and timing.",
    steps: [
      step("Upload audio or video", "Add the content you want to dub."),
      step("Choose languages", "AI translation and dubbing in multiple languages."),
      step("Download the dub", "The speaker's voice and timing are preserved in the new language."),
    ],
    useCases: [
      step("Reach new audiences", "Publish the same video in more languages."),
      step("Courses and training", "Localize learning content without re-recording."),
      step("Interviews and podcasts", "Share conversations beyond one language."),
    ],
  },
  "avatar-video": {
    hero: MEDIA.presenterWoman,
    tagline: "Professional talking-avatar videos from a script.",
    steps: [
      step("Enter your script", "Write what the presenter should say."),
      step("Select an avatar and voice", "Choose how your presenter looks and sounds."),
      step("Generate and download", "Get a finished talking video, up to 1080p on higher plans."),
    ],
    useCases: [
      step("Explainers", "Present your product without a camera or studio."),
      step("Training videos", "Update a script and regenerate instead of re-filming."),
      step("Social content", "Publish regular videos without being on camera."),
    ],
  },
  "video-translation": {
    hero: MEDIA.greenPresenterB,
    tagline: "Take one video into new languages.",
    steps: [
      step("Upload your video", "Add the video you want to translate."),
      step("Select the target language", "AI translation with translated voice."),
      step("Download", "Get the translated video, ready to publish."),
    ],
    useCases: [
      step("Global launches", "One video for every market."),
      step("Education", "Make lessons understandable in more languages."),
      step("Creators", "Grow an audience beyond your first language."),
    ],
  },
  "translation-lipsync": {
    hero: MEDIA.headphonesCloseUp,
    tagline: "Translated video where the lips match the new words.",
    steps: [
      step("Upload your video", "Add the video with a visible speaker."),
      step("Translate", "AI translation and voice in your chosen language."),
      step("Lip sync and download", "Lip movement is re-synced automatically to the translated audio."),
    ],
    useCases: [
      step("Presenter videos", "Translations that look native on screen."),
      step("Ads", "Keep the impact of a face-to-camera message."),
      step("Interviews", "Preserve the feel of the original speaker."),
    ],
  },
  "lip-sync": {
    hero: MEDIA.neonGirl,
    tagline: "Match any audio to a person's lip movement.",
    steps: [
      step("Upload your video", "Add the video of the person speaking or singing."),
      step("Add the audio", "Upload or select the audio track to match."),
      step("Process and download", "Automatic lip synchronization, then download the final video."),
    ],
    useCases: [
      step("New vocals", "Put a new track on an existing performance."),
      step("Corrections", "Fix dialogue without reshooting."),
      step("Creative edits", "Try audio ideas on real footage."),
    ],
  },
  "short-clips": {
    hero: MEDIA.videoEditing,
    tagline: "Turn long videos into Shorts, Reels and TikToks.",
    steps: [
      step("Upload a long video", "Add a podcast, stream, interview or talk."),
      step("AI finds the highlights", "The best moments are detected and cut into clips."),
      step("Download your clips", "Vertical-friendly clips for Shorts, Reels and TikTok."),
    ],
    useCases: [
      step("Podcasters", "Promote every episode with a handful of clips."),
      step("Streamers", "Rescue the best moments from hours of footage."),
      step("Brands", "Repurpose webinars and events into social content."),
    ],
  },
  "filler-remover": {
    hero: MEDIA.podcastB,
    tagline: "Cut the ums, uhs and dead air automatically.",
    steps: [
      step("Upload your video", "Add the recording you want to tighten."),
      step("Detect and remove", "Filler words and long pauses are found and removed."),
      step("Download", "Get the processed video, ready to publish."),
    ],
    useCases: [
      step("Talking-head videos", "A tighter delivery without manual cutting."),
      step("Interviews", "Keep the conversation, lose the hesitation."),
      step("Courses", "Cleaner lessons in less time."),
    ],
  },
  "avatar-creator": {
    hero: MEDIA.ringLight,
    tagline: "Create your own avatar once. Use it everywhere.",
    steps: [
      step("Choose the type", "A photo avatar from one picture, or a custom video avatar."),
      step("Create it", "Upload your material and the avatar is built for you."),
      step("Reuse it", "It is saved to your account and works in compatible video generations."),
    ],
    useCases: [
      step("Personal brand", "Show up consistently without filming every time."),
      step("Teams", "One avatar for regular company updates."),
      step("Creators", "A recognizable presenter for a whole channel."),
    ],
  },
  "prompt-to-video": {
    hero: MEDIA.hoop,
    tagline: "Write what you want to see. Get a video back.",
    steps: [
      step("Write a prompt", "Describe the scene, camera and mood."),
      step("Generate and preview", "AI creates the clip and you preview it."),
      step("Download", "Keep the videos you like and find the rest in your history."),
    ],
    useCases: [
      step("Concepts", "Visualize an idea before producing it."),
      step("B-roll", "Short cinematic clips to cut into your videos."),
      step("Social content", "Fresh visuals from a single sentence."),
    ],
  },
  "mcn-checker": {
    hero: MEDIA.manCloseUp,
    tagline: "Find which network owns any YouTube channel.",
    steps: [
      step("Paste a channel", "Use a channel link, handle or ID."),
      step("We check", "See the MCN or CMS the channel belongs to, and the network's contact email."),
      step("Use the result", "1 Credit is 1 channel check. Credits never expire."),
    ],
    useCases: [
      step("Labels and rights managers", "Reach the right people about claims."),
      step("Creators", "Find out who manages a channel you work with."),
      step("Agencies", "Check networks before you sign a partnership."),
    ],
  },
};

export function getService(id: string): Service | undefined {
  return SERVICES.find((s) => s.id === id);
}

export function serviceHref(id: string) {
  return `/services/${id}`;
}

export function fromPrice(s: Service) {
  const min = s.tiers.reduce((a, b) => (b.price < a.price ? b : a));
  const amount = `$${min.price % 1 === 0 ? min.price.toFixed(0) : min.price.toFixed(2)}`;
  const suffix = min.period === "year" ? "/year" : min.period === "month" ? "/month" : min.period === "avatar" ? "/avatar" : "";
  return `From ${amount}${suffix}`;
}
