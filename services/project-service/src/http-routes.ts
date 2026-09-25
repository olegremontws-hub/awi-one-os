import type { ModelProvider } from '../../agent-runtime/src/providers.js';
import type { VS001Repository } from './vs001-persistence.js';
import type { GateSqlClient } from './human-gate-service.js';
import { handleRoundTableIntake } from './round-table-handler.js';
import { decideHumanGate } from './human-gate-service.js';
import { getProjectHistory } from './project-history.js';
import type { ObjectStorage } from '../../document-service/src/storage.js';
import { uploadAndRunVS001 } from './upload-handler.js';

export type HttpDependencies = {
  provider: ModelProvider;
  repository: VS001Repository;
  db: GateSqlClient;
  storage?: ObjectStorage;
};

export async function routeProjectRequest(method: string, path: string, body: Record<string, unknown>, deps: HttpDependencies) {
  const upload = path.match(/^\/v1\/projects\/([^/]+)\/documents$/);
  if (method === 'POST' && upload) {
    if (!deps.storage) return { status: 503, body: { error: 'object_storage_not_configured' } };
    return { status: 201, body: await uploadAndRunVS001({
      projectId: upload[1]!,
      filename: String(body.filename ?? ''),
      mimeType: String(body.mimeType ?? 'application/octet-stream'),
      base64: String(body.base64 ?? ''),
      correlationId: String(body.correlationId ?? crypto.randomUUID()),
      provider: deps.provider, repository: deps.repository, db: deps.db, storage: deps.storage,
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

  const history = path.match(/^\/v1\/projects\/([^/]+)\/history$/);
  if (method === 'GET' && history) {
    return { status: 200, body: await getProjectHistory(deps.db, history[1]!) };
  }

  return { status: 404, body: { error: 'not_found' } };
}
