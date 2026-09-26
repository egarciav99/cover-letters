-- ============================================================
-- CoverCraft: CV adaptado a la oferta y puntuación de encaje (Gemini desde la app)
-- Ejecutar una vez en Supabase → SQL Editor (después de 004). Idempotente.
-- ============================================================

-- ── Uso por tipo ──────────────────────────────────────────────
-- 'letter' = carta (cupo del plan), 'match' = puntuación de encaje, 'tailor' = CV adaptado.
alter table generation_usage add column if not exists kind text not null default 'letter';
create index if not exists generation_usage_user_kind_month
  on generation_usage (user_id, kind, created_at);

-- El cupo de cartas cuenta solo cartas.
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
    and kind = 'letter'
    and created_at >= date_trunc('month', now());

  if used >= p_limit then
    return null;
  end if;

  insert into generation_usage (user_id, kind) values (p_user, 'letter') returning id into new_id;
  return new_id;
end;
$$;

-- Cupo mensual de las funciones de IA del CV. Devuelve null si se alcanzó el límite.
create or replace function public.consume_ai_usage(p_user uuid, p_kind text, p_limit int)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  used int;
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('ai:' || p_kind || ':' || p_user::text));

  select count(*) into used
  from generation_usage
  where user_id = p_user
    and kind = p_kind
    and created_at >= date_trunc('month', now());

  if used >= p_limit then
    return null;
  end if;

  insert into generation_usage (user_id, kind) values (p_user, p_kind) returning id into new_id;
  return new_id;
end;
$$;

revoke all on function public.consume_ai_usage(uuid, text, int) from public, anon, authenticated;
grant execute on function public.consume_ai_usage(uuid, text, int) to service_role;

-- ── Versiones adaptadas del CV ────────────────────────────────
-- status: 'pending' mientras la IA trabaja, 'done' o 'error'.
-- job: empresa, puesto y requisitos. changes: propuesta de la IA y qué cambios aceptó el usuario.
-- match: puntuación de encaje antes y después.
alter table resumes add column if not exists status text not null default 'done';
alter table resumes add column if not exists job jsonb;
alter table resumes add column if not exists changes jsonb;
alter table resumes add column if not exists match jsonb;
alter table resumes add column if not exists error_code text;
create index if not exists resumes_cover_letter on resumes (cover_letter_id) where cover_letter_id is not null;
