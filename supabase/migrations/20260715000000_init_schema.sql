-- =============================================================================
-- The Owner Toolkit — initial schema
-- =============================================================================
--
-- Design principles (see AI_CONTEXT memory for the full narrative):
--   1. Browsers never write directly to portals or inquiries — all mutations
--      go through server routes using service_role. anon key is identity, not
--      authorization.
--   2. Portals are versioned. Publishing creates an immutable portal_versions
--      row; every inquiry references the exact version it was submitted
--      against, so answers always match the form the customer actually saw.
--   3. Inquiry answers are denormalized snapshots — full {field_id, role,
--      label, type, value} objects — so labels can change and fields can
--      disappear without corrupting history.
--   4. Events table captures state changes from day one. Owner-visible later;
--      never customer-visible.
--   5. RLS enabled everywhere. No anon SELECT policies on portals or
--      inquiries. Public portal read happens through get_public_portal(slug)
--      RPC (SECURITY DEFINER), which filters to a single published portal.
--
-- Everything the schema does NOT do is intentional (auth, notifications,
-- billing). Those get their own migrations later.
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

do $$ begin
  create type field_role as enum ('customer_name', 'customer_email', 'customer_phone', 'customer_company');
exception when duplicate_object then null; end $$;


-- =============================================================================
-- Tables
-- =============================================================================

-- Logical portal identity. Metadata lives on portal_versions.
create table if not exists portals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  owner_id uuid references auth.users(id) on delete set null,
  current_version_id uuid, -- FK added after portal_versions is created
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Immutable snapshot of a portal at publish time. New publish = new row.
create table if not exists portal_versions (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references portals(id) on delete cascade,
  version integer not null,
  business_name text not null,
  logo_url text,
  color text not null,
  welcome_message text not null,
  fields jsonb not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (portal_id, version)
);

alter table portals
  drop constraint if exists portals_current_version_fk;
alter table portals
  add constraint portals_current_version_fk
  foreign key (current_version_id) references portal_versions(id) on delete set null;

-- Customer submissions. Each references the exact portal version they saw.
create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  portal_id uuid not null references portals(id) on delete cascade,
  portal_version_id uuid not null references portal_versions(id) on delete restrict,
  status inquiry_status not null default 'new',
  -- answers is an ordered array of {field_id, role, label, type, value}
  answers jsonb not null default '[]'::jsonb,
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  owner_notes text not null default '',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Audit / activity trail. Server-only writes.
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  portal_id uuid references portals(id) on delete cascade,
  inquiry_id uuid references inquiries(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);


-- =============================================================================
-- Indexes
-- =============================================================================
create index if not exists portals_owner_id_idx on portals(owner_id);
create index if not exists portal_versions_portal_id_idx on portal_versions(portal_id);
create index if not exists inquiries_portal_id_idx on inquiries(portal_id);
create index if not exists inquiries_portal_version_id_idx on inquiries(portal_version_id);
create index if not exists inquiries_status_idx on inquiries(status);
create index if not exists inquiries_submitted_at_idx on inquiries(submitted_at desc);
create index if not exists inquiries_customer_email_idx on inquiries(lower(customer_email));
create index if not exists inquiries_customer_name_idx on inquiries(lower(customer_name));
create index if not exists events_portal_id_idx on events(portal_id);
create index if not exists events_inquiry_id_idx on events(inquiry_id);
create index if not exists events_created_at_idx on events(created_at desc);
create index if not exists events_event_type_idx on events(event_type);


-- =============================================================================
-- Triggers — auto updated_at
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

drop trigger if exists portals_updated_at on portals;
create trigger portals_updated_at
  before update on portals
  for each row execute function public.set_updated_at();

drop trigger if exists inquiries_updated_at on inquiries;
create trigger inquiries_updated_at
  before update on inquiries
  for each row execute function public.set_updated_at();


-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table portals enable row level security;
alter table portal_versions enable row level security;
alter table inquiries enable row level security;
alter table events enable row level security;

-- portals ---------------------------------------------------------------------
drop policy if exists portals_owner_read on portals;
create policy portals_owner_read on portals
  for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists portals_owner_insert on portals;
create policy portals_owner_insert on portals
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists portals_owner_update on portals;
create policy portals_owner_update on portals
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists portals_owner_delete on portals;
create policy portals_owner_delete on portals
  for delete to authenticated
  using (owner_id = auth.uid());

-- portal_versions -------------------------------------------------------------
drop policy if exists portal_versions_owner_read on portal_versions;
create policy portal_versions_owner_read on portal_versions
  for select to authenticated
  using (portal_id in (select id from portals where owner_id = auth.uid()));

drop policy if exists portal_versions_owner_insert on portal_versions;
create policy portal_versions_owner_insert on portal_versions
  for insert to authenticated
  with check (portal_id in (select id from portals where owner_id = auth.uid()));

-- portal_versions are immutable: no update or delete policies for authenticated.
-- Rows are deleted only via portal cascade.

-- inquiries -------------------------------------------------------------------
-- No anon INSERT policy. All customer submissions go through the server
-- route using service_role. Anon is guaranteed zero read/write.

