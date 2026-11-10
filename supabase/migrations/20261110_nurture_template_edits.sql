-- Admin-owned overrides for the eight nurture email drafts. No email is sent by this table.
create table if not exists public.nurture_email_templates (
  sequence_key text not null,
  step integer not null check (step > 0),
  subject text not null,
  body text not null,
  cta text not null,
  updated_at timestamptz not null default now(),
  primary key (sequence_key, step)
);

alter table public.nurture_email_templates enable row level security;
revoke all on public.nurture_email_templates from public, anon, authenticated;
grant all on public.nurture_email_templates to service_role;

