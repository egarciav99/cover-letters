-- ============================================================
-- CoverCraft — motivo del error de una carta (p. ej. CV ilegible)
-- Ejecutar una vez en Supabase → SQL Editor. Idempotente.
-- ============================================================
alter table cover_letters add column if not exists error_code text;
