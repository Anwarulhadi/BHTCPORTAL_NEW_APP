-- Change grade and total columns to numeric to support decimal scores
ALTER TABLE public.grades ALTER COLUMN grade TYPE numeric(5,2);
ALTER TABLE public.grades ALTER COLUMN total TYPE numeric(5,2);
