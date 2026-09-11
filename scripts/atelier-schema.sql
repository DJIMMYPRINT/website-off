-- ═══════════════════════════════════════════════════════════════════════
--  Atelier — schéma SQL (projet Supabase dp-erp)
--
--  À exécuter une fois dans Supabase → SQL Editor.
--
--  Trois principes, repris tels quels du suivi de commande :
--
--   1. Les tables vivent dans le schéma `site`, pas dans `public`. Ce
--      dernier appartient à Prisma côté ERP (voir public._prisma_migrations)
--      et une table ajoutée là dériverait, voire disparaîtrait, à la
--      prochaine migration.
--   2. PostgREST n'expose que `public`. L'accès passe donc par des fonctions
--      SECURITY DEFINER, au search_path épinglé, dont l'EXECUTE n'est
--      accordé qu'à service_role.
--   3. RLS activée sans aucune politique sur les tables : personne ne lit ni
--      n'écrit avec la clé anon, même si elle fuite.
-- ═══════════════════════════════════════════════════════════════════════

create schema if not exists site;

-- ── Notes vocales ─────────────────────────────────────────────────────
create table if not exists site.voice_notes (
  id          text primary key,
  created_at  timestamptz not null default now(),
  transcript  text not null,
  resume      text
);

-- ── Tâches issues des notes ───────────────────────────────────────────
create table if not exists site.tasks (
  id            text primary key,
  note_id       text references site.voice_notes(id) on delete set null,
  created_at    timestamptz not null default now(),
  type          text not null check (type in ('tache','note','maj_commande')),
  titre         text not null,
  client        text,
  ref           text,
  statut        text check (statut in ('recue','confirmee','production','expediee','livree')),
  due_date      date,
  montant       integer,
  confiance     real not null default 0,
  extrait       text,
  needs_review  boolean not null default false,
  done          boolean not null default false,
  done_at       timestamptz
);

-- La checklist interroge toujours « les tâches ouvertes, par échéance ».
create index if not exists tasks_open_due_idx on site.tasks (done, due_date);
create index if not exists tasks_ref_idx      on site.tasks (ref) where ref is not null;

alter table site.tasks       enable row level security;
alter table site.voice_notes enable row level security;
-- Aucune policy : seul service_role (qui contourne RLS) passe.

-- ── Fonctions exposées ────────────────────────────────────────────────

create or replace function public.site_note_create(
  p_id text, p_transcript text, p_resume text
) returns site.voice_notes
language sql security definer set search_path = site, pg_temp as $$
  insert into site.voice_notes (id, transcript, resume)
  values (p_id, p_transcript, p_resume)
  on conflict (id) do update set transcript = excluded.transcript,
                                 resume     = excluded.resume
  returning *;
$$;

create or replace function public.site_task_create(
  p_id text, p_note_id text, p_type text, p_titre text, p_client text,
  p_ref text, p_statut text, p_due_date date, p_montant integer,
  p_confiance real, p_extrait text, p_needs_review boolean
) returns site.tasks
language sql security definer set search_path = site, pg_temp as $$
  insert into site.tasks (id, note_id, type, titre, client, ref, statut,
                          due_date, montant, confiance, extrait, needs_review)
  values (p_id, p_note_id, p_type, p_titre, p_client, p_ref, p_statut,
          p_due_date, p_montant, p_confiance, p_extrait, p_needs_review)
  on conflict (id) do nothing
  returning *;
$$;

-- Les tâches ouvertes, plus celles cochées depuis `p_since` (par défaut
-- 30 jours) : de quoi rouvrir une tâche fermée par erreur sans ramener
-- l'intégralité de l'historique à chaque chargement.
create or replace function public.site_tasks_list(p_since timestamptz)
returns setof site.tasks
language sql security definer set search_path = site, pg_temp as $$
  select * from site.tasks
  where done = false
     or done_at >= coalesce(p_since, now() - interval '30 days')
  order by due_date nulls last, created_at desc
  limit 500;
$$;

create or replace function public.site_task_update(
  p_id text, p_done boolean, p_due_date date, p_titre text, p_needs_review boolean
) returns site.tasks
language sql security definer set search_path = site, pg_temp as $$
  update site.tasks set
    done         = coalesce(p_done, done),
    done_at      = case when p_done is true  then now()
                        when p_done is false then null
                        else done_at end,
    due_date     = coalesce(p_due_date, due_date),
    titre        = coalesce(p_titre, titre),
    needs_review = coalesce(p_needs_review, needs_review)
  where id = p_id
  returning *;
$$;

create or replace function public.site_task_delete(p_id text)
returns void
language sql security definer set search_path = site, pg_temp as $$
  delete from site.tasks where id = p_id;
$$;

-- ── Permissions ───────────────────────────────────────────────────────
-- Révoquer d'abord : create or replace ne remet pas les droits à zéro, et
-- PUBLIC reçoit EXECUTE par défaut sur toute fonction nouvellement créée.
revoke execute on function
  public.site_note_create(text,text,text),
  public.site_task_create(text,text,text,text,text,text,text,date,integer,real,text,boolean),
  public.site_tasks_list(timestamptz),
  public.site_task_update(text,boolean,date,text,boolean),
  public.site_task_delete(text)
from public, anon, authenticated;

grant execute on function
  public.site_note_create(text,text,text),
  public.site_task_create(text,text,text,text,text,text,text,date,integer,real,text,boolean),
  public.site_tasks_list(timestamptz),
  public.site_task_update(text,boolean,date,text,boolean),
  public.site_task_delete(text)
to service_role;
