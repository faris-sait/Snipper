-- Phase 1 — Round 2: re-audit on pricing change.
--
-- Three additions to the schema, one drop-and-recreate of the public RPC:
--
--   1. audits.pricing_snapshot jsonb — per-audit snapshot of the plans for the
--      tools referenced in the audit's input lines. NULL for pre-Round-2 rows
--      (detect-changes filters them out — no silent counterfactual).
--   2. pricing_overrides — runtime mutations on the in-code TOOLS registry,
--      mutated via POST /api/admin/pricing so the evaluator can change pricing
--      without git access. Overlaid on TOOLS at audit-run and detect-changes time.
--   3. reaudit_notifications — idempotency log keyed on (audit_id, pricing_version)
--      so detect-changes can run repeatedly against the same pricing state
--      without double-emailing.
--
-- Bonus (Phase 7.6): audit_leads.unsubscribed_at for one-click unsubscribe.

-- ---------------------------------------------------------------------------
-- audits.pricing_snapshot
-- ---------------------------------------------------------------------------
alter table public.audits
  add column if not exists pricing_snapshot jsonb;

-- ---------------------------------------------------------------------------
-- audit_leads.unsubscribed_at  (bonus — Phase 7.6 unsubscribe flow)
-- ---------------------------------------------------------------------------
alter table public.audit_leads
  add column if not exists unsubscribed_at timestamptz;

-- ---------------------------------------------------------------------------
-- pricing_overrides
--
-- One row per (tool, plan) override. `overrides` is a partial Plan object:
-- whichever fields are present overwrite the corresponding fields on
-- TOOLS[tool_id].plans[plan_id] at engine-read time. Service-role writes only.
-- ---------------------------------------------------------------------------
create table if not exists public.pricing_overrides (
  tool_id text not null,
  plan_id text not null,
  overrides jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (tool_id, plan_id)
);

alter table public.pricing_overrides enable row level security;

-- ---------------------------------------------------------------------------
-- reaudit_notifications
--
-- Idempotency record: one row per (audit_id, pricing_version) we've emailed
-- about. `pricing_version` is sha256(canonicalJson(effectiveTools)).slice(0,16),
-- so the key is "the world's pricing at the moment we sent." A second
-- detect-changes run with the same pricing finds these rows and skips them.
-- ---------------------------------------------------------------------------
create table if not exists public.reaudit_notifications (
  audit_id text not null references public.audits (id) on delete cascade,
  pricing_version text not null,
  email text not null,
  sent_at timestamptz not null default now(),
  primary key (audit_id, pricing_version)
);

alter table public.reaudit_notifications enable row level security;

create index if not exists reaudit_notifications_pricing_version_idx
  on public.reaudit_notifications (pricing_version);

-- ---------------------------------------------------------------------------
-- get_public_audit — drop and recreate to include pricing_snapshot in the
-- return shape. `create or replace` can't change a function's return type;
-- same pattern as migration 0002.
-- ---------------------------------------------------------------------------
drop function if exists public.get_public_audit(text);

create function public.get_public_audit(p_id text)
returns table (
  id text,
  created_at timestamptz,
  input jsonb,
  result jsonb,
  monthly_savings_usd numeric,
  current_monthly_usd numeric,
  ai_summary text,
  pricing_snapshot jsonb
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
    a.current_monthly_usd,
    a.ai_summary,
    a.pricing_snapshot
  from public.audits a
  where a.id = p_id
$$;

grant execute on function public.get_public_audit (text) to anon, authenticated;
