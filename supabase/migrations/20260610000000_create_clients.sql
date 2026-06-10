-- Clients table (multi-tenant, scoped by organization)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_organization_id_idx
  on public.clients (organization_id);

alter table public.clients enable row level security;

create policy "Members can view org clients"
  on public.clients for select
  using (
    organization_id in (
      select organization_id from public.profiles where id = (select auth.uid())
    )
  );

create policy "Members can create org clients"
  on public.clients for insert
  with check (
    organization_id in (
      select organization_id from public.profiles where id = (select auth.uid())
    )
  );

create policy "Members can update org clients"
  on public.clients for update
  using (
    organization_id in (
      select organization_id from public.profiles where id = (select auth.uid())
    )
  )
  with check (
    organization_id in (
      select organization_id from public.profiles where id = (select auth.uid())
    )
  );

create policy "Members can delete org clients"
  on public.clients for delete
  using (
    organization_id in (
      select organization_id from public.profiles where id = (select auth.uid())
    )
  );

-- Keep updated_at fresh on every update
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clients_set_updated_at on public.clients;
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.handle_updated_at();
