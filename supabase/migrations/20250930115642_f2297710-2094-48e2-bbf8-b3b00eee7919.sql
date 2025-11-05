-- Create function to update course structure atomically
CREATE OR REPLACE FUNCTION public.update_course_structure_transaction(
  p_raw_course_material_id bigint,
  p_course_structure jsonb[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update course_material_structure_only table
  INSERT INTO public.course_material_structure_only (
    raw_course_material_id,
    course_structure
  )
  VALUES (
    p_raw_course_material_id,
    p_course_structure
  )
  ON CONFLICT (raw_course_material_id)
  DO UPDATE SET
    course_structure = EXCLUDED.course_structure;

  -- Update all related course_materials records
  UPDATE public.course_materials
  SET 
    course_structure = p_course_structure,
    updated_at = now()
  WHERE raw_course_material_id = p_raw_course_material_id;
END;
$$;