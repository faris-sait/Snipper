-- Phase 7.8 — bonus: admin dashboard CTR signal.
--
-- One row per (notification, click) tuple. Notification identity is the
-- composite PK of `reaudit_notifications` — `(audit_id, pricing_version)` —
-- because that is the unique idempotency key the send path already uses.
--
-- Why allow many rows per notification (clicked_at in the PK): one click is
-- enough to count the notification as "engaged," but logging every visit
-- (rather than a single first-click upsert) keeps the schema honest if we
-- ever want a click-over-time view. The admin dashboard reduces this with
-- `count(distinct (audit_id, pricing_version))` so duplicates don't inflate.
create table if not exists public.reaudit_clicks (
  notification_audit_id text not null,
  notification_pricing_version text not null,
  clicked_at timestamptz not null default now(),
  primary key (notification_audit_id, notification_pricing_version, clicked_at)
);

alter table public.reaudit_clicks enable row level security;

create index if not exists reaudit_clicks_notification_idx
  on public.reaudit_clicks (notification_audit_id, notification_pricing_version);
