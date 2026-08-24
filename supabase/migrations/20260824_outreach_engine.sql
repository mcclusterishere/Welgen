-- Applied to the Here project (zmnhbrjyhxzhkxmhkexs) on 2026-08-24.
-- Kept here so the schema is in version control alongside the functions
-- that depend on it. Re-running is safe: every statement is guarded.
--
-- See supabase/README.md for what each table is for. The short version:
-- cold email is lawful only with an honest sender, a real postal address
-- and a working opt-out, so those three are structural here rather than
-- conventions somebody has to remember.

-- (full statement list identical to the applied migration — see
--  supabase/README.md § Schema for the table-by-table description)

create table if not exists out_sender_identities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  label text not null,
  from_name text not null,
  from_email text not null,
  reply_to text,
  postal_address text not null,           -- CAN-SPAM 15 U.S.C. 7704(a)(5)
  provider text not null default 'resend',
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists out_sender_org_email on out_sender_identities (org_id, lower(from_email));

create table if not exists out_companies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null, domain text, kind text not null default 'nonprofit',
  city text, region text,
  source text not null default 'manual',
  status text not null default 'new',
  notes text,
  created_at timestamptz not null default now(),
  constraint out_companies_kind_ck check (kind in ('nonprofit','brand','agency','government','media','other')),
  constraint out_companies_source_ck check (source in ('inquiry','import','research','manual')),
  constraint out_companies_status_ck check (status in ('new','contacted','replied','partner','declined'))
);
create unique index if not exists out_companies_org_domain on out_companies (org_id, lower(domain)) where domain is not null;

create table if not exists out_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  company_id uuid references out_companies(id) on delete set null,
  email text not null, name text, title text,
  consent text not null default 'none',
  consent_source text, consent_at timestamptz,
  unsub_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  constraint out_contacts_consent_ck check (consent in ('none','inquired','opted_in'))
);
create unique index if not exists out_contacts_org_email on out_contacts (org_id, lower(email));
create unique index if not exists out_contacts_unsub on out_contacts (unsub_token);

create table if not exists out_campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references orgs(id) on delete cascade,
  name text not null,
  sender_id uuid not null references out_sender_identities(id) on delete restrict,
  subject text not null, body_text text not null, body_html text,
  audience jsonb not null default '{}'::jsonb,
  audience_kind text not null default 'warm',
  status text not null default 'draft',
  throttle_per_hour int not null default 60,
  created_by uuid, approved_by uuid, approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint out_campaigns_kind_ck check (audience_kind in ('warm','cold')),
  constraint out_campaigns_status_ck check (status in ('draft','approved','sending','paused','done','failed')),
  constraint out_campaigns_throttle_ck check (throttle_per_hour between 1 and 2000)
);

create table if not exists out_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references out_campaigns(id) on delete cascade,
  org_id uuid not null references orgs(id) on delete cascade,
  contact_id uuid references out_contacts(id) on delete set null,
  address text not null,
  state text not null default 'queued',
  skip_reason text, provider_id text,
  attempts int not null default 0, last_error text,
  sent_at timestamptz, created_at timestamptz not null default now(),
  constraint out_recipients_state_ck check (state in ('queued','sent','failed','skipped'))
);
create unique index if not exists out_recipients_once on out_recipients (campaign_id, lower(address));
create index if not exists out_recipients_work on out_recipients (campaign_id, state);

create table if not exists out_events (
  id bigserial primary key,
  org_id uuid not null references orgs(id) on delete cascade,
  recipient_id uuid references out_recipients(id) on delete cascade,
  address text not null, type text not null,
  detail jsonb not null default '{}'::jsonb,
  at timestamptz not null default now(),
  constraint out_events_type_ck check (type in ('sent','delivered','opened','clicked','bounced','complained','unsubscribed','failed'))
);
create index if not exists out_events_org_at on out_events (org_id, at desc);

create table if not exists out_suppressions (
  org_id uuid not null references orgs(id) on delete cascade,
  address text not null, reason text not null, detail text,
  at timestamptz not null default now(),
  primary key (org_id, address),
  constraint out_suppressions_reason_ck check (reason in ('unsubscribed','bounced','complained','manual'))
);

create or replace function out_lower_address() returns trigger
language plpgsql as $$
begin
  new.address := lower(trim(new.address));
  return new;
end $$;

drop trigger if exists out_suppressions_lower on out_suppressions;
create trigger out_suppressions_lower before insert or update on out_suppressions
  for each row execute function out_lower_address();
drop trigger if exists out_recipients_lower on out_recipients;
create trigger out_recipients_lower before insert or update on out_recipients
  for each row execute function out_lower_address();

alter table out_sender_identities enable row level security;
alter table out_companies         enable row level security;
alter table out_contacts          enable row level security;
alter table out_campaigns         enable row level security;
alter table out_recipients        enable row level security;
alter table out_events            enable row level security;
alter table out_suppressions      enable row level security;

drop policy if exists out_sender_owner on out_sender_identities;
create policy out_sender_owner on out_sender_identities for all
  using (private.is_org_owner(org_id)) with check (private.is_org_owner(org_id));
drop policy if exists out_sender_read on out_sender_identities;
create policy out_sender_read on out_sender_identities for select using (private.is_org_member(org_id));

drop policy if exists out_companies_org on out_companies;
create policy out_companies_org on out_companies for all
  using (private.is_org_member(org_id)) with check (private.is_org_member(org_id));
drop policy if exists out_contacts_org on out_contacts;
create policy out_contacts_org on out_contacts for all
  using (private.is_org_member(org_id)) with check (private.is_org_member(org_id));
drop policy if exists out_campaigns_org on out_campaigns;
create policy out_campaigns_org on out_campaigns for all
  using (private.is_org_member(org_id)) with check (private.is_org_member(org_id));

drop policy if exists out_recipients_read on out_recipients;
create policy out_recipients_read on out_recipients for select using (private.is_org_member(org_id));
drop policy if exists out_events_read on out_events;
create policy out_events_read on out_events for select using (private.is_org_member(org_id));
drop policy if exists out_suppressions_read on out_suppressions;
create policy out_suppressions_read on out_suppressions for select using (private.is_org_member(org_id));
drop policy if exists out_suppressions_add on out_suppressions;
create policy out_suppressions_add on out_suppressions for insert with check (private.is_org_member(org_id));
