import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVS001Decision } from '../services/project-service/src/vs001-result.js';
import { createRoundTableSnapshot } from '../services/project-service/src/round-table-api.js';

test('safe intake analysis becomes H0 Round Table decision card', () => {
  const card = buildVS001Decision({
    projectId: 'project-1',
    evidenceRefs: ['document:doc-1'],
    analysis: {
      projectSummary: 'Project intake',
      requirements: [{ id: 'R1', text: 'Create dossier', sourceRef: 'document:doc-1' }],
      missingInformation: [],
      risks: [],
      assumptions: [],
      confidence: 0.95,
    },
  });
  assert.equal(card.humanGate.level, 'H0');
  assert.equal(card.humanGate.status, 'not_required');
  assert.equal(createRoundTableSnapshot('project-1', [card]).pendingHumanActions.length, 0);
});

test('critical risk creates H3 pending action for Round Table', () => {
  const card = buildVS001Decision({
    projectId: 'project-1',
    evidenceRefs: ['document:doc-2'],
    analysis: {
      projectSummary: 'Risky intake',
      requirements: [],
      missingInformation: [],
      risks: [{ severity: 'critical', description: 'Professional approval required' }],
      assumptions: [],
      confidence: 0.8,
    },
  });
  const snapshot = createRoundTableSnapshot('project-1', [card]);
  assert.equal(card.humanGate.level, 'H3');
  assert.equal(snapshot.pendingHumanActions[0]?.decisionId, card.id);
});
