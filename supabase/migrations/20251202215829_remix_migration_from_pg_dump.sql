CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: admin_password; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_password (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    password text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id text NOT NULL,
    message text NOT NULL,
    sender_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT comments_sender_type_check CHECK ((sender_type = ANY (ARRAY['student'::text, 'teacher'::text])))
);


--
-- Name: grades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id text NOT NULL,
    subject text NOT NULL,
    grade integer NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by text,
    CONSTRAINT grades_grade_check CHECK (((grade >= 0) AND (grade <= 100)))
);


--
-- Name: news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.news (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: school_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_phone text NOT NULL,
    school_admin_text text DEFAULT 'Contact School Admin & Registration'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    student_id text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    photo_url text,
    locked boolean DEFAULT false
);


--
-- Name: teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teachers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    subject text NOT NULL,
    photo_url text,
    created_at timestamp with time zone DEFAULT now(),
    telegram text
);


--
-- Name: admin_password admin_password_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_password
    ADD CONSTRAINT admin_password_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: grades grades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_pkey PRIMARY KEY (id);


--
-- Name: grades grades_student_id_subject_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_student_id_subject_key UNIQUE (student_id, subject);


--
-- Name: news news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_pkey PRIMARY KEY (id);


--
-- Name: school_settings school_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_settings
    ADD CONSTRAINT school_settings_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (student_id);


--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- Name: idx_comments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_created_at ON public.comments USING btree (created_at);


--
-- Name: idx_comments_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_student_id ON public.comments USING btree (student_id);


--
-- Name: idx_grades_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_grades_student_id ON public.grades USING btree (student_id);


--
-- Name: grades update_grades_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON public.grades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: news update_news_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: grades grades_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grades
    ADD CONSTRAINT grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(student_id) ON DELETE CASCADE;


--
-- Name: grades Allow public delete to grades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete to grades" ON public.grades FOR DELETE USING (true);


--
-- Name: news Allow public delete to news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete to news" ON public.news FOR DELETE USING (true);


--
-- Name: students Allow public delete to students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete to students" ON public.students FOR DELETE USING (true);


--
-- Name: teachers Allow public delete to teachers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public delete to teachers" ON public.teachers FOR DELETE USING (true);


--
-- Name: comments Allow public insert to comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert to comments" ON public.comments FOR INSERT WITH CHECK (true);


--
-- Name: grades Allow public insert to grades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert to grades" ON public.grades FOR INSERT WITH CHECK (true);


--
-- Name: news Allow public insert to news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert to news" ON public.news FOR INSERT WITH CHECK (true);


--
-- Name: school_settings Allow public insert to school_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert to school_settings" ON public.school_settings FOR INSERT WITH CHECK (true);


--
-- Name: students Allow public insert to students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert to students" ON public.students FOR INSERT WITH CHECK (true);


--
-- Name: teachers Allow public insert to teachers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public insert to teachers" ON public.teachers FOR INSERT WITH CHECK (true);


--
-- Name: admin_password Allow public read access to admin_password; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to admin_password" ON public.admin_password FOR SELECT USING (true);


--
-- Name: comments Allow public read access to comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to comments" ON public.comments FOR SELECT USING (true);


--
-- Name: grades Allow public read access to grades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to grades" ON public.grades FOR SELECT USING (true);


--
-- Name: news Allow public read access to news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to news" ON public.news FOR SELECT USING (true);


--
-- Name: school_settings Allow public read access to school_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to school_settings" ON public.school_settings FOR SELECT USING (true);


--
-- Name: students Allow public read access to students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to students" ON public.students FOR SELECT USING (true);


--
-- Name: teachers Allow public read access to teachers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public read access to teachers" ON public.teachers FOR SELECT USING (true);


--
-- Name: admin_password Allow public update to admin_password; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update to admin_password" ON public.admin_password FOR UPDATE USING (true);


--
-- Name: grades Allow public update to grades; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update to grades" ON public.grades FOR UPDATE USING (true);


--
-- Name: news Allow public update to news; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update to news" ON public.news FOR UPDATE USING (true);


--
-- Name: school_settings Allow public update to school_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update to school_settings" ON public.school_settings FOR UPDATE USING (true);


--
-- Name: students Allow public update to students; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update to students" ON public.students FOR UPDATE USING (true);


--
-- Name: teachers Allow public update to teachers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public update to teachers" ON public.teachers FOR UPDATE USING (true);


--
-- Name: admin_password; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_password ENABLE ROW LEVEL SECURITY;

--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- Name: grades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

--
-- Name: news; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

--
-- Name: school_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: students; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

--
-- Name: teachers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


