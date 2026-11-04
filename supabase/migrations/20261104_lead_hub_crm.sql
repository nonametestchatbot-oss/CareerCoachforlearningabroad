create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  email_normalized text,
  phone text,
  phone_normalized text,
  source text not null default 'landing-page',
  landing_page_url text,
  utm jsonb not null default '{}'::jsonb,
  need text,
  student_context text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'booked', 'won', 'not_fit')),
  fit_score smallint check (fit_score between 0 and 100),
  intent_score smallint check (intent_score between 0 and 100),
  engagement_score smallint check (engagement_score between 0 and 100),
  score smallint check (score between 0 and 100),
  score_reasons jsonb not null default '{}'::jsonb,
  next_action text,
  latest_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists leads_email_normalized_uq
  on public.leads(email_normalized) where email_normalized is not null;
create unique index if not exists leads_phone_normalized_uq
  on public.leads(phone_normalized) where phone_normalized is not null;
create index if not exists leads_pipeline_idx on public.leads(status, updated_at desc);
create index if not exists leads_source_idx on public.leads(source);
create index if not exists leads_score_idx on public.leads(score);

create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  activity_type text not null default 'note',
  note text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists lead_activities_lead_idx
  on public.lead_activities(lead_id, occurred_at desc);

create or replace function public.set_lead_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_lead_updated_at();

alter table public.leads enable row level security;
alter table public.lead_activities enable row level security;

revoke all on public.leads from anon, authenticated;
revoke all on public.lead_activities from anon, authenticated;
revoke all on public.leads from public;
revoke all on public.lead_activities from public;

-- All CRM reads and writes go through Vercel serverless APIs using service_role.
-- There is intentionally no public or authenticated policy on these tables.
grant all on public.leads to service_role;
grant all on public.lead_activities to service_role;




