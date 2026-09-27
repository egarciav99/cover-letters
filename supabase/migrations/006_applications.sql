-- ============================================================
-- CoverCraft: seguimiento de candidaturas y preparación de entrevista
-- Ejecutar una vez en Supabase → SQL Editor (después de 005). Idempotente.
-- ============================================================

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  company text not null default '' check (char_length(company) <= 200),
  position text not null default '' check (char_length(position) <= 200),
  status text not null default 'saved' check (status in ('saved', 'applied', 'interview', 'offer', 'rejected')),
  url text check (char_length(url) <= 1000),
  notes text check (char_length(notes) <= 5000),
  job_description text check (char_length(job_description) <= 15000),
  applied_at date,
  cover_letter_id uuid references cover_letters(id) on delete set null,
  resume_id uuid references resumes(id) on delete set null,
  -- Preguntas y respuestas sugeridas (plan Pro). Solo las escribe el servidor.
  interview_prep jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user on applications (user_id, created_at);
create index if not exists applications_letter on applications (cover_letter_id) where cover_letter_id is not null;

alter table applications enable row level security;

drop policy if exists "Users can view own applications" on applications;
create policy "Users can view own applications"
  on applications for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own applications" on applications;
create policy "Users can insert own applications"
  on applications for insert with check (auth.uid() = user_id and interview_prep is null);
drop policy if exists "Users can update own applications" on applications;
create policy "Users can update own applications"
  on applications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own applications" on applications;
create policy "Users can delete own applications"
  on applications for delete using (auth.uid() = user_id);

-- ── Límite del plan gratis (15 candidaturas) y fecha de modificación ──
create or replace function public.applications_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_pro boolean;
  total int;
begin
  if tg_op = 'UPDATE' then
    new.updated_at := now();
    -- La preparación de entrevista solo la cambia el servidor (service role).
    if new.interview_prep is distinct from old.interview_prep and coalesce(auth.role(), '') <> 'service_role' then
      new.interview_prep := old.interview_prep;
    end if;
    return new;
  end if;

  select exists (
    select 1 from user_plans
    where user_id = new.user_id
      and plan = 'pro'
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
  ) into is_pro;

  if not is_pro then
    perform pg_advisory_xact_lock(hashtext('applications:' || new.user_id::text));
    select count(*) into total from applications where user_id = new.user_id;
    if total >= 15 then
      raise exception 'application_limit' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists applications_before_write on applications;
create trigger applications_before_write
  before insert or update on applications
  for each row execute procedure public.applications_before_write();
