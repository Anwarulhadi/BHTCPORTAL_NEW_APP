CREATE TABLE IF NOT EXISTS public.modules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    file_url text NOT NULL,
    cover_url text,
    course_category text NOT NULL,
    sub_category text,
    is_visible boolean DEFAULT true,
    order_index integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public read access to modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Allow public insert to modules" ON public.modules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to modules" ON public.modules FOR UPDATE USING (true);
CREATE POLICY "Allow public delete to modules" ON public.modules FOR DELETE USING (true);
