alter table project_documents add column if not exists correlation_id uuid;
alter table project_documents add column if not exists content_sha256 text;
alter table project_documents add column if not exists failure_reason text;

create unique index if not exists project_documents_project_hash_idx
  on project_documents(project_id, content_sha256)
  where content_sha256 is not null;

create unique index if not exists agent_runs_project_correlation_role_idx
  on agent_runs(project_id, correlation_id, agent_role_id);

alter table human_gates add constraint human_gates_gate_level_check
  check (gate_level is null or gate_level in ('H2','H3','H4'));
