import test from 'node:test';
import assert from 'node:assert/strict';
import { runClientJourney } from '../services/client-tester/src/journey.js';

test('QA-CLIENT-001 passes a complete synthetic client journey', async()=>{
  const report=await runClientJourney({
    async health(){return true},
    async createProject(){return {id:'test-project'}},
    async uploadDocument(){return {document:{documentId:'doc-1'},decision:{id:'decision-1'}}},
    async roundTable(){return {decisionCards:[{}],timeline:[{}]}},
    async history(){return [{}]},
  });
  assert.equal(report.agentId,'QA-CLIENT-001');
  assert.equal(report.passed,true);
  assert.equal(report.steps.length,5);
});

test('QA-CLIENT-001 blocks release when service is unhealthy', async()=>{
  const report=await runClientJourney({
    async health(){return false},
    async createProject(){throw new Error('must not run')},
    async uploadDocument(){throw new Error('must not run')},
    async roundTable(){throw new Error('must not run')},
    async history(){throw new Error('must not run')},
  });
  assert.equal(report.passed,false);
  assert.equal(report.steps.length,1);
});