drop policy if exists inquiries_owner_read on inquiries;
create policy inquiries_owner_read on inquiries
  for select to authenticated
  using (portal_id in (select id from portals where owner_id = auth.uid()));

drop policy if exists inquiries_owner_update on inquiries;
create policy inquiries_owner_update on inquiries
  for update to authenticated
  using (portal_id in (select id from portals where owner_id = auth.uid()))
  with check (portal_id in (select id from portals where owner_id = auth.uid()));

drop policy if exists inquiries_owner_delete on inquiries;
create policy inquiries_owner_delete on inquiries
  for delete to authenticated
  using (portal_id in (select id from portals where owner_id = auth.uid()));

-- events ----------------------------------------------------------------------
drop policy if exists events_owner_read on events;
create policy events_owner_read on events
  for select to authenticated
  using (portal_id in (select id from portals where owner_id = auth.uid()));

-- No insert/update/delete policies. service_role writes; nobody deletes.


-- =============================================================================
-- Grants — least-privilege for anon
-- =============================================================================
-- Explicitly deny table-level access to anon. Even if a policy is added by
-- mistake later, the grant layer will block it.
revoke all on portals from anon, public;
revoke all on portal_versions from anon, public;
revoke all on inquiries from anon, public;
revoke all on events from anon, public;

-- authenticated defaults are permissive; RLS filters them.
grant select, insert, update, delete on portals to authenticated;
grant select, insert on portal_versions to authenticated;
grant select, update, delete on inquiries to authenticated;
grant select on events to authenticated;


-- =============================================================================
-- RPC — public portal read
-- =============================================================================
-- Returns the currently published version of a portal, by slug.
-- SECURITY DEFINER runs as the function owner (postgres), bypassing RLS on
-- the underlying tables. Only client-facing columns are returned.
-- Draft portals (current_version_id IS NULL) are invisible.
create or replace function public.get_public_portal(portal_slug text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id',              p.id,
    'slug',            p.slug,
    'version',         pv.version,
    'business_name',   pv.business_name,
    'logo_url',        pv.logo_url,
    'color',           pv.color,
    'welcome_message', pv.welcome_message,
    'fields',          pv.fields,
    'published_at',    pv.published_at
  )
  from public.portals p
  join public.portal_versions pv on pv.id = p.current_version_id
  where p.slug = portal_slug
    and p.current_version_id is not null
  limit 1;
$$;

revoke execute on function public.get_public_portal(text) from public;
grant execute on function public.get_public_portal(text) to anon, authenticated;


-- =============================================================================
-- Storage — inquiry-files bucket (private)
-- =============================================================================
-- Private bucket. No anon or authenticated policies on storage.objects for
-- this bucket. All uploads go through server-generated signed upload URLs
-- (service_role). All downloads go through server-generated signed URLs
-- issued after an owner-auth check.
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


-- =============================================================================
-- Seed — one portal so /portal has something to render during review
-- =============================================================================
-- owner_id NULL for now (no auth). Backfilled to the first authenticated
-- owner in a later migration.
do $$
declare
  v_portal_id uuid;
  v_version_id uuid;
begin
  if not exists (select 1 from portals where slug = 'default') then
    insert into portals (slug, owner_id) values ('default', null)
      returning id into v_portal_id;

    insert into portal_versions (
      portal_id, version, business_name, color, welcome_message, fields
    ) values (
      v_portal_id,
      1,
      'Untitled Portal',
      'hsl(30 8% 10%)',
      'Tell us a little about your project and we''ll be in touch within a business day.',
      $json$
      [
        {"id":"name","type":"short_answer","role":"customer_name","label":"Your name","required":true,"enabled":true},
        {"id":"email","type":"email","role":"customer_email","label":"Email","required":true,"enabled":true},
        {"id":"phone","type":"phone","role":"customer_phone","label":"Phone","required":false,"enabled":true},
        {"id":"company","type":"short_answer","role":"customer_company","label":"Company","required":false,"enabled":true},
        {"id":"service","type":"short_answer","label":"Service or project type","required":false,"enabled":true},
        {"id":"project","type":"long_answer","label":"Project details","required":true,"enabled":true},
        {"id":"budget","type":"short_answer","label":"Budget","required":false,"enabled":true},
        {"id":"timeline","type":"short_answer","label":"Desired timeline","required":false,"enabled":true},
        {"id":"files","type":"file_upload","label":"Files","required":false,"enabled":true},
        {"id":"contact_method","type":"multiple_choice","label":"Preferred contact method","required":false,"enabled":true,"options":["Email","Phone","Text message"]},
        {"id":"anything_else","type":"long_answer","label":"Anything else we should know?","required":false,"enabled":true}
      ]
      $json$::jsonb
    )
    returning id into v_version_id;

    update portals set current_version_id = v_version_id where id = v_portal_id;

    insert into events (event_type, portal_id, payload)
    values ('portal.published', v_portal_id, jsonb_build_object('version', 1, 'source', 'seed'));
  end if;
end $$;
