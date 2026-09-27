import test from 'node:test';import assert from 'node:assert/strict';import {compareItems,validateContractGraph} from '../services/document-service/src/contract-comparison.js';
const i=(id:string,key:string,q:number,evidenceIds:string[])=>({id,key,name:key,quantity:q,unit:'м',evidenceIds});
test('comparison reports match changed missing extra and unverified',()=>{const r=compareItems([i('1','A',10,['e1']),i('2','B',20,['e2']),i('3','C',1,[])],[i('4','A',10,['e4']),i('5','B',25,['e5']),i('6','D',2,['e6']),i('7','C',1,[])]);assert.deepEqual(Object.fromEntries(r.map(x=>[x.key,x.status])),{A:'MATCH',B:'CHANGED',C:'UNVERIFIED',D:'EXTRA'});});
test('comparison reports missing',()=>{assert.equal(compareItems([i('1','A',10,['e1'])],[])[0].status,'MISSING');});
test('contract graph rejects unsupported relation evidence',()=>{assert.equal(validateContractGraph([{fromId:'tu',toId:'design',relation:'REQUIRES',evidenceIds:[]}]).length,1);});
