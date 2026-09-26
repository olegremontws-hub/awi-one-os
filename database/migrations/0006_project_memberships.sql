create table if not exists project_memberships (
  project_id uuid not null references projects(id) on delete cascade,
  actor_id text not null,
  role text not null,
  created_at timestamptz not null default now(),
  primary key (project_id, actor_id)
);

create index if not exists project_memberships_actor_idx
  on project_memberships(actor_id, project_id);
