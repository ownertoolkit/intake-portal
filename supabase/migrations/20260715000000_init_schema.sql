-- =============================================================================
-- The Owner Toolkit — Customer Intake Portal
-- Initial schema, V1
-- =============================================================================
--
-- Design principles for this template:
--   1. Portal configuration lives in portal.config.ts, not the database.
--      Changing configuration means downloading a fresh copy from
--      theownertoolkit.co and redeploying it.
--   2. The Supabase anon key is identity, not authorization. Customers never
--      touch tables directly; the customer form posts answers to
--      /api/inquiries, which inserts via service_role.
--   3. Single owner per deployment. The first person to sign in and
--      complete the auth flow becomes the owner. Everyone else gets denied.
--   4. Row Level Security is enabled on every table. All table-level grants
--      to `anon` are revoked, so even a policy accidentally added later
--      cannot open a hole.
-- =============================================================================


-- =============================================================================
-- Extensions
-- =============================================================================
create extension if not exists "pgcrypto";


-- =============================================================================
-- Enums
-- =============================================================================
do $$ begin
  create type inquiry_status as enum ('new', 'contacted', 'quoted', 'booked', 'won', 'lost');
exception when duplicate_object then null; end $$;


-- =============================================================================
-- Tables
-- =============================================================================

-- owner_profile
-- One row, ever. The `id` column is a singleton boolean, so a second insert
-- is physically impossible.
create table if not exists public.owner_profile (
  id boolean primary key default true,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  claimed_at timestamptz not null default now(),
  constraint owner_profile_singleton check (id = true)
);

-- inquiries
-- One row per customer submission. `answers` is the complete jsonb blob
-- keyed by field id; the denormalized name/email/phone columns exist so
-- the dashboard's search + sorted queries never touch jsonb.
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  status inquiry_status not null default 'new',
  customer_name text,
  customer_email text,
  customer_phone text,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- notes
-- Owner-only private notes attached to an inquiry. Multiple notes per
-- inquiry are supported structurally so the schema won't need a migration
-- when we ever want a multi-note UI. V1 UI shows one note per inquiry.
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =============================================================================
-- Indexes
-- =============================================================================
create index if not exists inquiries_status_idx on public.inquiries(status);
create index if not exists inquiries_created_at_idx on public.inquiries(created_at desc);
create index if not exists inquiries_customer_email_idx on public.inquiries(lower(customer_email));
create index if not exists inquiries_customer_name_idx on public.inquiries(lower(customer_name));
create index if not exists notes_inquiry_id_idx on public.notes(inquiry_id, updated_at desc);


-- =============================================================================
-- Trigger — auto updated_at
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inquiries_updated_at on public.inquiries;
create trigger inquiries_updated_at
  before update on public.inquiries
  for each row execute function public.set_updated_at();

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();


-- =============================================================================
-- Ownership check
-- =============================================================================
-- Returns true iff the current authenticated user is the single owner.
-- Every RLS policy for the authenticated role wraps its condition in this
-- function so even a rogue signed-up account (someone who hits the login
-- page directly) cannot read a single row.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.owner_profile
    where user_id = auth.uid()
  );
$$;

revoke execute on function public.is_owner() from public;
grant execute on function public.is_owner() to authenticated, anon;


-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.owner_profile enable row level security;
alter table public.inquiries enable row level security;
alter table public.notes enable row level security;

-- owner_profile ---------------------------------------------------------------
-- No anon access. Authenticated owner can read their own row. Writes only
-- via service_role in /api/auth/claim (first-signin-wins).
drop policy if exists owner_profile_self_read on public.owner_profile;
create policy owner_profile_self_read on public.owner_profile
  for select to authenticated
  using (user_id = auth.uid());

-- inquiries -------------------------------------------------------------------
-- Anon has no direct access. All customer submissions go through
-- /api/inquiries with service_role. Owner: full read + update (stage moves
-- happen from the dashboard). No insert or delete via the browser.
drop policy if exists inquiries_owner_read on public.inquiries;
create policy inquiries_owner_read on public.inquiries
  for select to authenticated
  using (public.is_owner());

drop policy if exists inquiries_owner_update on public.inquiries;
create policy inquiries_owner_update on public.inquiries
  for update to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- notes -----------------------------------------------------------------------
-- Owner-only, full CRUD from the browser. author_id must be the current user.
drop policy if exists notes_owner_read on public.notes;
create policy notes_owner_read on public.notes
  for select to authenticated
  using (public.is_owner());

drop policy if exists notes_owner_insert on public.notes;
create policy notes_owner_insert on public.notes
  for insert to authenticated
  with check (public.is_owner() and author_id = auth.uid());

drop policy if exists notes_owner_update on public.notes;
create policy notes_owner_update on public.notes
  for update to authenticated
  using (public.is_owner() and author_id = auth.uid())
  with check (public.is_owner() and author_id = auth.uid());

drop policy if exists notes_owner_delete on public.notes;
create policy notes_owner_delete on public.notes
  for delete to authenticated
  using (public.is_owner() and author_id = auth.uid());


-- =============================================================================
-- Grants — least privilege
-- =============================================================================
revoke all on public.owner_profile from anon, public;
revoke all on public.inquiries from anon, public;
revoke all on public.notes from anon, public;

grant select on public.owner_profile to authenticated;
grant select, update on public.inquiries to authenticated;
grant select, insert, update, delete on public.notes to authenticated;


-- =============================================================================
-- Storage — inquiry-files bucket (private)
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inquiry-files',
  'inquiry-files',
  false,
  26214400, -- 25 MB per file
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/gif',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.text'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Owner-only read on files in the inquiry-files bucket. Uploads happen only
-- through server-issued signed upload URLs; no anon or authenticated INSERT
-- policy on storage.objects for this bucket.
drop policy if exists inquiry_files_owner_read on storage.objects;
create policy inquiry_files_owner_read on storage.objects
  for select to authenticated
  using (bucket_id = 'inquiry-files' and public.is_owner());
