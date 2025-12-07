-- Add course column to students for explicit course association
-- This migration adds a nullable text column `course` to the `students` table.
-- Valid values currently expected: 'cinematography' or 'videoediting' (not enforced here).

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS course text;

-- Optional: add an index to speed up filtering by course in admin views
CREATE INDEX IF NOT EXISTS idx_students_course ON public.students ((lower(course)));
