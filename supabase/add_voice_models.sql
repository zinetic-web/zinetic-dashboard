-- Voice generator: every current voice model as its own engine, and a customer's saved voices.
-- Run this once in the Supabase SQL editor. Safe to run again.

-- Saved voices: the library voices a customer added to "My voices".
create table if not exists public.studio_voices (
  user_id uuid not null references public.profiles(id) on delete cascade,
  voice_id text not null,
  name text not null,
  gender text,
  age text,
  accent text,
  language text,
  locale text,
  use_case text,
  description text,
  preview_url text,
  source text not null default 'library',
  created_at timestamptz not null default now(),
  primary key (user_id, voice_id)
);

alter table public.studio_voices enable row level security;

drop policy if exists "Users read their own voices" on public.studio_voices;
create policy "Users read their own voices" on public.studio_voices for select using (auth.uid() = user_id);
drop policy if exists "Admins read all voices" on public.studio_voices;
create policy "Admins read all voices" on public.studio_voices for select using (public.is_admin());

-- The older engine becomes "Multilingual v2" and moves down the list.
update public.studio_engines
   set label = 'Multilingual v2',
       description = 'Steady, natural narration. 29 languages.',
       sort = 4
 where service = 'voice' and key = 'v1';

insert into public.studio_engines
  (service, key, label, description, provider, model, credit_cost, cost_unit, features, max_chars, options, sort, provider_rate, rate_unit, trial_allowed)
values
  ('voice', 'v4',       'Voice v4',       'Our most expressive and emotive voice. 85 languages.',         'elevenlabs', 'eleven_v4',       1,   'generation', '{multilingual,expressive}', 10000, '{}', 1, 0.08, 'per_1k_chars', true),
  ('voice', 'v4-turbo', 'Voice v4 Turbo', 'Fast and light, half the usage. 85 languages.',                'elevenlabs', 'eleven_v4_turbo', 0.5, 'generation', '{multilingual}',            10000, '{}', 2, 0.04, 'per_1k_chars', true),
  ('voice', 'v3',       'Voice v3',       'Dramatic delivery with audio tags such as [whispers]. 74 languages.', 'elevenlabs', 'eleven_v3', 1,   'generation', '{multilingual,audio-tags}', 5000,  '{}', 3, 0.08, 'per_1k_chars', true),
  ('voice', 'flash',    'Flash v2.5',     'Real-time speed for long scripts, half the usage. 32 languages.', 'elevenlabs', 'eleven_flash_v2_5', 0.5, 'generation', '{multilingual}',          40000, '{}', 5, 0.04, 'per_1k_chars', true)
on conflict (service, key) do nothing;
