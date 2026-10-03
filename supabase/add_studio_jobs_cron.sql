-- Finish studio runs (videos, dubbing, lip sync) in the background, every minute, even when nobody
-- has the page open. Run this once in the Supabase SQL editor.
--
-- Replace YOUR_CRON_SECRET below with the CRON_SECRET value set in Vercel, then run it.

select cron.schedule(
  'finish-studio-jobs',
  '*/1 * * * *',
  $$
  select net.http_get(
    url := 'https://cms.zineticmusic.com/api/cron/studio-jobs',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET')
  );
  $$
);

-- to see that it is registered:   select * from cron.job;
-- to remove it later:             select cron.unschedule('finish-studio-jobs');
