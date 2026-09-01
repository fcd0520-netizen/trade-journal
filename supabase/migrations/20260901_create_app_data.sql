create table if not exists public.app_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_key text not null,
  payload jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, storage_key)
);

alter table public.app_data enable row level security;

create policy "Users can read their own app data"
on public.app_data for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own app data"
on public.app_data for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own app data"
on public.app_data for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own app data"
on public.app_data for delete
to authenticated
using ((select auth.uid()) = user_id);

