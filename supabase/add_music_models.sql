-- Music generator: the three music model versions as engines, with ready-made styles on v2.
-- Run this once in the Supabase SQL editor. Safe to run again.

update public.studio_engines
   set label = 'Music v1', description = 'The original music model.', sort = 3
 where service = 'music' and key = 'v1';

insert into public.studio_engines
  (service, key, label, description, provider, model, credit_cost, cost_unit, features, max_duration_seconds, max_chars, options, sort, provider_rate, rate_unit, trial_allowed)
values
  ('music', 'v25', 'Music v2.5', 'The newest and most capable. Full songs with vocals.',          'elevenlabs', 'music_v2_5', 1, 'generation', '{}',            300, 1500, '{}', 1, 0.15, 'per_minute', true),
  ('music', 'v2',  'Music v2',   'Adds ready-made styles such as Deep Hip-Hop or Gothic Rock.', 'elevenlabs', 'music_v2',   1, 'generation', '{finetunes}', 300, 1500, '{}', 2, 0.15, 'per_minute', true)
on conflict (service, key) do nothing;
