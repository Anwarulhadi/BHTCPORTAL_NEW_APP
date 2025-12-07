-- Create a NEW secure function to update the order (v2)
-- This avoids any caching issues with the previous function name
CREATE OR REPLACE FUNCTION update_teacher_order_v2(teacher_id uuid, new_order_index integer)
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
GRANT EXECUTE ON FUNCTION update_teacher_order_v2(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION update_teacher_order_v2(uuid, integer) TO service_role;

-- Force a schema cache reload
NOTIFY pgrst, 'reload config';
