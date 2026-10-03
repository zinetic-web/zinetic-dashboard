-- HeyGen moves to API v3 (v1 and v2 are retired on 31 October 2026) and gains the Lip sync tool.
-- Run this once in the Supabase SQL editor. Safe to run again.

insert into public.studio_engines
  (service, key, label, description, provider, model, credit_cost, cost_unit, features, max_duration_seconds, max_file_mb, options, sort, provider_rate, rate_unit, trial_allowed)
values
  ('lip-sync', 'v1', 'Lip sync', 'Match any video to new speech, with the mouth redrawn to fit.', 'heygen', 'lipsyncs', 1, 'minute', '{video,lipsync}', 600, 200, '{}', 1, 2.00, 'per_minute', false)
on conflict (service, key) do nothing;
