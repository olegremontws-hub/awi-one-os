import type { ModelProvider } from '../../agent-runtime/src/providers.js';
import type { VS001Repository } from './vs001-persistence.js';
import type { GateSqlClient } from './human-gate-service.js';
import { handleRoundTableIntake } from './round-table-handler.js';
import { decideHumanGate } from './human-gate-service.js';
import { getProjectHistory } from './project-history.js';
import type { ObjectStorage } from '../../document-service/src/storage.js';
import type { OcrProvider } from '../../document-service/src/ingestion-gateway.js';
import { uploadAndRunVS001 } from './upload-handler.js';
import { getRoundTableState } from './round-table-query.js';
import { getProject, changeProjectStatus } from './project-lifecycle.js';
import { createDurableProject } from './project-create.js';
import { recordFinancialEvent, type FinancialEventType } from './financial-event-service.js';
import { generateProjectDocument, type GeneratedDocumentFieldInput } from './generated-document-service.js';
import { requestDocumentReview } from './document-review-service.js';

export type HttpDependencies = {
  provider: ModelProvider;
  repository: VS001Repository;
  db: GateSqlClient;
  storage?: ObjectStorage;
  ocrProvider?: OcrProvider;
};

export async function routeProjectRequest(method: string, path: string, body: Record<string, unknown>, deps: HttpDependencies) {
  if (method === 'POST' && path === '/v1/projects') {
    try {
      return { status: 201, body: await createDurableProject(deps.db, {
        projectCode: String(body.projectCode ?? ''), name: String(body.name ?? ''),
      })};
    } catch (error) {
      return { status: 400, body: { error: error instanceof Error ? error.message : 'invalid_project' } };
    }
  }

  const upload = path.match(/^\/v1\/projects\/([^/]+)\/documents$/);
  if (method === 'POST' && upload) {
    if (!deps.storage) return { status: 503, body: { error: 'object_storage_not_configured' } };
    return { status: 201, body: await uploadAndRunVS001({
      projectId: upload[1]!,
      filename: String(body.filename ?? ''),
      mimeType: String(body.mimeType ?? 'application/octet-stream'),
      bytes: Buffer.from(String(body.base64 ?? ''), 'base64'),
      correlationId: String(body.correlationId ?? crypto.randomUUID()),
      provider: deps.provider, repository: deps.repository, db: deps.db, storage: deps.storage, ocrProvider: deps.ocrProvider,
    })};
  }

  const intake = path.match(/^\/v1\/projects\/([^/]+)\/intake$/);
  if (method === 'POST' && intake) {
    return { status: 200, body: await handleRoundTableIntake({
      projectId: intake[1]!,
      documentId: String(body.documentId ?? ''),
      documentText: String(body.documentText ?? ''),
      correlationId: String(body.correlationId ?? crypto.randomUUID()),
      provider: deps.provider,
      repository: deps.repository,
    })};
  }

  const gate = path.match(/^\/v1\/projects\/([^/]+)\/decisions\/([^/]+)\/(approve|reject)$/);
  if (method === 'POST' && gate) {
    return { status: 200, body: await decideHumanGate(deps.db, {
      projectId: gate[1]!, decisionId: gate[2]!,
      action: gate[3] as 'approve'|'reject',
      actorId: String(body.actorId ?? ''),
      note: body.note ? String(body.note) : undefined,
      correlationId: String(body.correlationId ?? crypto.randomUUID()),
    })};
  }

  const project = path.match(/^\/v1\/projects\/([^/]+)$/);
  if (method === 'GET' && project) {
    const found = await getProject(deps.db, project[1]!);
    return found ? { status: 200, body: found } : { status: 404, body: { error: 'project_not_found' } };
  }

  const projectStatus = path.match(/^\/v1\/projects\/([^/]+)\/status$/);
  if (method === 'POST' && projectStatus) {
    const status = String(body.status ?? '');
    if (!['intake','active','closed'].includes(status)) return { status: 400, body: { error: 'invalid_project_status' } };
    return { status: 200, body: await changeProjectStatus(deps.db, {
      projectId: projectStatus[1]!, status: status as 'intake'|'active'|'closed',
      actorId: String(body.actorId ?? ''), correlationId: String(body.correlationId ?? crypto.randomUUID()),
    })};
  }

  const roundTable = path.match(/^\/v1\/projects\/([^/]+)\/round-table$/);
  if (method === 'GET' && roundTable) {
    return { status: 200, body: await getRoundTableState(deps.db, roundTable[1]!) };
  }

  const history = path.match(/^\/v1\/projects\/([^/]+)\/history$/);
  if (method === 'GET' && history) {
    return { status: 200, body: await getProjectHistory(deps.db, history[1]!) };
  }

  const documentReview = path.match(/^\/v1\/projects\/([^/]+)\/documents\/([^/]+)\/review$/);
  if (method === 'POST' && documentReview) {
    return { status: 201, body: await requestDocumentReview(deps.db, {
      projectId: documentReview[1]!, documentId: documentReview[2]!, actorId: String(body.actorId ?? ''),
      correlationId: String(body.correlationId ?? crypto.randomUUID()),
    }) };
  }

  const financialEvent = path.match(/^\/v1\/projects\/([^/]+)\/financial-events$/);
  if (method === 'POST' && financialEvent) {
    return { status: 201, body: await recordFinancialEvent(deps.db, {
      projectId: financialEvent[1]!,
      eventType: String(body.eventType ?? '') as FinancialEventType,
      amount: Number(body.amount),
      currency: String(body.currency ?? ''),
      evidenceIds: Array.isArray(body.evidenceIds) ? body.evidenceIds.map(String) : [],
      actorId: String(body.actorId ?? ''),
      correlationId: String(body.correlationId ?? crypto.randomUUID()),
      humanGateId: body.humanGateId ? String(body.humanGateId) : undefined,
      contractId: body.contractId ? String(body.contractId) : undefined,
      contractItemId: body.contractItemId ? String(body.contractItemId) : undefined,
      sourceDocumentId: body.sourceDocumentId ? String(body.sourceDocumentId) : undefined,
    }) };
  }

  const generatedDocument = path.match(/^\/v1\/projects\/([^/]+)\/generated-documents$/);
  if (method === 'POST' && generatedDocument) {
    if (!deps.storage) return { status: 503, body: { error: 'object_storage_not_configured' } };
    const fields = Array.isArray(body.fields) ? body.fields.map(field => {
      const item = field as Record<string, unknown>;
      return { key: String(item.key ?? ''), value: typeof item.value === 'number' ? item.value : String(item.value ?? ''), evidenceIds: Array.isArray(item.evidenceIds) ? item.evidenceIds.map(String) : [] } satisfies GeneratedDocumentFieldInput;
    }) : [];
    return { status: 201, body: await generateProjectDocument(deps.db, deps.storage, {
      projectId: generatedDocument[1]!, kind: String(body.kind ?? '') as Parameters<typeof generateProjectDocument>[2]['kind'],
      format: String(body.format ?? '') as Parameters<typeof generateProjectDocument>[2]['format'], fields,
      humanGateId: String(body.humanGateId ?? ''), actorId: String(body.actorId ?? ''), correlationId: String(body.correlationId ?? crypto.randomUUID()),
    })};
  }

  return { status: 404, body: { error: 'not_found' } };
}
