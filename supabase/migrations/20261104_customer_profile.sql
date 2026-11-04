-- Customer profile, follow-up and email history for the admin-only CRM.
alter table public.leads
  add column if not exists next_follow_up_at timestamptz;

create index if not exists leads_follow_up_idx
  on public.leads(next_follow_up_at) where next_follow_up_at is not null;

create table if not exists public.lead_email_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  subject text not null,
  note text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists lead_email_history_lead_idx
  on public.lead_email_history(lead_id, sent_at desc);

alter table public.lead_email_history enable row level security;

revoke all on public.lead_email_history from anon, authenticated;
revoke all on public.lead_email_history from public;
grant all on public.lead_email_history to service_role;

-- CRM traffic is authenticated and authorized in Vercel before service_role access.
-- No public/authenticated policy is intentionally created for this table.

