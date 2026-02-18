-- ─── Financial Goals (Metas) ───
create table if not exists public.financial_goals (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    goal_type text not null check (goal_type in ('revenue', 'expense_reduction', 'profit', 'custom')),
    target_value numeric not null default 0,
    current_value numeric not null default 0,
    start_date date not null,
    end_date date not null,
    distribution_center_id uuid references public.distribution_centers(id),
    status text not null default 'active' check (status in ('active', 'completed', 'expired', 'cancelled')),
    created_by uuid references auth.users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Enable RLS
alter table public.financial_goals enable row level security;

-- RLS policies
create policy "financial_goals_select" on public.financial_goals
    for select using (true);

create policy "financial_goals_insert" on public.financial_goals
    for insert with check (true);

create policy "financial_goals_update" on public.financial_goals
    for update using (true);

create policy "financial_goals_delete" on public.financial_goals
    for delete using (true);
