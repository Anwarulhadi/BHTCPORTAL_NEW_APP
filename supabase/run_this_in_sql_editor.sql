-- Run this in your Supabase SQL Editor to fix the "could not find the description column" error
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS description text;
