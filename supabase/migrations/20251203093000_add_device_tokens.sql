-- Create device_tokens table for push notifications
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  platform text not null check (platform in ('android','ios','web')),
  student_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.device_tokens enable row level security;

-- Allow anyone (anon) to insert a token (no auth in this app)
create policy device_tokens_insert on public.device_tokens
  for insert
  to anon
  with check (true);

-- Allow anyone to update last_seen/updated by token
create policy device_tokens_update on public.device_tokens
  for update
  to anon
  using (true)
  with check (true);

-- Allow read for anon (optional, helps debugging)
create policy device_tokens_select on public.device_tokens
  for select
  to anon
  using (true);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger device_tokens_set_updated_at
  before update on public.device_tokens
  for each row
  execute procedure public.set_updated_at();
