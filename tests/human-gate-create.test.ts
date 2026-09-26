import test from 'node:test';
import assert from 'node:assert/strict';
import { createHumanGateIfRequired } from '../services/project-service/src/human-gate-create.js';

class Db { calls: Array<{sql:string;params?:unknown[]}> = []; async query(sql:string,params?:unknown[]){ this.calls.push({sql,params}); return {rows:[]}; } }

test('H3 decision creates durable pending human action', async () => {
  const db = new Db();
  const result = await createHumanGateIfRequired(db, {
    id:'d1', projectId:'p1', title:'Approve', summary:'Summary', facts:{}, risks:[], evidenceRefs:['document:x'],
    requestedDecision:'Approve protected action', humanGate:{ level:'H3', reason:'authority required', status:'pending' },
  });
  assert.equal(result?.level, 'H3');
  assert.equal(db.calls.length, 1);
});

test('H0 decision creates no human action', async () => {
  const db = new Db();
  const result = await createHumanGateIfRequired(db, {
    id:'d2', projectId:'p1', title:'Info', summary:'Summary', facts:{}, risks:[], evidenceRefs:[],
    humanGate:{ level:'H0', reason:'autonomous', status:'not_required' },
  });
  assert.equal(result, null);
  assert.equal(db.calls.length, 0);
});
