create extension if not exists pgcrypto;

create table if not exists public.assessment_users (
  id uuid primary key default gen_random_uuid(), auth_user_id uuid unique,
  email text not null unique, name text, phone text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.assessment_access_grants (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.assessment_users(id) on delete cascade,
  source text not null check (source in ('sepay','manual')), order_code text,
  status text not null default 'active' check (status in ('active','revoked','expired','used')),
  granted_at timestamptz not null default now(), expires_at timestamptz not null,
  attempt_used boolean not null default false, show_previous_result boolean not null default false,
  notes text, created_at timestamptz not null default now()
);
create unique index if not exists assessment_grants_order_code_uq on public.assessment_access_grants(order_code) where order_code is not null;
create index if not exists assessment_grants_current_idx on public.assessment_access_grants(user_id,status,expires_at,attempt_used);
create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.assessment_users(id) on delete cascade,
  grant_id uuid not null references public.assessment_access_grants(id) on delete restrict,
  answers jsonb not null, results jsonb not null, submitted_at timestamptz not null default now(), expires_at timestamptz not null
);
create index if not exists assessment_attempts_user_idx on public.assessment_attempts(user_id,submitted_at desc);
alter table public.assessment_users enable row level security;
alter table public.assessment_access_grants enable row level security;
alter table public.assessment_attempts enable row level security;
revoke all on public.assessment_users from anon,authenticated;
revoke all on public.assessment_access_grants from anon,authenticated;
revoke all on public.assessment_attempts from anon,authenticated;

create or replace function public.submit_assessment(p_auth_user_id uuid,p_grant_id uuid,p_answers jsonb,p_results jsonb)
returns public.assessment_attempts language plpgsql security definer set search_path=public as $$
declare v_user_id uuid; v_expires_at timestamptz; v_attempt public.assessment_attempts;
begin
  select id into v_user_id from public.assessment_users where auth_user_id=p_auth_user_id;
  if v_user_id is null then raise exception 'Assessment user not found'; end if;
  select expires_at into v_expires_at from public.assessment_access_grants where id=p_grant_id and user_id=v_user_id and status='active' and attempt_used=false and expires_at>now() for update;
  if v_expires_at is null then raise exception 'Assessment access is unavailable'; end if;
  insert into public.assessment_attempts(user_id,grant_id,answers,results,expires_at) values(v_user_id,p_grant_id,p_answers,p_results,v_expires_at) returning * into v_attempt;
  update public.assessment_access_grants set attempt_used=true,status='used' where id=p_grant_id;
  return v_attempt;
end; $$;
revoke all on function public.submit_assessment(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.submit_assessment(uuid,uuid,jsonb,jsonb) to service_role;
