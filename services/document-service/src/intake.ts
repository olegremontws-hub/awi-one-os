import { randomUUID } from 'node:crypto';

export type UploadedDocument = {
  documentId: string;
  projectId: string;
  filename: string;
  storageKey: string;
  mimeType?: string;
};

export function registerUploadedDocument(input: Omit<UploadedDocument, 'documentId'>) {
  const document: UploadedDocument = { documentId: randomUUID(), ...input };
  return {
    document,
    event: {
      eventId: randomUUID(),
      eventType: 'PROJECT_DOCUMENT_UPLOADED' as const,
      eventVersion: 1 as const,
      occurredAt: new Date().toISOString(),
      projectId: input.projectId,
      correlationId: randomUUID(),
      actor: { type: 'human' as const, id: 'project-user' },
      payload: {
        documentId: document.documentId,
        filename: document.filename,
        storageKey: document.storageKey,
        mimeType: document.mimeType,
      },
    },
  };
}
