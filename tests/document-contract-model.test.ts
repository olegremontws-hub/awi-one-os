import test from 'node:test';
import assert from 'node:assert/strict';
import type { EstimateItem, EvidenceLocator, WorkItem } from '../packages/contracts/src/document-intelligence.js';

test('VS-002 contracts preserve evidence from quantity through estimate', () => {
  const evidence: EvidenceLocator = { documentId:'d1', documentVersionId:'v1', page:2, quote:'15.2 м.п.' };
  const work: WorkItem = { id:'w1', projectId:'p1', name:'Устройство трубопровода', unit:'м.п.', plannedQuantity:15.2, evidenceIds:['e1'] };
  const item: EstimateItem = { id:'ei1', estimateId:'est1', workItemId:work.id, quantity:15.2, unit:'м.п.', totalAmount:0, priceEvidenceIds:[], evidenceIds:work.evidenceIds };
  assert.equal(evidence.page, 2);
  assert.deepEqual(item.evidenceIds, ['e1']);
  assert.equal(item.priceEvidenceIds.length, 0, 'missing prices remain explicit rather than invented');
});
