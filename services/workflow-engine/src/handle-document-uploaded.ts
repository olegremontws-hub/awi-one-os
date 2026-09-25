import { randomUUID } from 'node:crypto';
import { startProjectIntake } from './project-intake';

type DocumentUploadedEvent = {
  projectId: string;
  correlationId: string;
  payload: { documentId: string };
};

export function handleProjectDocumentUploaded(event: DocumentUploadedEvent) {
  const workflowRunId = randomUUID();
  const workflow = startProjectIntake({
    projectId: event.projectId,
    documentId: event.payload.documentId,
    correlationId: event.correlationId,
  });

  return {
    workflowRunId,
    ...workflow,
    nextCommand: {
      type: 'INVOKE_AGENT',
      agentId: 'INTAKE-DOC-001',
      purpose: 'document_intelligence',
      projectId: event.projectId,
      documentId: event.payload.documentId,
      correlationId: event.correlationId,
    },
  };
}
