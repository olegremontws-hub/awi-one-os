import type { ModelProvider } from '../../agent-runtime/src/providers.js';
import type { VS001Repository } from './vs001-persistence.js';
import type { GateSqlClient } from './human-gate-service.js';
import { handleRoundTableIntake } from './round-table-handler.js';
import { decideHumanGate } from './human-gate-service.js';
import { getProjectHistory } from './project-history.js';

export type HttpDependencies = {
  provider: ModelProvider;
  repository: VS001Repository;
  db: GateSqlClient;
};

export async function routeProjectRequest(method: string, path: string, body: Record<string, unknown>, deps: HttpDependencies) {
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
