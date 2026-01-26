create table if not exists public.delivery_areas (
  id uuid default gen_random_uuid() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  name text not null,
  radius_meters integer not null default 1000,
  fee decimal(10,2) not null default 0,
  center_lat double precision not null,
  center_lng double precision not null,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.delivery_areas enable row level security;

create policy "Delivery areas are viewable by everyone"
  on public.delivery_areas for select
  using (true);

create policy "delivery_areas_insert_policy"
  on public.delivery_areas for insert
  with check (
    -- Allow if user is admin/manager of the store
    exists (
      select 1 from public.stores
      where id = delivery_areas.store_id
      and franchisee_user_id = auth.uid()
    )
    or
    -- Allow if user is franchisee_master (handled by app logic usually, but here checking role)
    (auth.jwt() ->> 'role' = 'service_role')
  );

create policy "delivery_areas_update_policy"
  on public.delivery_areas for update
  using (
    exists (
      select 1 from public.stores
      where id = delivery_areas.store_id
      and franchisee_user_id = auth.uid()
    )
  );

create policy "delivery_areas_delete_policy"
  on public.delivery_areas for delete
  using (
    exists (
      select 1 from public.stores
      where id = delivery_areas.store_id
      and franchisee_user_id = auth.uid()
    )
  );
