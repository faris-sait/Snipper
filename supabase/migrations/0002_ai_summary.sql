-- Phase 5 — AI-generated personalised summary.
--
-- The summary is generated lazily (first view of /audit/result or /a/[id])
-- so an Anthropic outage never blocks an audit from running. Once generated,
-- it's cached on the audit row so re-renders and shared-link views don't
-- re-bill the API.
--
-- Stored as plain text on `audits` (not in the `result` jsonb) so the audit
-- snapshot stays the deterministic engine output and the AI text is a
-- separate, replaceable side-channel — the engine remains pure.

alter table public.audits
  add column if not exists ai_summary text;

-- The public RPC's return type changes (extra column), so `create or replace`
-- won't work — drop and recreate, then re-grant. Postgres does not preserve
-- grants when the function signature changes.
drop function if exists public.get_public_audit(text);

create function public.get_public_audit(p_id text)
returns table (
  id text,
  created_at timestamptz,
  input jsonb,
  result jsonb,
  monthly_savings_usd numeric,
  current_monthly_usd numeric,
  ai_summary text
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
    a.ai_summary
  from public.audits a
  where a.id = p_id
$$;

grant execute on function public.get_public_audit (text) to anon, authenticated;
