create table if not exists execution_nodes (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  parent_id uuid references execution_nodes(id) on delete cascade,
  kind text not null check (kind in ('work_package','task','decision','human_action')),
  title text not null,
  status text not null check (status in ('planned','ready','running','waiting_human','blocked','completed','failed')),
  assigned_actor_id text,
  dependency_ids jsonb not null default '[]'::jsonb,
  input_refs jsonb not null default '[]'::jsonb,
  output_refs jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists decisions (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  execution_node_id uuid references execution_nodes(id),
  title text not null,
  summary text not null,
  gate_level text not null check (gate_level in ('H0','H1','H2','H3','H4')),
  status text not null check (status in ('not_required','pending','approved','rejected')),
  evidence_refs jsonb not null default '[]'::jsonb,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists agent_runs (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  agent_role_id text not null,
  agent_role_version text not null default '1.1',
  trigger_event_id uuid,
  execution_node_id uuid references execution_nodes(id),
  status text not null check (status in ('queued','running','completed','needs_input','waiting_human','blocked','escalated','failed')),
  input_refs jsonb not null default '[]'::jsonb,
  output_refs jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  correlation_id uuid not null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists memory_records (
  id uuid primary key,
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null check (kind in ('fact','decision','lesson')),
  content jsonb not null,
  source_refs jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists execution_nodes_project_idx on execution_nodes(project_id, status);
create index if not exists agent_runs_project_idx on agent_runs(project_id, status);
create index if not exists memory_records_project_idx on memory_records(project_id, kind);
