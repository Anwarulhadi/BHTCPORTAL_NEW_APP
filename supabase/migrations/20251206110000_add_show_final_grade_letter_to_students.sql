alter table public.students
  add column if not exists show_final_grade_letter boolean not null default false;

comment on column public.students.show_final_grade_letter is 'Controls whether a student can see their final grade letter.';
