-- Base migration snapshot (schema policies, functions, and triggers)
-- Generated: 2025-08-31
-- Note:
-- - This file captures full public schema: TABLE DDL, functions, RLS policies, and triggers.
-- - Intended as a base migration to bootstrap new environments from current live schema.
-- - Review carefully before applying to production.

BEGIN;

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- Tables (public schema)
-- =========================

-- admin_users
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  is_approved boolean NOT NULL DEFAULT false,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  admin_level text NOT NULL DEFAULT 'basic',
  CONSTRAINT admin_users_user_id_key UNIQUE (user_id),
  CONSTRAINT admin_users_admin_level_check CHECK (admin_level IN ('basic','super'))
);

-- course_material_publishers
CREATE TABLE IF NOT EXISTS public.course_material_publishers (
  course_material_publisher_id bigint PRIMARY KEY,
  course_material_publisher_name text NOT NULL,
  course_material_publisher_desc text
);

-- course_material_structure_only
CREATE TABLE IF NOT EXISTS public.course_material_structure_only (
  course_material_structure_only_id bigint PRIMARY KEY,
  raw_course_material_id bigint NOT NULL,
  course_structure jsonb[] NOT NULL DEFAULT '{}'
);

-- course_materials
CREATE TABLE IF NOT EXISTS public.course_materials (
  course_material_id bigint PRIMARY KEY,
  raw_course_material_id bigint NOT NULL,
  course_material_desc text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  course_structure jsonb[],
  updated_at timestamptz DEFAULT now(),
  generation_status_type_id bigint DEFAULT 1,
  course_material_text_raw jsonb
);

-- course_section
CREATE TABLE IF NOT EXISTS public.course_section (
  course_section_id bigint PRIMARY KEY,
  section_name text NOT NULL,
  section_objectives text NOT NULL,
  section_desc text,
  course_material_id bigint,
  section_common_content text,
  section_pages jsonb[],
  section_weeks jsonb
);

-- course_semesters
CREATE TABLE IF NOT EXISTS public.course_semesters (
  course_semester_id smallint PRIMARY KEY,
  course_semester_name text NOT NULL,
  course_semester_desc text
);

-- course_types
CREATE TABLE IF NOT EXISTS public.course_types (
  course_type_id bigint PRIMARY KEY,
  course_type_name text NOT NULL,
  course_type_desc text
);

-- courses
CREATE TABLE IF NOT EXISTS public.courses (
  course_id bigint PRIMARY KEY,
  course_name text NOT NULL,
  course_grade text NOT NULL,
  course_type_id bigint NOT NULL,
  course_semester_id smallint NOT NULL,
  course_material_publisher_id bigint,
  course_desc text
);

-- cowork_types
CREATE TABLE IF NOT EXISTS public.cowork_types (
  cowork_type_id bigint PRIMARY KEY,
  cowork_type_name text NOT NULL,
  cowork_type_desc text NOT NULL
);

-- format_selection_attrs
CREATE TABLE IF NOT EXISTS public.format_selection_attrs (
  format_selection_attrs_id bigint PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  course_material_id bigint,
  format_selection_additional_message text NOT NULL,
  course_material_scope jsonb,
  class_mate_info jsonb
);

-- format_selection_attrs_cowork_type_map
CREATE TABLE IF NOT EXISTS public.format_selection_attrs_cowork_type_map (
  format_selection_attrs_id bigint NOT NULL,
  cowork_type_id bigint NOT NULL,
  PRIMARY KEY (format_selection_attrs_id, cowork_type_id)
);

-- format_selection_attrs_teaching_style_map
CREATE TABLE IF NOT EXISTS public.format_selection_attrs_teaching_style_map (
  format_selection_attrs_id bigint NOT NULL,
  teaching_style_id bigint NOT NULL,
  PRIMARY KEY (format_selection_attrs_id, teaching_style_id)
);

-- format_selection_request_messages
CREATE TABLE IF NOT EXISTS public.format_selection_request_messages (
  format_selection_request_message_id bigint PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  user_id uuid DEFAULT gen_random_uuid(),
  format_selection_attrs_id bigint
);

