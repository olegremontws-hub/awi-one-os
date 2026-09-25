import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyHumanGate } from '../services/workflow-engine/src/human-gates.js';

test('canonical H0-H4 classification',()=>{
  assert.equal(classifyHumanGate({}),'H0');
  assert.equal(classifyHumanGate({notifySignificant:true}),'H1');
  assert.equal(classifyHumanGate({externalCommunication:true}),'H2');
  assert.equal(classifyHumanGate({money:true}),'H3');
  assert.equal(classifyHumanGate({physicalWorld:true}),'H4');
});
test('higher authority gate wins',()=>{
  assert.equal(classifyHumanGate({notifySignificant:true,professionalResponsibility:true}),'H3');
  assert.equal(classifyHumanGate({externalCommunication:true,physicalWorld:true}),'H4');
});
