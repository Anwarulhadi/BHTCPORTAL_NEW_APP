ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS news_admin_password text DEFAULT 'NewsAdmin@20';
