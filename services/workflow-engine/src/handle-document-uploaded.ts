import { randomUUID } from 'node:crypto';
import { startProjectIntake } from './project-intake.js';

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
      agentId: 'PS-A003',
      purpose: 'requirements_analysis',
      projectId: event.projectId,
      documentId: event.payload.documentId,
      correlationId: event.correlationId,
    },
  };
}
