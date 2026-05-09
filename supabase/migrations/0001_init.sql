-- Snipper — initial schema.
--
-- Three tables:
--   audits          → one row per completed audit. Snapshot of input + result
--                     so we can re-run the engine later if rules change.
--   audit_leads     → email + optional company / role / team_size, scoped to
--                     an audit. Identifying details — RLS-locked.
--   notify_signups  → optimal-path "notify me" captures with no audit attached.
--
-- Identifying details (email, company) live ONLY in audit_leads / notify_signups,
-- never in audits. So the public /a/[id] route — which renders the `audits` row
-- via a security-definer RPC — is PII-free by construction.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- audits
-- ---------------------------------------------------------------------------
create table if not exists public.audits (
  id text primary key,
  created_at timestamptz not null default now(),
  -- Verbatim AuditInput (teamSize, primaryUseCase, lines[]) as jsonb so the
  -- engine can be re-run later if rules change.
  input jsonb not null,
  -- Verbatim AuditResult so we don't have to re-run the engine for share views.
  result jsonb not null,
  -- Denormalised totals for cheap list / sort queries.
  monthly_savings_usd numeric(12, 2) not null default 0,
  current_monthly_usd numeric(12, 2) not null default 0,
  -- IP + user-agent for abuse / dedup. NEVER returned by the public RPC.
  request_meta jsonb
);

create index if not exists audits_created_at_idx on public.audits (created_at desc);

-- ---------------------------------------------------------------------------
-- audit_leads
-- ---------------------------------------------------------------------------
create table if not exists public.audit_leads (
  audit_id text references public.audits (id) on delete cascade,
  email text not null,
  company text,
  role text,
  team_size int,
  created_at timestamptz not null default now(),
  primary key (audit_id, email)
);

-- ---------------------------------------------------------------------------
-- notify_signups
-- ---------------------------------------------------------------------------
create table if not exists public.notify_signups (
  email text primary key,
  audit_id text references public.audits (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row-level security — locked down by default. Server actions use the
-- service-role key, which bypasses RLS. The anon key has no direct read
-- access; it can only call get_public_audit() below.
-- ---------------------------------------------------------------------------
alter table public.audits enable row level security;
alter table public.audit_leads enable row level security;
alter table public.notify_signups enable row level security;

-- ---------------------------------------------------------------------------
-- Public read RPC — returns audit fields only, never identifying details.
-- ---------------------------------------------------------------------------
create or replace function public.get_public_audit(p_id text)
returns table (
  id text,
  created_at timestamptz,
  input jsonb,
  result jsonb,
  monthly_savings_usd numeric,
  current_monthly_usd numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.created_at,
    a.input,
    a.result,
    a.monthly_savings_usd,
    a.current_monthly_usd
  from public.audits a
  where a.id = p_id
$$;

grant execute on function public.get_public_audit (text) to anon, authenticated;
