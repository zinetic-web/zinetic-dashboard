-- ElevenLabs services from the client's pricing brief: versions, plans in one base unit, provider rates.
-- Safe to run again. Plans are sold in the base unit of the first version, and credit_cost says how much of it
-- one unit of each version uses (Eleven v4 Turbo 0.5, so it goes twice as far).

insert into public.studio_engines
  (service, key, label, description, provider, model, credit_cost, cost_unit, features, max_duration_seconds, max_file_mb, max_chars, options, sort, provider_rate, rate_unit, trial_allowed, enabled)
values
  ('voice', 'v4', 'Eleven v4', 'Our most expressive and emotive voice. 85 languages.', 'elevenlabs', 'eleven_v4', 1, 'generation', '{multilingual,expressive}', null, null, 10000, '{}'::jsonb, 1, 0.08, 'per_1k_chars', true, true),
  ('voice', 'v4-turbo', 'Eleven v4 Turbo', 'Fast and light, goes twice as far. 85 languages.', 'elevenlabs', 'eleven_v4_turbo', 0.5, 'generation', '{multilingual}', null, null, 10000, '{}'::jsonb, 2, 0.04, 'per_1k_chars', true, true),
  ('voice', 'v3', 'Eleven v3', 'Dramatic delivery with audio tags such as [whispers]. 74 languages.', 'elevenlabs', 'eleven_v3', 1, 'generation', '{multilingual,audio-tags}', null, null, 5000, '{}'::jsonb, 3, 0.08, 'per_1k_chars', true, true),
  ('voice', 'v3-conversational', 'Eleven v3 Conversational', 'Natural, real-time delivery at half the usage. 74 languages.', 'elevenlabs', 'eleven_v3_conversational', 0.5, 'generation', '{multilingual,audio-tags}', null, null, 5000, '{}'::jsonb, 4, 0.04, 'per_1k_chars', true, true),
  ('voice', 'v1', 'Multilingual v2', 'Steady, natural narration. 29 languages.', 'elevenlabs', 'eleven_multilingual_v2', 1, 'generation', '{multilingual}', null, null, 10000, '{}'::jsonb, 5, 0.08, 'per_1k_chars', true, true),
  ('voice', 'flash', 'Flash / Turbo', 'Real-time speed for long scripts, goes twice as far. 32 languages.', 'elevenlabs', 'eleven_flash_v2_5', 0.5, 'generation', '{multilingual}', null, null, 40000, '{}'::jsonb, 6, 0.04, 'per_1k_chars', true, true),
  ('transcribe', 'v2', 'Scribe v2', 'Accurate transcripts of files, with speakers and timestamps. 90+ languages.', 'elevenlabs', 'scribe_v2', 1, 'minute', '{speakers,timestamps,audio,video}', 36000, 200, null, '{}'::jsonb, 1, 0.0036666666666666666, 'per_minute', true, true),
  ('transcribe', 'realtime', 'Scribe v2 Realtime', 'Live transcription from your microphone, as you speak.', 'elevenlabs', 'scribe_v2_realtime', 1.7727, 'minute', '{realtime,timestamps}', 3600, null, null, '{}'::jsonb, 2, 0.006500000000000001, 'per_minute', false, true),
  ('music', 'v25', 'Music v2.5', 'The newest and most capable. Full songs with vocals.', 'elevenlabs', 'music_v2_5', 1, 'minute', '{}', 300, null, 1500, '{}'::jsonb, 1, 0.15, 'per_minute', true, true),
  ('music', 'v2', 'Music v2', 'Adds ready-made styles such as Deep Hip-Hop or Gothic Rock.', 'elevenlabs', 'music_v2', 1, 'minute', '{finetunes}', 300, null, 1500, '{}'::jsonb, 2, 0.15, 'per_minute', true, true),
  ('music', 'v1', 'Music v1', 'The original music model.', 'elevenlabs', 'music_v1', 1, 'minute', '{}', 300, null, 1500, '{}'::jsonb, 3, 0.15, 'per_minute', true, true),
  ('voice-changer', 'v1', 'Voice Changer', 'Keeps timing and emotion.', 'elevenlabs', 'eleven_multilingual_sts_v2', 1, 'minute', '{}', 600, 50, null, '{}'::jsonb, 1, 0.12, 'per_minute', true, true),
  ('audio-cleaner', 'v1', 'Voice Isolator', 'Noise removal and voice isolation.', 'elevenlabs', 'audio-isolation', 1, 'minute', '{}', 3600, 200, null, '{}'::jsonb, 1, 0.12, 'per_minute', true, true),
  ('sound-effects', 'v1', 'Sound Effects', 'Text to sound effects. Each generation covers up to 20 seconds.', 'elevenlabs', 'eleven_text_to_sound_v2', 1, 'generation', '{loop}', 30, null, 450, '{}'::jsonb, 1, 0.12, 'per_minute', true, true),
  ('dubbing', 'v1', 'Dubbing v1 · No watermark', 'Clean output. Keeps each speaker''s own voice.', 'elevenlabs', 'dubbing_v1', 1, 'minute', '{audio,video,speaker-voices}', 1800, 200, null, '{"watermark":false}'::jsonb, 1, 0.5, 'per_minute', true, true),
  ('dubbing', 'v1-watermark', 'Dubbing v1 · With watermark', 'Marked output at a lower cost. Keeps each speaker''s own voice.', 'elevenlabs', 'dubbing_v1', 0.66, 'minute', '{audio,video,speaker-voices}', 1800, 200, null, '{"watermark":true}'::jsonb, 2, 0.33, 'per_minute', true, true),
  ('dubbing', 'v2', 'Dubbing v2', 'Keeps each voice, tone and emotion. 90+ languages.', 'elevenlabs', 'dubbing_v2', 4.4, 'minute', '{audio,video,speaker-voices}', 1800, 200, null, '{}'::jsonb, 3, 2.2, 'per_minute', false, true),
  ('speech-engine', 'v1', 'Speech Engine', 'A voice agent that listens, thinks and answers out loud.', 'elevenlabs', 'agents', 1, 'minute', '{}', 1800, null, null, '{}'::jsonb, 1, 0.08, 'per_minute', false, true)
on conflict (service, key) do update set
  label = excluded.label, description = excluded.description, provider = excluded.provider, model = excluded.model,
  credit_cost = excluded.credit_cost, cost_unit = excluded.cost_unit, features = excluded.features,
  max_duration_seconds = excluded.max_duration_seconds, max_file_mb = excluded.max_file_mb, max_chars = excluded.max_chars,
  options = excluded.options, sort = excluded.sort, provider_rate = excluded.provider_rate, rate_unit = excluded.rate_unit,
  trial_allowed = excluded.trial_allowed, enabled = excluded.enabled;

update public.studio_engines set enabled = false where service = 'transcribe' and key = 'v1';
