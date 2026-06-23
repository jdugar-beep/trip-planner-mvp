create table if not exists public.places_global_usage (
  usage_month date primary key,
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.places_global_usage enable row level security;

drop trigger if exists set_places_global_usage_updated_at on public.places_global_usage;
create trigger set_places_global_usage_updated_at
before update on public.places_global_usage
for each row execute function public.set_updated_at();
