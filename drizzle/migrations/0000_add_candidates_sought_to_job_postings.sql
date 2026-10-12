-- Nombre de candidats recherchés pour un poste (offres d'emploi).
alter table public.job_postings
  add column if not exists candidates_sought integer not null default 1
    constraint job_postings_candidates_sought_range check (candidates_sought between 1 and 999);

comment on column public.job_postings.candidates_sought is
  'Nombre de candidats que le poste doit pourvoir (interne RH, non affiché publiquement).';

-- Colonne ajoutée à une table existante : les droits en place s'appliquent déjà.
grant select, insert, update, delete on public.job_postings to authenticated;
grant all on public.job_postings to service_role;