-- Add order_index column to teachers table
ALTER TABLE "public"."teachers" ADD COLUMN IF NOT EXISTS "order_index" integer;

-- Enable realtime for teachers table if not already enabled
-- Note: This might fail if publication doesn't exist, but usually it does in Supabase.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'teachers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE teachers;
  END IF;
END
$$;
