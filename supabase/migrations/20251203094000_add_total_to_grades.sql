-- Add total column to grades to support displaying score/total
ALTER TABLE public.grades
ADD COLUMN IF NOT EXISTS total numeric;

-- Optional: set NOT NULL constraints or defaults can be decided later
-- UPDATE existing rows to NULL total (unknown total)
