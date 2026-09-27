-- VS-002 financial event command idempotency
alter table contract_financial_events
  add column if not exists correlation_id uuid,
  add column if not exists actor_id text;

create unique index if not exists contract_financial_events_project_correlation_idx
  on contract_financial_events(project_id, correlation_id)
  where correlation_id is not null;
