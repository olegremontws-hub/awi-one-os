-- VS-002 generated document command ledger
create table generated_document_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  document_id uuid not null unique references project_documents(id) on delete cascade,
  template_id text not null,
  template_version integer not null,
  render_format text not null check (render_format in ('docx','xlsx','pdf')),
  human_gate_id uuid not null references human_gates(id),
  source_evidence_ids jsonb not null default '[]'::jsonb,
  correlation_id uuid not null,
  actor_id text not null,
  created_at timestamptz not null default now(),
  unique(project_id, correlation_id)
);

create index generated_document_runs_project_idx
  on generated_document_runs(project_id, created_at desc);
