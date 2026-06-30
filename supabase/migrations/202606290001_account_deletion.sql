create or replace function public.delete_user_owned_data(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_trip_ids uuid[] := '{}';
  owned_item_ids uuid[] := '{}';
  owned_traveler_ids uuid[] := '{}';
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  select coalesce(array_agg(id), '{}')
    into owned_trip_ids
  from public.trips
  where owner_id = target_user_id;

  if array_length(owned_trip_ids, 1) is not null then
    select coalesce(array_agg(id), '{}')
      into owned_item_ids
    from public.planning_items
    where trip_id = any(owned_trip_ids);

    select coalesce(array_agg(id), '{}')
      into owned_traveler_ids
    from public.travelers
    where trip_id = any(owned_trip_ids);
  end if;

  if array_length(owned_item_ids, 1) is not null then
    delete from public.votes
    where planning_item_id = any(owned_item_ids);
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'votes'
      and column_name = 'user_id'
  ) then
    execute 'delete from public.votes where user_id = $1'
    using target_user_id;
  end if;

  if array_length(owned_traveler_ids, 1) is not null then
    delete from public.flights
    where traveler_id = any(owned_traveler_ids);
  end if;

  if array_length(owned_trip_ids, 1) is not null then
    delete from public.trip_invites
    where trip_id = any(owned_trip_ids);

    delete from public.trip_members
    where trip_id = any(owned_trip_ids);

    delete from public.hotels
    where trip_id = any(owned_trip_ids);

    delete from public.travelers
    where trip_id = any(owned_trip_ids);

    delete from public.planning_items
    where trip_id = any(owned_trip_ids);
  end if;

  delete from public.trip_invites
  where invited_by = target_user_id
     or invited_user_id = target_user_id;

  delete from public.trip_members
  where user_id = target_user_id;

  delete from public.follows
  where follower_id = target_user_id
     or following_id = target_user_id;

  delete from public.places_usage
  where user_id = target_user_id;

  delete from public.trips
  where owner_id = target_user_id;

  delete from public.profiles
  where id = target_user_id;
end;
$$;

revoke all on function public.delete_user_owned_data(uuid) from public;
grant execute on function public.delete_user_owned_data(uuid) to service_role;