-- format_selection_responses
CREATE TABLE IF NOT EXISTS public.format_selection_responses (
  format_selection_response_id bigint PRIMARY KEY,
  format_selection_attrs_id bigint,
  recommended_formats numeric[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- formatting_info
CREATE TABLE IF NOT EXISTS public.formatting_info (
  style_name text,
  font_name text,
  font_size double precision,
  alignment text,
  font_color text,
  background_color text,
  bold boolean,
  italic boolean,
  underline boolean,
  line_spacing double precision,
  paragraph_spacing double precision
);

-- generation_attrs
CREATE TABLE IF NOT EXISTS public.generation_attrs (
  generation_attrs_id bigint PRIMARY KEY,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  course_material_id bigint,
  raw_generation_format_id bigint,
  generation_additional_message text,
  course_material_scope jsonb,
  class_mate_info jsonb,
  output_path text
);

-- generation_attrs_cowork_type_map
CREATE TABLE IF NOT EXISTS public.generation_attrs_cowork_type_map (
  generation_attrs_id bigint NOT NULL,
  cowork_type_id bigint NOT NULL,
  PRIMARY KEY (generation_attrs_id, cowork_type_id)
);

-- generation_attrs_teaching_style_map
CREATE TABLE IF NOT EXISTS public.generation_attrs_teaching_style_map (
  generation_attrs_id bigint NOT NULL,
  teaching_style_id bigint NOT NULL,
  PRIMARY KEY (generation_attrs_id, teaching_style_id)
);

-- generation_format_type
CREATE TABLE IF NOT EXISTS public.generation_format_type (
  generation_format_type_id bigint PRIMARY KEY,
  generation_format_type_name text NOT NULL,
  generation_format_type_desc text NOT NULL,
  generation_format_type_path text NOT NULL
);

-- generation_formats
CREATE TABLE IF NOT EXISTS public.generation_formats (
  generation_format_id bigint PRIMARY KEY,
  raw_generation_format_id bigint,
  generation_format_text_raw jsonb,
  generation_format_desc text,
  generation_format_sections jsonb[],
  generation_status_type_id bigint DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- generation_requests
CREATE TABLE IF NOT EXISTS public.generation_requests (
  generation_request_id bigint PRIMARY KEY,
  request_time timestamptz NOT NULL DEFAULT now(),
  generation_attrs_id bigint NOT NULL,
  user_id uuid
);

-- generation_responses
CREATE TABLE IF NOT EXISTS public.generation_responses (
  generation_response_id bigint PRIMARY KEY,
  generation_attrs_id bigint,
  generation_request_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  updated_at timestamptz,
  output_path text,
  generation_result_messages text,
  generation_status_type_id bigint DEFAULT 1,
  generation_name text
);

-- generation_section
CREATE TABLE IF NOT EXISTS public.generation_section (
  generation_section_id bigint,
  generation_section_desc text NOT NULL,
  generation_section_content text NOT NULL,
  style_info jsonb
);

-- generation_status_types
CREATE TABLE IF NOT EXISTS public.generation_status_types (
  generation_status_type_id bigint PRIMARY KEY,
  generation_status_type_name text,
  generation_status_type_desc text
);

-- help_request_types
CREATE TABLE IF NOT EXISTS public.help_request_types (
  help_request_type_id bigint PRIMARY KEY,
  help_request_type_name text NOT NULL DEFAULT 'default_help_request_type_name',
  help_request_type_desc text NOT NULL DEFAULT 'default_help_request_type_description'
);

-- help_requests
CREATE TABLE IF NOT EXISTS public.help_requests (
  help_request_id bigint PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  help_request_type_id bigint NOT NULL DEFAULT 1,
  help_request_email text,
  help_request_name text,
  help_request_content text,
  help_request_file_path text,
  is_checked boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- payment_histories
CREATE TABLE IF NOT EXISTS public.payment_histories (
  payment_id bigint PRIMARY KEY,
  user_id uuid,
  plan_id bigint,
  payment_status_id bigint,
  etc text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- payment_status
CREATE TABLE IF NOT EXISTS public.payment_status (
  payment_status_id bigint PRIMARY KEY,
  payment_status_name text,
  payment_status_desc text
);

-- plans
CREATE TABLE IF NOT EXISTS public.plans (
  plan_id bigint PRIMARY KEY,
  plan_name text NOT NULL,
  plan_desc text NOT NULL,
  weekly_credit integer NOT NULL
);

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text,
  grade text,
  subject text,
  school text,
  verification_status text DEFAULT 'pending',
  verification_document_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- raw_course_materials
CREATE TABLE IF NOT EXISTS public.raw_course_materials (
  raw_course_material_id bigint PRIMARY KEY,
  course_id bigint NOT NULL,
  course_material_name text NOT NULL,
  course_material_desc text NOT NULL,
  course_material_path text NOT NULL,
  registered_course_structure jsonb[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- raw_generation_format_cowork_type_map
CREATE TABLE IF NOT EXISTS public.raw_generation_format_cowork_type_map (
  raw_generation_format_id bigint NOT NULL,
  cowork_type_id bigint NOT NULL,
  PRIMARY KEY (raw_generation_format_id, cowork_type_id)
);

-- raw_generation_format_stats
CREATE TABLE IF NOT EXISTS public.raw_generation_format_stats (
  raw_generation_format_stat_id bigint PRIMARY KEY,
  raw_generation_format_id bigint,
  format_selection_count bigint,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- raw_generation_format_teaching_style_map
CREATE TABLE IF NOT EXISTS public.raw_generation_format_teaching_style_map (
  raw_generation_format_id bigint NOT NULL,
  teaching_style_id bigint NOT NULL,
  PRIMARY KEY (raw_generation_format_id, teaching_style_id)
);

-- raw_generation_formats
CREATE TABLE IF NOT EXISTS public.raw_generation_formats (
  raw_generation_format_id bigint PRIMARY KEY,
  generation_format_name text NOT NULL,
  generation_format_path text NOT NULL,
  generation_format_desc text,
  uploaded_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- schools
CREATE TABLE IF NOT EXISTS public.schools (
  school_id bigint PRIMARY KEY,
  school_name text NOT NULL,
  school_address text NOT NULL,
  school_number text
);

-- style_info
CREATE TABLE IF NOT EXISTS public.style_info (
  font_name text,
  font_size double precision,
  bold boolean,
  italic boolean,
  underline boolean,
  paragraph_index integer,
  formatting_info jsonb
);

-- teacher_course_type_course_material_publisher_map
CREATE TABLE IF NOT EXISTS public.teacher_course_type_course_material_publisher_map (
  teacher_info_id bigint NOT NULL,
  course_type_id bigint NOT NULL,
  course_material_publisher_id bigint NOT NULL,
  PRIMARY KEY (teacher_info_id, course_type_id, course_material_publisher_id)
);

-- teacher_info
CREATE TABLE IF NOT EXISTS public.teacher_info (
  teacher_info_id bigint PRIMARY KEY,
  user_id uuid,
  school_id bigint NOT NULL,
  class_info jsonb,
  nickname text,
  homepage_url text,
  self_introduction text,
  personal_photo_path text,
  teacher_verification_file_path text,
  teacher_verified boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- teacher_teaching_style_map
CREATE TABLE IF NOT EXISTS public.teacher_teaching_style_map (
  teacher_info_id bigint NOT NULL,
  teaching_style_id bigint NOT NULL,
  PRIMARY KEY (teacher_info_id, teaching_style_id)
);

-- teaching_styles
CREATE TABLE IF NOT EXISTS public.teaching_styles (
  teaching_style_id bigint NOT NULL,
  teaching_style_name text NOT NULL,
  teaching_style_desc text NOT NULL,
  open_status boolean DEFAULT false
);

-- user_access_logs
CREATE TABLE IF NOT EXISTS public.user_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_user_id bigint,
  accessor_user_id uuid DEFAULT auth.uid(),
  access_timestamp timestamptz DEFAULT now(),
  access_reason text,
  created_at timestamptz DEFAULT now()
);

-- user_plan_status
CREATE TABLE IF NOT EXISTS public.user_plan_status (
  user_plan_status_id bigint PRIMARY KEY,
  plan_id bigint NOT NULL,
  credit_left bigint,
  user_id uuid
);

-- =========================
-- Functions (public schema)
-- =========================

CREATE OR REPLACE FUNCTION public.is_admin_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_auth_users()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  RETURN (SELECT auth.uid()) IS NOT NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.admin_users 
    WHERE user_id = auth.uid() 
      AND is_approved = true 
      AND admin_level = 'super'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_approved_admin_user()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid() AND is_approved = true
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_help_request_types()
 RETURNS TABLE(help_request_type_id bigint, help_request_type_name text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT h.help_request_type_id, h.help_request_type_name
  FROM public.help_request_types h
  ORDER BY h.help_request_type_id;
$function$;

CREATE OR REPLACE FUNCTION public.set_help_request_user_id_secure()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  -- Auto-set user_id from the authenticated user if not provided
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;

  -- Require authentication
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to submit help requests';
  END IF;

  -- Prevent spoofing other users' IDs unless approved admin
  IF NEW.user_id <> auth.uid() AND NOT public.is_approved_admin_user() THEN
    RAISE EXCEPTION 'Cannot set user_id to a different user';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.insert_help_request(p_help_request_type_id bigint, p_help_request_email text, p_help_request_name text, p_help_request_content text, p_help_request_file_path text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  INSERT INTO public.help_requests (
    help_request_type_id,
    help_request_email,
    help_request_name,
    help_request_content,
    help_request_file_path
  )
  VALUES (
    p_help_request_type_id,
    p_help_request_email,
    p_help_request_name,
    p_help_request_content,
    p_help_request_file_path
  )
  RETURNING help_request_id;
$function$;

CREATE OR REPLACE FUNCTION public.current_user_email()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select email from auth.users where id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.check_help_request_rate_limit()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT COUNT(*) < 5
  FROM public.help_requests
  WHERE user_id = auth.uid()
    AND created_at > NOW() - INTERVAL '1 hour';
$function$;

-- Generic secure user_id setter for tables with user_id ownership
CREATE OR REPLACE FUNCTION public.set_current_user_id_secure()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;

  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  IF NEW.user_id <> auth.uid() AND NOT public.is_approved_admin_user() THEN
    RAISE EXCEPTION 'Cannot set user_id to a different user';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_generation_response_user_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT ga.user_id
      INTO NEW.user_id
    FROM public.generation_attrs ga
    WHERE ga.generation_attrs_id = NEW.generation_attrs_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_generation_response_user_id_secure()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;

  IF NEW.user_id != auth.uid() AND NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Cannot set user_id to a different user';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_association_table(p_table_name text, p_parent_column text, p_child_column text, p_parent_id bigint, p_child_ids bigint[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sql_delete text;
  sql_insert text;
  child_id bigint;
BEGIN
  -- Validate table name to prevent SQL injection
  IF p_table_name !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;
  
  IF p_parent_column !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
    RAISE EXCEPTION 'Invalid parent column name: %', p_parent_column;
  END IF;
  
  IF p_child_column !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' THEN
    RAISE EXCEPTION 'Invalid child column name: %', p_child_column;
  END IF;
  
  -- Delete existing mappings
  sql_delete := format('DELETE FROM public.%I WHERE %I = $1', p_table_name, p_parent_column);
  EXECUTE sql_delete USING p_parent_id;
  
  -- Insert new mappings if any provided
  IF array_length(p_child_ids, 1) > 0 THEN
    FOREACH child_id IN ARRAY p_child_ids
    LOOP
      sql_insert := format('INSERT INTO public.%I (%I, %I) VALUES ($1, $2)', 
                          p_table_name, p_parent_column, p_child_column);
      EXECUTE sql_insert USING p_parent_id, child_id;
    END LOOP;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_teacher_teaching_styles(p_teacher_info_id bigint, p_teaching_style_ids bigint[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete existing mappings for this teacher
  DELETE FROM public.teacher_teaching_style_map 
  WHERE teacher_info_id = p_teacher_info_id;
  
  -- Insert new mappings if any provided
  IF array_length(p_teaching_style_ids, 1) > 0 THEN
    INSERT INTO public.teacher_teaching_style_map (teacher_info_id, teaching_style_id)
    SELECT p_teacher_info_id, unnest(p_teaching_style_ids);
  END IF;
END;
$function$;

-- =========================
-- RLS enablement per table
-- (enable where policies exist)
-- =========================

-- Admin and user related
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plan_status ENABLE ROW LEVEL SECURITY;

-- Course related
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_material_publishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_material_structure_only ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_section ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Generation related
ALTER TABLE public.generation_status_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_attrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_format_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_section ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_generation_formats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_generation_format_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_generation_format_cowork_type_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_generation_format_teaching_style_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_attrs_cowork_type_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_attrs_teaching_style_map ENABLE ROW LEVEL SECURITY;

-- Selection and styles
ALTER TABLE public.format_selection_attrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.format_selection_request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.format_selection_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.format_selection_attrs_cowork_type_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.format_selection_attrs_teaching_style_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cowork_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teaching_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.style_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.formatting_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_course_type_course_material_publisher_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_teaching_style_map ENABLE ROW LEVEL SECURITY;

-- Billing and payments
ALTER TABLE public.payment_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_histories ENABLE ROW LEVEL SECURITY;

-- Help requests
ALTER TABLE public.help_request_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;

-- =========================
-- Policies per table
-- =========================

-- admin_users
DROP POLICY IF EXISTS "Super admins can approve and modify admin_level" ON public.admin_users;
CREATE POLICY "Super admins can approve and modify admin_level" ON public.admin_users FOR UPDATE USING (is_super_admin()) WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Super admins can create admin users" ON public.admin_users;
CREATE POLICY "Super admins can create admin users" ON public.admin_users FOR INSERT WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Super admins can delete admin users" ON public.admin_users;
CREATE POLICY "Super admins can delete admin users" ON public.admin_users FOR DELETE USING (is_super_admin());

DROP POLICY IF EXISTS "Users can view their own admin status" ON public.admin_users;
CREATE POLICY "Users can view their own admin status" ON public.admin_users FOR SELECT USING (auth.uid() = user_id);

-- course_material_publishers
DROP POLICY IF EXISTS "Admin users can manage course_material_publishers" ON public.course_material_publishers;
CREATE POLICY "Admin users can manage course_material_publishers" ON public.course_material_publishers FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.course_material_publishers;
CREATE POLICY "Enable read access for authenticated users" ON public.course_material_publishers FOR SELECT USING (auth.role() = 'authenticated'::text);

-- course_material_structure_only
DROP POLICY IF EXISTS "Authenticated users can read course_material_structure_only" ON public.course_material_structure_only;
CREATE POLICY "Authenticated users can read course_material_structure_only" ON public.course_material_structure_only FOR SELECT USING (auth.role() = 'authenticated'::text);

-- course_materials
DROP POLICY IF EXISTS "Admin users can manage course_materials" ON public.course_materials;
CREATE POLICY "Admin users can manage course_materials" ON public.course_materials FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "Enable read access for authenticated users on course_materials" ON public.course_materials;
CREATE POLICY "Enable read access for authenticated users on course_materials" ON public.course_materials FOR SELECT USING (auth.role() = 'authenticated'::text);

-- course_section
DROP POLICY IF EXISTS "Admins can manage course_section" ON public.course_section;
CREATE POLICY "Admins can manage course_section" ON public.course_section AS RESTRICTIVE FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

-- course_semesters
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.course_semesters;
CREATE POLICY "Enable read access for authenticated users" ON public.course_semesters FOR SELECT USING (auth.role() = 'authenticated'::text);

-- course_types
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.course_types;
CREATE POLICY "Enable read access for authenticated users" ON public.course_types FOR SELECT USING (auth.role() = 'authenticated'::text);

-- courses
DROP POLICY IF EXISTS "Admin users can manage courses" ON public.courses;
CREATE POLICY "Admin users can manage courses" ON public.courses FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "Enable read access for authenticated users on courses" ON public.courses;
CREATE POLICY "Enable read access for authenticated users on courses" ON public.courses FOR SELECT USING (auth.role() = 'authenticated'::text);

-- cowork_types
DROP POLICY IF EXISTS "Admin users can read cowork_types" ON public.cowork_types;
CREATE POLICY "Admin users can read cowork_types" ON public.cowork_types FOR SELECT USING (is_admin_user());

DROP POLICY IF EXISTS "Enable read access for authenticated users on cowork_types" ON public.cowork_types;
CREATE POLICY "Enable read access for authenticated users on cowork_types" ON public.cowork_types FOR SELECT USING (auth.role() = 'authenticated'::text);

-- format_selection_attrs
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.format_selection_attrs;
CREATE POLICY "Enable insert for users based on user_id" ON public.format_selection_attrs FOR INSERT WITH CHECK ((SELECT auth.uid() AS uid) = user_id);

DROP POLICY IF EXISTS "Enable read access for all users" ON public.format_selection_attrs;
CREATE POLICY "Enable read access for all users" ON public.format_selection_attrs FOR SELECT USING ((SELECT auth.uid() AS uid) = user_id);

-- format_selection_attrs_cowork_type_map
DROP POLICY IF EXISTS "fsactm_admin_all" ON public.format_selection_attrs_cowork_type_map;
CREATE POLICY "fsactm_admin_all" ON public.format_selection_attrs_cowork_type_map FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "fsactm_owner_delete" ON public.format_selection_attrs_cowork_type_map;
CREATE POLICY "fsactm_owner_delete" ON public.format_selection_attrs_cowork_type_map FOR DELETE USING (EXISTS ( SELECT 1 FROM format_selection_attrs f WHERE (f.format_selection_attrs_id = format_selection_attrs_cowork_type_map.format_selection_attrs_id AND f.user_id = auth.uid())));

DROP POLICY IF EXISTS "fsactm_owner_insert" ON public.format_selection_attrs_cowork_type_map;
CREATE POLICY "fsactm_owner_insert" ON public.format_selection_attrs_cowork_type_map FOR INSERT WITH CHECK (EXISTS ( SELECT 1 FROM format_selection_attrs f WHERE (f.format_selection_attrs_id = format_selection_attrs_cowork_type_map.format_selection_attrs_id AND f.user_id = auth.uid())));

DROP POLICY IF EXISTS "fsactm_owner_select" ON public.format_selection_attrs_cowork_type_map;
CREATE POLICY "fsactm_owner_select" ON public.format_selection_attrs_cowork_type_map FOR SELECT USING (EXISTS ( SELECT 1 FROM format_selection_attrs f WHERE (f.format_selection_attrs_id = format_selection_attrs_cowork_type_map.format_selection_attrs_id AND f.user_id = auth.uid())));

DROP POLICY IF EXISTS "fsactm_owner_update" ON public.format_selection_attrs_cowork_type_map;
CREATE POLICY "fsactm_owner_update" ON public.format_selection_attrs_cowork_type_map FOR UPDATE USING (EXISTS ( SELECT 1 FROM format_selection_attrs f WHERE (f.format_selection_attrs_id = format_selection_attrs_cowork_type_map.format_selection_attrs_id AND f.user_id = auth.uid()))) WITH CHECK (EXISTS ( SELECT 1 FROM format_selection_attrs f WHERE (f.format_selection_attrs_id = format_selection_attrs_cowork_type_map.format_selection_attrs_id AND f.user_id = auth.uid())));

-- format_selection_attrs_teaching_style_map
DROP POLICY IF EXISTS "fsatsm_admin_all" ON public.format_selection_attrs_teaching_style_map;
CREATE POLICY "fsatsm_admin_all" ON public.format_selection_attrs_teaching_style_map FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "fsatsm_owner_delete" ON public.format_selection_attrs_teaching_style_map;
CREATE POLICY "fsatsm_owner_delete" ON public.format_selection_attrs_teaching_style_map FOR DELETE USING (EXISTS ( SELECT 1 FROM format_selection_attrs f WHERE (f.format_selection_attrs_id = format_selection_attrs_teaching_style_map.format_selection_attrs_id AND f.user_id = auth.uid())));

DROP POLICY IF EXISTS "fsatsm_owner_insert" ON public.format_selection_attrs_teaching_style_map;
CREATE POLICY "fsatsm_owner_insert" ON public.format_selection_attrs_teaching_style_map FOR INSERT WITH CHECK (EXISTS ( SELECT 1 FROM format_selection_attrs f WHERE (f.format_selection_attrs_id = format_selection_attrs_teaching_style_map.format_selection_attrs_id AND f.user_id = auth.uid())));

DROP POLICY IF EXISTS "fsatsm_owner_select" ON public.format_selection_attrs_teaching_style_map;
CREATE POLICY "fsatsm_owner_select" ON public.format_selection_attrs_teaching_style_map FOR SELECT USING (EXISTS ( SELECT 1 FROM format_selection_attrs f WHERE (f.format_selection_attrs_id = format_selection_attrs_teaching_style_map.format_selection_attrs_id AND f.user_id = auth.uid())));

DROP POLICY IF EXISTS "fsatsm_owner_update" ON public.format_selection_attrs_teaching_style_map;
CREATE POLICY "fsatsm_owner_update" ON public.format_selection_attrs_teaching_style_map FOR UPDATE USING (EXISTS ( SELECT 1 FROM format_selection_attrs f WHERE (f.format_selection_attrs_id = format_selection_attrs_teaching_style_map.format_selection_attrs_id AND f.user_id = auth.uid()))) WITH CHECK (EXISTS ( SELECT 1 FROM format_selection_attrs f WHERE (f.format_selection_attrs_id = format_selection_attrs_teaching_style_map.format_selection_attrs_id AND f.user_id = auth.uid())));

-- format_selection_request_messages
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.format_selection_request_messages;
CREATE POLICY "Enable insert for users based on user_id" ON public.format_selection_request_messages FOR INSERT WITH CHECK ((SELECT auth.uid() AS uid) = user_id);

DROP POLICY IF EXISTS "Users can view their own format_selection_request_messages" ON public.format_selection_request_messages;
CREATE POLICY "Users can view their own format_selection_request_messages" ON public.format_selection_request_messages FOR SELECT USING (auth.uid() = user_id);

-- format_selection_responses
DROP POLICY IF EXISTS "Admins can manage format_selection_responses" ON public.format_selection_responses;
CREATE POLICY "Admins can manage format_selection_responses" ON public.format_selection_responses FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

-- formatting_info
DROP POLICY IF EXISTS "Super admins can manage formatting_info" ON public.formatting_info;
CREATE POLICY "Super admins can manage formatting_info" ON public.formatting_info FOR ALL USING (EXISTS ( SELECT 1 FROM admin_users au WHERE (au.user_id = auth.uid() AND au.is_approved = true AND au.admin_level = 'super'::text)));

-- generation_attrs
DROP POLICY IF EXISTS "Enable read access for their requests" ON public.generation_attrs;
CREATE POLICY "Enable read access for their requests" ON public.generation_attrs FOR SELECT USING ((SELECT auth.uid() AS uid) = user_id);

DROP POLICY IF EXISTS "Users can insert their own generation_attrs" ON public.generation_attrs;
CREATE POLICY "Users can insert their own generation_attrs" ON public.generation_attrs FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own generation_attrs" ON public.generation_attrs;
CREATE POLICY "Users can update their own generation_attrs" ON public.generation_attrs FOR UPDATE USING (auth.uid() = user_id);

-- generation_attrs_cowork_type_map
DROP POLICY IF EXISTS "gactm_admin_all" ON public.generation_attrs_cowork_type_map;
CREATE POLICY "gactm_admin_all" ON public.generation_attrs_cowork_type_map FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "gactm_owner_delete" ON public.generation_attrs_cowork_type_map;
CREATE POLICY "gactm_owner_delete" ON public.generation_attrs_cowork_type_map FOR DELETE USING (EXISTS ( SELECT 1 FROM generation_attrs ga WHERE (ga.generation_attrs_id = generation_attrs_cowork_type_map.generation_attrs_id AND ga.user_id = auth.uid())));

DROP POLICY IF EXISTS "gactm_owner_insert" ON public.generation_attrs_cowork_type_map;
CREATE POLICY "gactm_owner_insert" ON public.generation_attrs_cowork_type_map FOR INSERT WITH CHECK (EXISTS ( SELECT 1 FROM generation_attrs ga WHERE (ga.generation_attrs_id = generation_attrs_cowork_type_map.generation_attrs_id AND ga.user_id = auth.uid())));

DROP POLICY IF EXISTS "gactm_owner_select" ON public.generation_attrs_cowork_type_map;
CREATE POLICY "gactm_owner_select" ON public.generation_attrs_cowork_type_map FOR SELECT USING (EXISTS ( SELECT 1 FROM generation_attrs ga WHERE (ga.generation_attrs_id = generation_attrs_cowork_type_map.generation_attrs_id AND ga.user_id = auth.uid())));

DROP POLICY IF EXISTS "gactm_owner_update" ON public.generation_attrs_cowork_type_map;
CREATE POLICY "gactm_owner_update" ON public.generation_attrs_cowork_type_map FOR UPDATE USING (EXISTS ( SELECT 1 FROM generation_attrs ga WHERE (ga.generation_attrs_id = generation_attrs_cowork_type_map.generation_attrs_id AND ga.user_id = auth.uid()))) WITH CHECK (EXISTS ( SELECT 1 FROM generation_attrs ga WHERE (ga.generation_attrs_id = generation_attrs_cowork_type_map.generation_attrs_id AND ga.user_id = auth.uid())));

-- generation_attrs_teaching_style_map
DROP POLICY IF EXISTS "gatsm_admin_all" ON public.generation_attrs_teaching_style_map;
CREATE POLICY "gatsm_admin_all" ON public.generation_attrs_teaching_style_map FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "gatsm_owner_delete" ON public.generation_attrs_teaching_style_map;
CREATE POLICY "gatsm_owner_delete" ON public.generation_attrs_teaching_style_map FOR DELETE USING (EXISTS ( SELECT 1 FROM generation_attrs ga WHERE (ga.generation_attrs_id = generation_attrs_teaching_style_map.generation_attrs_id AND ga.user_id = auth.uid())));

DROP POLICY IF EXISTS "gatsm_owner_insert" ON public.generation_attrs_teaching_style_map;
CREATE POLICY "gatsm_owner_insert" ON public.generation_attrs_teaching_style_map FOR INSERT WITH CHECK (EXISTS ( SELECT 1 FROM generation_attrs ga WHERE (ga.generation_attrs_id = generation_attrs_teaching_style_map.generation_attrs_id AND ga.user_id = auth.uid())));

DROP POLICY IF EXISTS "gatsm_owner_select" ON public.generation_attrs_teaching_style_map;
CREATE POLICY "gatsm_owner_select" ON public.generation_attrs_teaching_style_map FOR SELECT USING (EXISTS ( SELECT 1 FROM generation_attrs ga WHERE (ga.generation_attrs_id = generation_attrs_teaching_style_map.generation_attrs_id AND ga.user_id = auth.uid())));

DROP POLICY IF EXISTS "gatsm_owner_update" ON public.generation_attrs_teaching_style_map;
CREATE POLICY "gatsm_owner_update" ON public.generation_attrs_teaching_style_map FOR UPDATE USING (EXISTS ( SELECT 1 FROM generation_attrs ga WHERE (ga.generation_attrs_id = generation_attrs_teaching_style_map.generation_attrs_id AND ga.user_id = auth.uid()))) WITH CHECK (EXISTS ( SELECT 1 FROM generation_attrs ga WHERE (ga.generation_attrs_id = generation_attrs_teaching_style_map.generation_attrs_id AND ga.user_id = auth.uid())));

-- generation_format_type
DROP POLICY IF EXISTS "Admin users can read generation_format_type" ON public.generation_format_type;
CREATE POLICY "Admin users can read generation_format_type" ON public.generation_format_type FOR SELECT USING (is_admin_user());

-- generation_formats
DROP POLICY IF EXISTS "Admin users can manage generation_formats" ON public.generation_formats;
CREATE POLICY "Admin users can manage generation_formats" ON public.generation_formats FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

-- generation_requests
DROP POLICY IF EXISTS "Users can insert their own generation_requests" ON public.generation_requests;
CREATE POLICY "Users can insert their own generation_requests" ON public.generation_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read their own generation_requests" ON public.generation_requests;
CREATE POLICY "Users can read their own generation_requests" ON public.generation_requests FOR SELECT USING (auth.uid() = user_id);

-- generation_responses
DROP POLICY IF EXISTS "Admins can manage generation_responses" ON public.generation_responses;
CREATE POLICY "Admins can manage generation_responses" ON public.generation_responses FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "Users can view their generation_responses" ON public.generation_responses;
CREATE POLICY "Users can view their generation_responses" ON public.generation_responses FOR SELECT USING (is_admin_user() OR (auth.uid() = user_id) OR (EXISTS ( SELECT 1 FROM generation_attrs ga WHERE (ga.generation_attrs_id = generation_responses.generation_attrs_id AND ga.user_id = auth.uid()))));

DROP POLICY IF EXISTS "users can insert their own response" ON public.generation_responses;
CREATE POLICY "users can insert their own response" ON public.generation_responses FOR INSERT WITH CHECK (auth.uid() = user_id);

-- generation_section
DROP POLICY IF EXISTS "Admins can manage generation_section" ON public.generation_section;
CREATE POLICY "Admins can manage generation_section" ON public.generation_section FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

-- generation_status_types
DROP POLICY IF EXISTS "All users can read generation_status_types" ON public.generation_status_types;
CREATE POLICY "All users can read generation_status_types" ON public.generation_status_types FOR SELECT USING (auth.role() = 'authenticated'::text);

-- help_request_types
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.help_request_types;
CREATE POLICY "Enable read access for authenticated users" ON public.help_request_types FOR SELECT USING (auth.role() = 'authenticated'::text);

-- help_requests
DROP POLICY IF EXISTS "help_requests_admin_all" ON public.help_requests;
CREATE POLICY "help_requests_admin_all" ON public.help_requests FOR ALL USING (is_approved_admin_user()) WITH CHECK (is_approved_admin_user());

DROP POLICY IF EXISTS "help_requests_insert_own_with_ratelimit" ON public.help_requests;
CREATE POLICY "help_requests_insert_own_with_ratelimit" ON public.help_requests FOR INSERT WITH CHECK ((auth.uid() = user_id) AND check_help_request_rate_limit());

DROP POLICY IF EXISTS "help_requests_select_own" ON public.help_requests;
CREATE POLICY "help_requests_select_own" ON public.help_requests FOR SELECT USING (auth.uid() = user_id);

-- payment_histories
DROP POLICY IF EXISTS "Approved admins can manage payment_histories" ON public.payment_histories;
CREATE POLICY "Approved admins can manage payment_histories" ON public.payment_histories FOR ALL USING (is_approved_admin_user()) WITH CHECK (is_approved_admin_user());

DROP POLICY IF EXISTS "Users can view their own payment_histories" ON public.payment_histories;
CREATE POLICY "Users can view their own payment_histories" ON public.payment_histories FOR SELECT USING (auth.uid() = user_id);

-- payment_status
DROP POLICY IF EXISTS "All users can read payment_status" ON public.payment_status;
CREATE POLICY "All users can read payment_status" ON public.payment_status FOR SELECT USING (auth.role() = 'authenticated'::text);

-- plans
DROP POLICY IF EXISTS "All users can read plans" ON public.plans;
CREATE POLICY "All users can read plans" ON public.plans FOR SELECT USING (auth.role() = 'authenticated'::text);

-- profiles
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

-- raw_course_materials
DROP POLICY IF EXISTS "Admin users can manage raw_course_materials" ON public.raw_course_materials;
CREATE POLICY "Admin users can manage raw_course_materials" ON public.raw_course_materials FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "Authenticated users can read raw_course_materials" ON public.raw_course_materials;
CREATE POLICY "Authenticated users can read raw_course_materials" ON public.raw_course_materials FOR SELECT USING (auth.role() = 'authenticated'::text);

-- raw_generation_format_cowork_type_map
DROP POLICY IF EXISTS "rgfct_admin_all" ON public.raw_generation_format_cowork_type_map;
CREATE POLICY "rgfct_admin_all" ON public.raw_generation_format_cowork_type_map FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "rgfct_owner_delete" ON public.raw_generation_format_cowork_type_map;
CREATE POLICY "rgfct_owner_delete" ON public.raw_generation_format_cowork_type_map FOR DELETE USING (EXISTS ( SELECT 1 FROM raw_generation_formats r WHERE (r.raw_generation_format_id = raw_generation_format_cowork_type_map.raw_generation_format_id AND r.uploaded_user_id = auth.uid())));

DROP POLICY IF EXISTS "rgfct_owner_insert" ON public.raw_generation_format_cowork_type_map;
CREATE POLICY "rgfct_owner_insert" ON public.raw_generation_format_cowork_type_map FOR INSERT WITH CHECK (EXISTS ( SELECT 1 FROM raw_generation_formats r WHERE (r.raw_generation_format_id = raw_generation_format_cowork_type_map.raw_generation_format_id AND r.uploaded_user_id = auth.uid())));

DROP POLICY IF EXISTS "rgfct_owner_select" ON public.raw_generation_format_cowork_type_map;
CREATE POLICY "rgfct_owner_select" ON public.raw_generation_format_cowork_type_map FOR SELECT USING (EXISTS ( SELECT 1 FROM raw_generation_formats r WHERE (r.raw_generation_format_id = raw_generation_format_cowork_type_map.raw_generation_format_id AND r.uploaded_user_id = auth.uid())));

DROP POLICY IF EXISTS "rgfct_owner_update" ON public.raw_generation_format_cowork_type_map;
CREATE POLICY "rgfct_owner_update" ON public.raw_generation_format_cowork_type_map FOR UPDATE USING (EXISTS ( SELECT 1 FROM raw_generation_formats r WHERE (r.raw_generation_format_id = raw_generation_format_cowork_type_map.raw_generation_format_id AND r.uploaded_user_id = auth.uid()))) WITH CHECK (EXISTS ( SELECT 1 FROM raw_generation_formats r WHERE (r.raw_generation_format_id = raw_generation_format_cowork_type_map.raw_generation_format_id AND r.uploaded_user_id = auth.uid())));

-- raw_generation_format_stats
DROP POLICY IF EXISTS "Admins can manage raw_generation_format_stats" ON public.raw_generation_format_stats;
CREATE POLICY "Admins can manage raw_generation_format_stats" ON public.raw_generation_format_stats FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

-- raw_generation_format_teaching_style_map
DROP POLICY IF EXISTS "rgfts_admin_all" ON public.raw_generation_format_teaching_style_map;
CREATE POLICY "rgfts_admin_all" ON public.raw_generation_format_teaching_style_map FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "rgfts_owner_delete" ON public.raw_generation_format_teaching_style_map;
CREATE POLICY "rgfts_owner_delete" ON public.raw_generation_format_teaching_style_map FOR DELETE USING (EXISTS ( SELECT 1 FROM raw_generation_formats r WHERE (r.raw_generation_format_id = raw_generation_format_teaching_style_map.raw_generation_format_id AND r.uploaded_user_id = auth.uid())));

DROP POLICY IF EXISTS "rgfts_owner_insert" ON public.raw_generation_format_teaching_style_map;
CREATE POLICY "rgfts_owner_insert" ON public.raw_generation_format_teaching_style_map FOR INSERT WITH CHECK (EXISTS ( SELECT 1 FROM raw_generation_formats r WHERE (r.raw_generation_format_id = raw_generation_format_teaching_style_map.raw_generation_format_id AND r.uploaded_user_id = auth.uid())));

DROP POLICY IF EXISTS "rgfts_owner_select" ON public.raw_generation_format_teaching_style_map;
CREATE POLICY "rgfts_owner_select" ON public.raw_generation_format_teaching_style_map FOR SELECT USING (EXISTS ( SELECT 1 FROM raw_generation_formats r WHERE (r.raw_generation_format_id = raw_generation_format_teaching_style_map.raw_generation_format_id AND r.uploaded_user_id = auth.uid())));

DROP POLICY IF EXISTS "rgfts_owner_update" ON public.raw_generation_format_teaching_style_map;
CREATE POLICY "rgfts_owner_update" ON public.raw_generation_format_teaching_style_map FOR UPDATE USING (EXISTS ( SELECT 1 FROM raw_generation_formats r WHERE (r.raw_generation_format_id = raw_generation_format_teaching_style_map.raw_generation_format_id AND r.uploaded_user_id = auth.uid()))) WITH CHECK (EXISTS ( SELECT 1 FROM raw_generation_formats r WHERE (r.raw_generation_format_id = raw_generation_format_teaching_style_map.raw_generation_format_id AND r.uploaded_user_id = auth.uid())));

-- schools
DROP POLICY IF EXISTS "Authenticated users can read schools" ON public.schools;
CREATE POLICY "Authenticated users can read schools" ON public.schools FOR SELECT USING (auth.role() = 'authenticated'::text);

-- style_info
DROP POLICY IF EXISTS "Super admins can manage style_info" ON public.style_info;
CREATE POLICY "Super admins can manage style_info" ON public.style_info FOR ALL USING (EXISTS ( SELECT 1 FROM admin_users au WHERE (au.user_id = auth.uid() AND au.is_approved = true AND au.admin_level = 'super'::text)));

-- teacher_course_type_course_material_publisher_map
DROP POLICY IF EXISTS "tctcm_admin_all" ON public.teacher_course_type_course_material_publisher_map;
CREATE POLICY "tctcm_admin_all" ON public.teacher_course_type_course_material_publisher_map FOR ALL USING (is_admin_user()) WITH CHECK (is_admin_user());

DROP POLICY IF EXISTS "tctcm_owner_delete" ON public.teacher_course_type_course_material_publisher_map;
CREATE POLICY "tctcm_owner_delete" ON public.teacher_course_type_course_material_publisher_map FOR DELETE USING (EXISTS ( SELECT 1 FROM teacher_info ti WHERE (ti.teacher_info_id = teacher_course_type_course_material_publisher_map.teacher_info_id AND ti.user_id = auth.uid())));

DROP POLICY IF EXISTS "tctcm_owner_insert" ON public.teacher_course_type_course_material_publisher_map;
CREATE POLICY "tctcm_owner_insert" ON public.teacher_course_type_course_material_publisher_map FOR INSERT WITH CHECK (EXISTS ( SELECT 1 FROM teacher_info ti WHERE (ti.teacher_info_id = teacher_course_type_course_material_publisher_map.teacher_info_id AND ti.user_id = auth.uid())));

DROP POLICY IF EXISTS "tctcm_owner_select" ON public.teacher_course_type_course_material_publisher_map;
CREATE POLICY "tctcm_owner_select" ON public.teacher_course_type_course_material_publisher_map FOR SELECT USING (EXISTS ( SELECT 1 FROM teacher_info ti WHERE (ti.teacher_info_id = teacher_course_type_course_material_publisher_map.teacher_info_id AND ti.user_id = auth.uid())));

DROP POLICY IF EXISTS "tctcm_owner_update" ON public.teacher_course_type_course_material_publisher_map;
CREATE POLICY "tctcm_owner_update" ON public.teacher_course_type_course_material_publisher_map FOR UPDATE USING (EXISTS ( SELECT 1 FROM teacher_info ti WHERE (ti.teacher_info_id = teacher_course_type_course_material_publisher_map.teacher_info_id AND ti.user_id = auth.uid()))) WITH CHECK (EXISTS ( SELECT 1 FROM teacher_info ti WHERE (ti.teacher_info_id = teacher_course_type_course_material_publisher_map.teacher_info_id AND ti.user_id = auth.uid())));

-- teacher_info
DROP POLICY IF EXISTS "Users can manage their own teacher_info" ON public.teacher_info;
CREATE POLICY "Users can manage their own teacher_info" ON public.teacher_info FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "teacher_info_admin_delete_all" ON public.teacher_info;
CREATE POLICY "teacher_info_admin_delete_all" ON public.teacher_info FOR DELETE USING (is_approved_admin_user());

DROP POLICY IF EXISTS "teacher_info_admin_insert_all" ON public.teacher_info;
CREATE POLICY "teacher_info_admin_insert_all" ON public.teacher_info FOR INSERT WITH CHECK (is_approved_admin_user());

-- NOTE: teacher_info additional policies may exist; ensure to sync any missing ones if added later.

-- =========================
-- Public triggers
-- =========================

-- auto update updated_at
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- generation_responses ownership helper (deduplicated)
DROP TRIGGER IF EXISTS set_generation_response_user_id_secure_trigger ON public.generation_responses;
CREATE TRIGGER set_generation_response_user_id_secure_trigger
BEFORE INSERT ON public.generation_responses
FOR EACH ROW EXECUTE FUNCTION public.set_generation_response_user_id_secure();

-- help_requests owner enforcement
DROP TRIGGER IF EXISTS trg_set_help_request_user_id ON public.help_requests;
CREATE TRIGGER trg_set_help_request_user_id
BEFORE INSERT ON public.help_requests
FOR EACH ROW EXECUTE FUNCTION public.set_help_request_user_id_secure();

-- generation_requests owner enforcement
DROP TRIGGER IF EXISTS trg_set_generation_request_user_id ON public.generation_requests;
CREATE TRIGGER trg_set_generation_request_user_id
BEFORE INSERT ON public.generation_requests
FOR EACH ROW EXECUTE FUNCTION public.set_current_user_id_secure();

-- format_selection_request_messages owner enforcement
DROP TRIGGER IF EXISTS trg_set_format_selection_request_message_user_id ON public.format_selection_request_messages;
CREATE TRIGGER trg_set_format_selection_request_message_user_id
BEFORE INSERT ON public.format_selection_request_messages
FOR EACH ROW EXECUTE FUNCTION public.set_current_user_id_secure();

COMMIT;

-- =========================
-- Edge Functions (reference)
-- =========================
-- The following edge functions exist in the repo (see supabase/functions/*):
-- - upload-to-s3 (verify_jwt = true)
-- - download-from-s3 (verify_jwt = true)
-- - request-format-recommendation (verify_jwt = default)
-- - request-generation (verify_jwt = default)
-- These are managed as TypeScript in supabase/functions and configured in supabase/config.toml.
