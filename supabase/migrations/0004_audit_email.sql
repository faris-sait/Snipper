-- Phase 6.5 / blockers — attach a canonical recipient email to each audit.
--
-- Round 2's brief is stricter than Round 1's "optional lead capture after the
-- result": every completed audit should persist with the user's email so stale
-- audits can always be re-run and emailed later. Keep the public RPC PII-free;
-- this column is server-only.

alter table public.audits
  add column if not exists email text;

-- Best-effort backfill for already-captured audits: prefer the earliest lead
-- email for that audit, then fall back to a notify-signup row tagged with the
-- audit id.
update public.audits a
set email = leads.email
from (
  select distinct on (audit_id)
    audit_id,
    lower(trim(email)) as email
  from public.audit_leads
  order by audit_id, created_at asc
) leads
where a.id = leads.audit_id
  and a.email is null;

update public.audits a
set email = lower(trim(ns.email))
from public.notify_signups ns
where a.id = ns.audit_id
  and a.email is null;
