-- Add sub_category column to videos table
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS sub_category text;

-- Create an index for faster filtering
CREATE INDEX IF NOT EXISTS idx_videos_sub_category ON public.videos(sub_category);

-- Force schema cache reload
NOTIFY pgrst, 'reload config';