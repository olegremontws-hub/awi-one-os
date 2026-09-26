alter table project_documents
  add column if not exists processing_started_at timestamptz;

create index if not exists project_documents_processing_started_idx
  on project_documents(processing_status, processing_started_at)
  where processing_status = 'processing';
