export type EventEnvelope<TPayload = unknown> = {
  eventId: string;
  eventType: string;
  eventVersion: 1;
  occurredAt: string;
  projectId: string;
  correlationId: string;
  causationId?: string;
  actor: {
    type: 'human' | 'agent' | 'system';
    id: string;
  };
  payload: TPayload;
};

export type ProjectDocumentUploaded = EventEnvelope<{
  documentId: string;
  filename: string;
  storageKey: string;
  mimeType?: string;
}> & {
  eventType: 'PROJECT_DOCUMENT_UPLOADED';
};

export type ProjectIntakeCompleted = EventEnvelope<{
  workflowRunId: string;
  summary: string;
  facts: Record<string, unknown>;
  risks: Array<{ code: string; severity: 'low' | 'medium' | 'high' | 'critical'; description: string }>;
  humanGateRequired: boolean;
}> & {
  eventType: 'PROJECT_INTAKE_COMPLETED';
};
