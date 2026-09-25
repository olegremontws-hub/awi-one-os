import type { ModelProvider } from '../../agent-runtime/src/providers.js';
import type { VS001Repository } from './vs001-persistence.js';
import { executeVS001 } from './vs001-execution.js';

export async function handleRoundTableIntake(input: {
  projectId: string;
  documentId: string;
  documentText: string;
  correlationId: string;
  provider: ModelProvider;
  repository: VS001Repository;
}) {
  return executeVS001({
    projectId: input.projectId,
    correlationId: input.correlationId,
    documentText: input.documentText,
    evidenceRefs: [`document:${input.documentId}`],
    provider: input.provider,
    repository: input.repository,
  });
}
