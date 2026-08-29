-- Idempotent schema for the single canonical table behind ADR 0001's whole-document
-- union sync. One user, one baked-in key, no accounts: this table is world-readable
-- and world-writable by design, and the app defends itself by *validating and
-- rebuilding* every row it reads (toTask in src/store.ts). That deliberate public
-- exposure is a conscious decision of ADR 0001, not an oversight -- never "harden" it
-- with auth or RLS policies that the anon key cannot pass, or sync breaks.
--
-- Deletion is a flag (deleted), never a row removal: union merge would resurrect
-- anything purged on one device but still present on the other. There is therefore
-- NO DELETE policy and column DELETE is revoked.

create table if not exists public.tasks (
  id        text primary key check (length(btrim(id)) > 0),
  text      text not null check (length(btrim(text)) > 0),
  kind      text not null check (kind in ('work', 'college', 'chore')),
  deadline  date,
  done      boolean not null default false,
  deleted   boolean not null default false,
  "updatedAt" bigint not null check ("updatedAt" between 0 and 4102444800000)
);

alter table public.tasks enable row level security;

-- Minimal surface for the anon role; everything else is revoked up front.
revoke all on table public.tasks from anon, authenticated;
grant select, insert, update on table public.tasks to anon;

drop policy if exists tasks_anon_select on public.tasks;
create policy tasks_anon_select
  on public.tasks for select
  to anon
  using (true);

drop policy if exists tasks_anon_insert on public.tasks;
create policy tasks_anon_insert
  on public.tasks for insert
  to anon
  with check (true);

drop policy if exists tasks_anon_update on public.tasks;
create policy tasks_anon_update
  on public.tasks for update
  to anon
  using (true)
  with check (true);

-- No DELETE policy: tombstone-only removal (deleted = true), per ADR 0001.
-- No purge. If a full wipe is ever wanted it must be a destructive op by the
-- owner, never something the anon key can reach.