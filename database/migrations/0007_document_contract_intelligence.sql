-- VS-002 Document & Contract Intelligence canonical data model v1
alter table project_documents add column if not exists document_kind text;
alter table project_documents add column if not exists current_version integer not null default 1;

create table document_versions (
 id uuid primary key default gen_random_uuid(), document_id uuid not null references project_documents(id) on delete cascade,
 version integer not null, storage_key text not null, sha256 text, extraction_method text,
 created_at timestamptz not null default now(), unique(document_id, version)
);
create table evidence (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id) on delete cascade,
 document_id uuid not null references project_documents(id) on delete cascade,
 document_version_id uuid references document_versions(id) on delete cascade, page_number integer, sheet_name text,
 cell_range text, bbox jsonb, quote text, created_at timestamptz not null default now()
);
create table extracted_facts (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id) on delete cascade,
 fact_type text not null, value jsonb not null, unit text, confidence numeric check(confidence between 0 and 1),
 status text not null default 'extracted' check(status in ('extracted','verified','rejected')), evidence_ids jsonb not null default '[]'::jsonb
);
create table document_relations (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id) on delete cascade,
 from_document_id uuid not null references project_documents(id) on delete cascade,
 to_document_id uuid not null references project_documents(id) on delete cascade,
 relation_type text not null, evidence_ids jsonb not null default '[]'::jsonb, created_at timestamptz not null default now()
);
create table work_items (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id) on delete cascade,
 work_package_id uuid references execution_nodes(id), code text, name text not null, description text, unit text,
 planned_quantity numeric, completed_quantity numeric not null default 0, design_ref text, technical_condition_ref text,
 evidence_ids jsonb not null default '[]'::jsonb, created_at timestamptz not null default now()
);
create table estimates (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id) on delete cascade,
 name text not null, estimate_type text not null, currency text not null default 'RUB', version integer not null default 1,
 status text not null default 'draft', created_at timestamptz not null default now()
);
create table price_evidence (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id) on delete cascade,
 source_type text not null, amount numeric not null, currency text not null, price_date date not null,
 source_document_id uuid references project_documents(id), evidence_ids jsonb not null default '[]'::jsonb,
 status text not null default 'unverified'
);
create table estimate_items (
 id uuid primary key default gen_random_uuid(), estimate_id uuid not null references estimates(id) on delete cascade,
 work_item_id uuid not null references work_items(id), quantity numeric not null, unit text not null,
 labor_amount numeric, material_amount numeric, equipment_amount numeric, logistics_amount numeric, subcontract_amount numeric,
 overhead_amount numeric, risk_amount numeric, vat_amount numeric, total_amount numeric not null,
 price_evidence_ids jsonb not null default '[]'::jsonb, evidence_ids jsonb not null default '[]'::jsonb
);
create table contracts (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id) on delete cascade,
 document_id uuid references project_documents(id), contract_number text, contract_date date, currency text not null default 'RUB',
 status text not null default 'draft', version integer not null default 1, created_at timestamptz not null default now()
);
create table contract_items (
 id uuid primary key default gen_random_uuid(), contract_id uuid not null references contracts(id) on delete cascade,
 work_item_id uuid references work_items(id), code text, name text not null, quantity numeric, unit text, unit_price numeric,
 amount numeric, currency text not null default 'RUB', evidence_ids jsonb not null default '[]'::jsonb, version integer not null default 1
);
create table obligations (
 id uuid primary key default gen_random_uuid(), contract_id uuid not null references contracts(id) on delete cascade,
 contract_item_id uuid references contract_items(id), obligated_party_id text, obligation_type text not null,
 description text not null, due_at timestamptz, status text not null default 'planned',
 evidence_ids jsonb not null default '[]'::jsonb
);
create index document_versions_document_idx on document_versions(document_id, version);
create index evidence_project_document_idx on evidence(project_id, document_id);
create index facts_project_type_idx on extracted_facts(project_id, fact_type);
create index work_items_project_idx on work_items(project_id);
create index estimates_project_idx on estimates(project_id);
create index contracts_project_idx on contracts(project_id);
