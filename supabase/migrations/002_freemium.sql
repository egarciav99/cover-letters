-- ============================================================
-- CoverCraft — freemium: planes y uso mensual
-- Ejecutar una vez en Supabase → SQL Editor (después de migration.sql).
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================

-- La app ya envía `position`, pero la migración inicial no la creaba.
alter table cover_letters add column if not exists position text;

-- ── Plan de cada usuario ──────────────────────────────────────
-- Tabla aparte de `profiles` porque los usuarios pueden editar su perfil:
-- el plan solo lo cambia el servidor (service role / webhook de Stripe).
create table if not exists user_plans (
  user_id uuid primary key references auth.users on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text not null default 'active',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table user_plans enable row level security;

drop policy if exists "Users can view own plan" on user_plans;
create policy "Users can view own plan"
  on user_plans for select using (auth.uid() = user_id);
-- Sin políticas de insert/update/delete: solo el service role escribe.

-- ── Registro de generaciones ──────────────────────────────────
-- Cuenta el uso aunque el usuario borre sus cartas (borrar no devuelve cupo).
create table if not exists generation_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  cover_letter_id uuid references cover_letters(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists generation_usage_user_month
  on generation_usage (user_id, created_at);

alter table generation_usage enable row level security;

drop policy if exists "Users can view own usage" on generation_usage;
create policy "Users can view own usage"
  on generation_usage for select using (auth.uid() = user_id);

-- ── Consumir una generación de forma atómica ─────────────────
-- Devuelve el id del registro de uso, o null si ya se alcanzó el límite del mes.
-- El bloqueo por usuario evita que dos peticiones simultáneas se salten el límite.
create or replace function public.consume_generation(p_user uuid, p_limit int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  used int;
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('generation:' || p_user::text));

  select count(*) into used
  from generation_usage
  where user_id = p_user
    and created_at >= date_trunc('month', now());

  if used >= p_limit then
    return null;
  end if;

  insert into generation_usage (user_id) values (p_user) returning id into new_id;
  return new_id;
end;
$$;

-- Solo el servidor (service role) puede llamarla.
revoke all on function public.consume_generation(uuid, int) from public, anon, authenticated;
grant execute on function public.consume_generation(uuid, int) to service_role;
