-- ============================================================
-- CoverCraft — Supabase SQL Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "pgcrypto";

-- ── profiles ──────────────────────────────────────────────────
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  phone text,
  linkedin text,
  avatar_url text,
  preferred_language text default 'en',
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── cvs ──────────────────────────────────────────────────────
create table if not exists cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  label text not null,
  language text not null default 'en',
  file_url text not null,
  file_name text not null,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- ── cover_letters ────────────────────────────────────────────
create table if not exists cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  company text not null,
  job_requirements text not null,
  cv_id uuid references cvs(id) on delete set null,
  language text not null default 'en',
  content text,
  status text not null default 'pending',
  created_at timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────
alter table profiles enable row level security;
alter table cvs enable row level security;
alter table cover_letters enable row level security;

-- Profiles: users can only see/edit their own
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- CVs: users can CRUD their own
create policy "Users can view own CVs"
  on cvs for select using (auth.uid() = user_id);
create policy "Users can insert own CVs"
  on cvs for insert with check (auth.uid() = user_id);
create policy "Users can update own CVs"
  on cvs for update using (auth.uid() = user_id);
create policy "Users can delete own CVs"
  on cvs for delete using (auth.uid() = user_id);

-- Cover letters: users can CRUD their own
create policy "Users can view own cover letters"
  on cover_letters for select using (auth.uid() = user_id);
create policy "Users can insert own cover letters"
  on cover_letters for insert with check (auth.uid() = user_id);
create policy "Users can update own cover letters"
  on cover_letters for update using (auth.uid() = user_id);
create policy "Users can delete own cover letters"
  on cover_letters for delete using (auth.uid() = user_id);

-- ── Storage: cvs bucket ──────────────────────────────────────
-- Run these in Supabase Storage settings or via SQL:
-- 1. Create a bucket named "cvs" (public: false)
-- 2. Add these storage policies:

insert into storage.buckets (id, name, public)
values ('cvs', 'cvs', false), ('profiles', 'profiles', true)
on conflict (id) do nothing;

create policy "Users can upload own CVs"
  on storage.objects for insert
  with check (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view own CVs"
  on storage.objects for select
  using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own CVs"
  on storage.objects for delete
  using (bucket_id = 'cvs' and auth.uid()::text = (storage.foldername(name))[1]);

-- Profiles storage: anyone can view avatars, only owner can upload/delete
create policy "Anyone can view avatars"
  on storage.objects for select
  using (bucket_id = 'profiles');

create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'profiles' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own avatar"
  on storage.objects for update
  using (bucket_id = 'profiles' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own avatar"
  on storage.objects for delete
  using (bucket_id = 'profiles' and auth.uid()::text = (storage.foldername(name))[1]);

-- ── Enable Realtime for cover_letters ────────────────────────
alter publication supabase_realtime add table cover_letters;
