alter table audit_events add column if not exists correlation_id uuid;
alter table audit_events add column if not exists causation_id uuid;
alter table audit_events add column if not exists evidence_refs jsonb not null default '[]'::jsonb;

alter table human_gates add column if not exists decision_id uuid references decisions(id);
alter table human_gates add column if not exists gate_level text;
alter table human_gates add column if not exists reason text;
alter table human_gates add column if not exists decided_by text;
alter table human_gates add column if not exists decision_note text;

create index if not exists audit_events_project_time_idx on audit_events(project_id, occurred_at);
create index if not exists human_gates_project_status_idx on human_gates(project_id, status);
