-- ============================================================
-- CoverCraft: CV creado en la web
-- Ejecutar una vez en Supabase → SQL Editor (después de 002 y 003). Idempotente.
-- ============================================================

-- ── CVs creados con el editor ─────────────────────────────────
-- parent_id = null  → CV base del usuario (uno por usuario, en todos los planes).
-- parent_id != null → versión adaptada a una oferta (plan Pro, fase 2).
create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  parent_id uuid references resumes(id) on delete cascade,
  cover_letter_id uuid references cover_letters(id) on delete set null,
  title text not null default '',
  language text not null default 'en',
  data jsonb not null default '{}'::jsonb,
  style jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists resumes_one_base_per_user
  on resumes (user_id) where parent_id is null;
create index if not exists resumes_user on resumes (user_id, created_at);

alter table resumes enable row level security;

-- Solo lectura desde el navegador: se guarda a través de /api/resume, que valida el contenido
-- y genera el PDF que usa la IA.
drop policy if exists "Users can view own resumes" on resumes;
create policy "Users can view own resumes"
  on resumes for select using (auth.uid() = user_id);

-- ── Enlace entre el CV creado y la lista de CVs ───────────────
-- El CV creado aparece como un CV más para generar cartas (con un PDF de texto en el bucket `cvs`).
alter table cvs add column if not exists resume_id uuid references resumes(id) on delete cascade;
create unique index if not exists cvs_resume_id on cvs (resume_id) where resume_id is not null;
