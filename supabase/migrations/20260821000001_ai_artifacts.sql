-- Generated text, stored once per entity per persona per prompt version.
-- The prompt version sits in the primary key so that a reworded prompt
-- produces new rows beside the old ones instead of destroying them.
create table if not exists ai_dossiers (
  entity_type    text not null,
  entity_id      int  not null,
  persona        text not null,
  text           text not null,
  model          text not null,
  prompt_version int  not null default 1,
  created_at     timestamptz not null default now(),
  primary key (entity_type, entity_id, persona, prompt_version)
);

-- One row per caller per day per endpoint. Addresses are never stored: the
-- key is a salted SHA-256 digest. The global ceiling lives under the
-- reserved ip_hash '__global__', which no digest can collide with.
create table if not exists ai_usage (
  ip_hash  text not null,
  day      date not null,
  endpoint text not null,
  count    int  not null default 0,
  primary key (ip_hash, day, endpoint)
);

-- Counting in the database rather than in the function keeps the increment
-- atomic: two concurrent requests cannot both read 29 and both proceed.
create or replace function ai_usage_bump(
  p_ip_hash  text,
  p_endpoint text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into ai_usage (ip_hash, day, endpoint, count)
  values (p_ip_hash, current_date, p_endpoint, 1)
  on conflict (ip_hash, day, endpoint)
    do update set count = ai_usage.count + 1
  returning count into v_count;

  return v_count;
end;
$$;

-- RLS on with no policies denies the anonymous key entirely, exactly as
-- cache_entries does. Only the Edge Function, under the service role key,
-- reads or writes either table.
alter table ai_dossiers enable row level security;
alter table ai_usage    enable row level security;
