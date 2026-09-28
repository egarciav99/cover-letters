-- ============================================================
-- CoverCraft: CV online con enlace y QR (plan Pro)
-- Ejecutar una vez en Supabase > SQL Editor (después de 004). Idempotente.
-- ============================================================

-- Solo el CV base (parent_id null) se publica. Lo escribe el servidor (/api/resume/public):
-- desde el navegador la tabla sigue siendo de solo lectura.
alter table resumes add column if not exists public_slug text;
alter table resumes add column if not exists is_public boolean not null default false;
alter table resumes add column if not exists show_contact boolean not null default false;
alter table resumes add column if not exists public_views integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'resumes_public_slug_format') then
    alter table resumes add constraint resumes_public_slug_format
      check (public_slug is null or public_slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$');
  end if;
end $$;

create unique index if not exists resumes_public_slug on resumes (public_slug) where public_slug is not null;

-- Suma una visita de forma atómica. Solo la llama el servidor.
create or replace function public.bump_resume_views(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update resumes set public_views = public_views + 1 where id = p_id;
$$;

revoke all on function public.bump_resume_views(uuid) from public, anon, authenticated;
grant execute on function public.bump_resume_views(uuid) to service_role;
