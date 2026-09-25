import test from 'node:test';
import assert from 'node:assert/strict';
import type { ModelProvider, ModelRequest, ModelResponse } from '../services/agent-runtime/src/providers.js';
import { executeVS001 } from '../services/project-service/src/vs001-execution.js';
import { InMemoryVS001Repository } from '../services/project-service/src/in-memory-vs001-repository.js';
import type { RequirementsAnalysis } from '../services/agent-runtime/src/structured-agent.js';

class FakeProvider implements ModelProvider {
  async generate<T>(_request: ModelRequest): Promise<ModelResponse<T>> {
    const output: RequirementsAnalysis = {
      projectSummary: 'Verified project intake',
      requirements: [{ id: 'R1', text: 'Prepare dossier', sourceRef: 'document:doc-1' }],
      missingInformation: [], risks: [], assumptions: [], confidence: 0.99,
    };
    return { model: 'fake-ci-model', output: output as T };
  }
}

test('VS-001 executes and atomically prepares durable project records', async () => {
  const repository = new InMemoryVS001Repository();
  const result = await executeVS001({
    projectId: 'project-1', correlationId: 'corr-1',
    documentText: 'Prepare dossier', evidenceRefs: ['document:doc-1'],
    provider: new FakeProvider(), repository,
  });
  assert.equal(repository.bundles.length, 1);
  assert.equal(repository.bundles[0]?.agentRun.agentRoleId, 'PS-A003');
  assert.equal(repository.bundles[0]?.memory.kind, 'decision');
  assert.equal(repository.bundles[0]?.audit.eventType, 'PROJECT_INTAKE_DECISION_PREPARED');
  assert.equal(result.roundTable.decisionCards[0]?.id, result.decision.id);
});
