create table if not exists cache_entries (
  key        text primary key,
  payload    jsonb       not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists cache_entries_expires_at_idx
  on cache_entries (expires_at);

-- RLS on with no policies denies the anonymous key entirely.
-- Only the Edge Function, using the service role key, may read or write.
alter table cache_entries enable row level security;
