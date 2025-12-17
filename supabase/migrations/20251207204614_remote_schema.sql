drop extension if exists "pg_net";

drop trigger if exists "device_tokens_set_updated_at" on "public"."device_tokens";

drop policy "Allow public update to comments" on "public"."comments";

drop policy "device_tokens_insert" on "public"."device_tokens";

drop policy "device_tokens_select" on "public"."device_tokens";

drop policy "device_tokens_update" on "public"."device_tokens";

revoke delete on table "public"."device_tokens" from "anon";

revoke insert on table "public"."device_tokens" from "anon";

revoke references on table "public"."device_tokens" from "anon";

revoke select on table "public"."device_tokens" from "anon";

revoke trigger on table "public"."device_tokens" from "anon";

revoke truncate on table "public"."device_tokens" from "anon";

revoke update on table "public"."device_tokens" from "anon";

revoke delete on table "public"."device_tokens" from "authenticated";

revoke insert on table "public"."device_tokens" from "authenticated";

revoke references on table "public"."device_tokens" from "authenticated";

revoke select on table "public"."device_tokens" from "authenticated";

revoke trigger on table "public"."device_tokens" from "authenticated";

revoke truncate on table "public"."device_tokens" from "authenticated";

revoke update on table "public"."device_tokens" from "authenticated";

revoke delete on table "public"."device_tokens" from "service_role";

revoke insert on table "public"."device_tokens" from "service_role";

revoke references on table "public"."device_tokens" from "service_role";

revoke select on table "public"."device_tokens" from "service_role";

revoke trigger on table "public"."device_tokens" from "service_role";

revoke truncate on table "public"."device_tokens" from "service_role";

revoke update on table "public"."device_tokens" from "service_role";

alter table "public"."device_tokens" drop constraint "device_tokens_platform_check";

alter table "public"."device_tokens" drop constraint "device_tokens_token_key";

alter table "public"."students" drop constraint "students_gender_check";

drop function if exists "public"."set_updated_at"();

alter table "public"."device_tokens" drop constraint "device_tokens_pkey";

drop index if exists "public"."device_tokens_pkey";

drop index if exists "public"."device_tokens_token_key";

drop index if exists "public"."grades_student_subject_key";

drop table "public"."device_tokens";

alter table "public"."comments" drop column "is_read";

alter table "public"."comments" add column "read_at" timestamp with time zone;

alter table "public"."grades" drop column "total";

alter table "public"."grades" add column "course_name" text not null default 'Cinematography'::text;

alter table "public"."grades" add column "full_mark" integer;

alter table "public"."grades" alter column "grade" set data type integer using "grade"::integer;

alter table "public"."student_profiles" add column "order_index" public.app_role;

alter table "public"."students" drop column "contact_info";

alter table "public"."students" drop column "gender";

alter table "public"."students" add column "course_name" text not null default 'Cinematography'::text;

alter table "public"."teachers" add column "display_order" integer;

CREATE INDEX comments_created_at_idx ON public.comments USING btree (created_at);

CREATE INDEX comments_sender_type_idx ON public.comments USING btree (sender_type);

CREATE INDEX comments_student_id_idx ON public.comments USING btree (student_id);

CREATE INDEX comments_unread_idx ON public.comments USING btree (read_at) WHERE (read_at IS NULL);

CREATE INDEX teachers_display_order_idx ON public.teachers USING btree (display_order);

alter table "public"."grades" add constraint "grades_grade_check" CHECK (((grade >= 0) AND (grade <= COALESCE(full_mark, 100)))) not valid;

alter table "public"."grades" validate constraint "grades_grade_check";

set check_function_bodies = off;

create or replace view "public"."unread_student_comments" as  SELECT student_id,
    count(*) AS unread_count
   FROM public.comments
  WHERE ((sender_type = 'student'::text) AND (read_at IS NULL))
  GROUP BY student_id;


CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;


