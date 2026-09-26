import test from 'node:test';
import assert from 'node:assert/strict';
import { DeterministicDocumentAnalyzer } from '../services/document-intelligence/src/analyze.js';
import { planVS001 } from '../services/workflow-engine/src/vs001-pipeline.js';

test('VS-001 builds canonical H0 execution plan', async () => {
  const analysis = await new DeterministicDocumentAnalyzer().analyze({
    documentId: 'doc-1',
    filename: 'project-brief.pdf',
    text: 'Build a project intake dossier.',
  });
  const plan = planVS001({ projectId: 'project-1', analysis });
  assert.equal(plan.gate, 'H0');
  assert.deepEqual(plan.stages.map(x => x.agentId), ['PS-A003','DP-A008','EX-A006','OR-A009','KM-A007','OR-A014']);
  assert.equal(plan.stages[3].status, 'completed');
});

test('VS-001 stops protected action at H3', async () => {
  const analysis = await new DeterministicDocumentAnalyzer().analyze({
    documentId: 'doc-2',
    filename: 'contract.pdf',
  });
  const plan = planVS001({ projectId: 'project-1', analysis, legalWill: true });
  assert.equal(plan.gate, 'H3');
  assert.equal(plan.stages[3].status, 'waiting_human');
  assert.equal(plan.stages[4].status, 'waiting_human');
});
