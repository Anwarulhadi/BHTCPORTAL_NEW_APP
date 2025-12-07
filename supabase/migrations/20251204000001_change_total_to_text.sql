-- Change total column to text to support any characters (numbers, text, emojis)
ALTER TABLE public.grades ALTER COLUMN total TYPE text;
