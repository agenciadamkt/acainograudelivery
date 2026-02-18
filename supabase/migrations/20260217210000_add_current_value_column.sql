-- Add missing current_value column to financial_goals
alter table if exists public.financial_goals 
add column if not exists current_value numeric not null default 0;
