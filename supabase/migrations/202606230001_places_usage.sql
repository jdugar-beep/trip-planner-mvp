create table if not exists public.places_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.places_usage enable row level security;

drop policy if exists "Users can read own places usage" on public.places_usage;
create policy "Users can read own places usage"
  on public.places_usage
  for select
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists places_usage_set_updated_at on public.places_usage;
create trigger places_usage_set_updated_at
  before update on public.places_usage
  for each row
  execute function public.set_updated_at();
