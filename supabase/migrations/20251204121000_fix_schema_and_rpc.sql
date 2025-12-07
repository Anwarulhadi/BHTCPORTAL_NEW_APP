-- Ensure the column exists
ALTER TABLE "public"."teachers" ADD COLUMN IF NOT EXISTS "order_index" integer;

-- Create a secure function to update the order
CREATE OR REPLACE FUNCTION update_teacher_order(teacher_id uuid, new_order_index integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.teachers
  SET order_index = new_order_index
  WHERE id = teacher_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_teacher_order(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION update_teacher_order(uuid, integer) TO service_role;

-- Force a schema cache reload to ensure the API knows about the new column and function
NOTIFY pgrst, 'reload config';
