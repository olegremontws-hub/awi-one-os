-- VS-002 financial movement persistence for Round Table
create table contract_financial_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  contract_id uuid references contracts(id) on delete cascade,
  contract_item_id uuid references contract_items(id) on delete cascade,
  event_type text not null check (event_type in ('approved_change','accepted','invoiced','paid')),
  amount numeric not null check (amount >= 0),
  currency text not null default 'RUB',
  source_document_id uuid references project_documents(id),
  evidence_ids jsonb not null default '[]'::jsonb,
  human_gate_id uuid references human_gates(id),
  status text not null default 'verified' check (status in ('unverified','verified','rejected')),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (event_type <> 'approved_change' or human_gate_id is not null),
  check (status <> 'verified' or jsonb_array_length(evidence_ids) > 0)
);

create index contract_financial_events_project_type_idx
  on contract_financial_events(project_id, event_type, status);
create index contract_financial_events_contract_idx
  on contract_financial_events(contract_id, contract_item_id);
