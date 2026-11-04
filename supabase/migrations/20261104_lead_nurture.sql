-- Email nurture content and outbox. This migration does not send email.
alter table public.leads
  add column if not exists email_consent boolean not null default false,
  add column if not exists email_consent_at timestamptz,
  add column if not exists nurture_sequence text,
  add column if not exists nurture_status text not null default 'not_started',
  add column if not exists nurture_next_at timestamptz,
  add column if not exists nurture_stopped_reason text;

create index if not exists leads_nurture_next_idx
  on public.leads(nurture_next_at) where nurture_next_at is not null;

create table if not exists public.lead_email_outbox (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  sequence_key text not null,
  step integer not null,
  send_after timestamptz not null,
  goal text not null,
  subject text not null,
  body text not null,
  cta text not null,
  stop_condition text not null,
  status text not null default 'draft',
  blocked_reason text,
  sent_at timestamptz,
  provider_message_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(lead_id, sequence_key, step)
);

create index if not exists lead_email_outbox_lead_idx
  on public.lead_email_outbox(lead_id, send_after);

alter table public.lead_email_outbox enable row level security;
revoke all on public.lead_email_outbox from anon, authenticated;
revoke all on public.lead_email_outbox from public;
grant all on public.lead_email_outbox to service_role;


