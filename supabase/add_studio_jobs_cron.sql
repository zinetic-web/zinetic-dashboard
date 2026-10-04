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
    headers := jsonb_build_object('Authorization', 'Bearer d26e7740a11a7b8e3148b82e6152e328d6da8fbf941f17ecc4df3d1ea16a61e6')
  );
  $$
);

-- to see that it is registered:   select * from cron.job;
-- to remove it later:             select cron.unschedule('finish-studio-jobs');
