import test from 'node:test';
import assert from 'node:assert/strict';
import type {ModelProvider,ModelRequest,ModelResponse} from '../services/agent-runtime/src/providers.js';
import type {RequirementsAnalysis} from '../services/agent-runtime/src/structured-agent.js';
import {uploadAndRunVS001} from '../services/project-service/src/upload-handler.js';

test('image upload uses configured OCR and persists page Evidence before AI intake',async()=>{
  const objects=new Map<string,Uint8Array>(),queries:string[]=[];let evidenceNo=0,capturedInput='';
  const storage={async put(k:string,b:Uint8Array){objects.set(k,b)},async get(k:string){const v=objects.get(k);if(!v)throw new Error('missing');return v},async delete(k:string){objects.delete(k)}};
  const db={async query(sql:string){
    queries.push(sql);
    if(sql.startsWith('select id,filename,storage_key'))return{rows:[]};
    if(sql.startsWith('insert into project_documents'))return{rows:[{id:'doc1'}],rowCount:1};
    if(sql.includes('insert into document_versions'))return{rows:[{id:'v1'}]};
    if(sql.includes('insert into evidence'))return{rows:[{id:'e'+(++evidenceNo)}]};
    if(sql.startsWith('update project_documents'))return{rows:[],rowCount:1};
    return{rows:[]};
  }};
  const provider:ModelProvider={async ready(){return true},async generate<T>(request:ModelRequest):Promise<ModelResponse<T>>{capturedInput=request.input;const output:RequirementsAnalysis={projectSummary:'OCR project',requirements:[],missingInformation:[],risks:[],assumptions:[],confidence:.9};return{model:'test',output:output as T}}};
  const repository={async commit(){}};
  const ocrProvider={id:'ocr-test',async ready(){return true},async extract(){return{provider:'ocr-test',pipelineVersion:'1',pages:[{pageNumber:1,text:'Технические условия',confidence:.96}]}}};
  const result=await uploadAndRunVS001({projectId:'p1',filename:'scan.png',mimeType:'image/png',bytes:new Uint8Array([1,2,3]),correlationId:'11111111-1111-4111-8111-111111111111',provider,repository,db,storage,ocrProvider});
  assert.equal(String((result.document as any).documentId).length>0,true);
  assert.match(capturedInput,/Технические условия/);
  assert.equal(queries.some(q=>q.includes('DOCUMENT_OCR_EXTRACTED')),true);
  assert.equal(queries.filter(q=>q.includes('insert into evidence')).length,1);
  assert.equal(objects.size,1);
});
