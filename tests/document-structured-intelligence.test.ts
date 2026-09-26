import test from 'node:test';import assert from 'node:assert/strict';
import {classifyDocument} from '../services/document-service/src/document-classifier.js';
import {extractFactCandidates} from '../services/document-service/src/structured-extraction.js';
import {toEvidence,requiresHumanReview} from '../services/document-service/src/evidence-mapper.js';
test('classifies synthetic contract and extracts evidence-backed facts',()=>{const text='ДОГОВОР № 38-TEST\nЦена договора составляет 1 200 000,00 руб.';const c=classifyDocument(text,'contract.pdf');assert.equal(c.type,'contract');const facts=extractFactCandidates(c.type,text);assert.equal(facts.length,2);const e=toEvidence({documentId:'d',documentVersionId:'v',pageNumber:1},facts);assert.equal(e[0].documentId,'d');assert.ok(e.every(x=>x.quote.length>0));});
test('low confidence classification requires review',()=>{const c=classifyDocument('неопределенный документ','file.bin');assert.equal(c.type,'other');assert.equal(requiresHumanReview(c.confidence),true);});
test('additional agreement outranks generic contract',()=>{assert.equal(classifyDocument('Дополнительное соглашение к договору № 1').type,'additional_agreement');});
