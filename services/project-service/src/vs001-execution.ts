import type { ModelProvider } from '../../agent-runtime/src/providers.js';
import { runPSA003 } from '../../agent-runtime/src/structured-agent.js';
import { buildVS001Decision } from './vs001-result.js';
import { createVS001PersistenceBundle, persistVS001, type VS001Repository } from './vs001-persistence.js';
import { createRoundTableSnapshot } from './round-table-api.js';

export async function executeVS001(input: {
  projectId: string; correlationId: string; documentText: string; evidenceRefs: string[];
  provider: ModelProvider; repository: VS001Repository;
}) {
  const analysis = await runPSA003(input.provider, {
    documentText: input.documentText,
    evidenceRefs: input.evidenceRefs,
  });
  const decision = buildVS001Decision({
    projectId: input.projectId, analysis, evidenceRefs: input.evidenceRefs,
  });
  const bundle = createVS001PersistenceBundle({
    projectId: input.projectId, correlationId: input.correlationId,
    analysis, decision, evidenceRefs: input.evidenceRefs,
  });
  await persistVS001(input.repository, bundle);
  return { analysis, decision, roundTable: createRoundTableSnapshot(input.projectId, [decision]) };
}
