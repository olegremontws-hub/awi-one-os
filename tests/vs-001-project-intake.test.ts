import test from 'node:test';
import assert from 'node:assert/strict';
import { registerUploadedDocument } from '../services/document-service/src/intake';
import { handleProjectDocumentUploaded } from '../services/workflow-engine/src/handle-document-uploaded';
import { requiresHumanGate } from '../services/workflow-engine/src/project-intake';

test('uploaded project document starts VS-001 and invokes document intelligence', () => {
  const { event } = registerUploadedDocument({
    projectId: 'project-1',
    filename: 'brief.pdf',
    storageKey: 'projects/project-1/brief.pdf',
    mimeType: 'application/pdf',
  });

  assert.equal(event.eventType, 'PROJECT_DOCUMENT_UPLOADED');
  const run = handleProjectDocumentUploaded(event);
  assert.equal(run.workflowKey, 'VS-001_PROJECT_INTAKE');
  assert.equal(run.currentStep, 'document_intelligence');
  assert.equal(run.nextCommand.agentId, 'INTAKE-DOC-001');
});

test('critical risk requires a human gate', () => {
  assert.equal(requiresHumanGate({ criticalRiskCount: 1 }), true);
  assert.equal(requiresHumanGate({ criticalRiskCount: 0 }), false);
});
