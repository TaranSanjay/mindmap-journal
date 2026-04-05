-- ============================================================
-- MindMap Journal — Database Schema
-- Run this in Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── journal_entries ──────────────────────────────────────────
create table if not exists public.journal_entries (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  content        text not null,                  -- full session transcript
  emotion_scores jsonb not null default '{}',    -- {joy,calm,sadness,anxiety,anger} each 1–10
  composite_score numeric(4,2) not null default 5,
  turn_count     smallint not null default 1
);

-- Index for fast user timeline queries
create index if not exists idx_entries_user_date
  on public.journal_entries(user_id, created_at desc);

-- ── Row Level Security ────────────────────────────────────────
alter table public.journal_entries enable row level security;

-- Users can only see their own entries
create policy "owner_select" on public.journal_entries
  for select using (auth.uid() = user_id);

-- Users can only insert their own entries
create policy "owner_insert" on public.journal_entries
  for insert with check (auth.uid() = user_id);

-- Users can only delete their own entries
create policy "owner_delete" on public.journal_entries
  for delete using (auth.uid() = user_id);

-- No updates — entries are immutable once saved
-- (prevents tampering with historical data)

-- ── Anonymised feedback ───────────────────────────────────────
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  rating      smallint check (rating between 1 and 5),
  comment     text,
  page        text          -- 'journal' | 'dashboard'
  -- deliberately no user_id — fully anonymous
);

alter table public.feedback enable row level security;

-- Anyone (including anon) can insert feedback
create policy "anon_insert_feedback" on public.feedback
  for insert with check (true);

-- No one can read feedback via client (admin only via service role)
-- No delete policy — append-only

-- ── Helper view: daily scores ─────────────────────────────────
create or replace view public.daily_scores as
select
  user_id,
  date_trunc('day', created_at at time zone 'UTC') as day,
  round(avg(composite_score)::numeric, 2)          as avg_score,
  count(*)                                         as entries_count
from public.journal_entries
group by user_id, day;
