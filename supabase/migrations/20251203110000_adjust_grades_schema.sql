-- Adjust grades schema to support score/total and upsert
-- 1) Drop 0-100 check so scores can exceed 100
ALTER TABLE public.grades DROP CONSTRAINT IF EXISTS grades_grade_check;

-- 2) Ensure total column exists and is integer
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'grades'
      AND column_name  = 'total'
  ) THEN
    -- If total exists, set type to integer for consistency
    BEGIN
      ALTER TABLE public.grades ALTER COLUMN total TYPE integer USING total::integer;
    EXCEPTION WHEN undefined_column THEN
      -- Ignore if column does not exist between checks
      NULL;
    END;
  ELSE
    ALTER TABLE public.grades ADD COLUMN total integer;
  END IF;
END$$;

-- 3) Add unique index for (student_id, subject) so ON CONFLICT works
CREATE UNIQUE INDEX IF NOT EXISTS grades_student_subject_key ON public.grades (student_id, subject);
