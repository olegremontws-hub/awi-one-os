import test from 'node:test';
import assert from 'node:assert/strict';
import {getProjectDocumentFactoryPage} from '../services/project-service/src/project-document-factory-page.js';
import {routeProjectRequest} from '../services/project-service/src/http-routes.js';

function db(found=true){return{async query(sql:string){
 if(sql.includes('from projects'))return{rows:found?[{id:'p1',name:'ЖД <3>'}]:[]};
 if(sql.includes('from generated_document_runs'))return{rows:[{document_id:'d2',filename:'contract-v1.docx',document_kind:'contract',template_id:'contract-v1',template_version:1,render_format:'docx',source_evidence_ids:['e1'],created_at:'2026-09-26T20:00:00Z'}]};
 if(sql.includes("from human_gates where"))return{rows:[{id:'g1',level:'H3',reason:'Юридическое согласование',decided_at:'2026-09-26T19:00:00Z'}]};
 if(sql.includes('from evidence e join'))return{rows:[{id:'e1',document_id:'d1',filename:'source.pdf',page_number:4,sheet_name:null,cell_range:null,quote:'Подтверждённая сумма'}]};
 throw new Error('unexpected query '+sql);
}}}

test('Document Factory page uses real templates, approved gates, evidence and generated runs',async()=>{
 const page=await getProjectDocumentFactoryPage(db(),'p1');
 assert.equal(page.status,200);
 assert.match(page.body,/Фабрика документов/);
 assert.match(page.body,/contract-v1/);
 assert.match(page.body,/Юридическое согласование/);
 assert.match(page.body,/source\.pdf/);
 assert.match(page.body,/contract-v1\.docx/);
 assert.match(page.body,/\/v1\/projects\/\$\{projectId\}\/generated-documents/);
 assert.match(page.body,/ЖД &lt;3&gt;/);
 assert.doesNotMatch(page.body,/ЖД <3>/);
});

test('Document Factory page returns explicit 404 for unknown project',async()=>{
 const page=await getProjectDocumentFactoryPage(db(false),'missing');
 assert.equal(page.status,404);
 assert.match(page.body,/PROJECT_NOT_FOUND/);
});

test('generated document API requires configured object storage',async()=>{
 const result=await routeProjectRequest('POST','/v1/projects/p1/generated-documents',{kind:'contract',format:'docx',fields:[]},{db:db() as never,provider:{} as never,repository:{} as never});
 assert.deepEqual(result,{status:503,body:{error:'object_storage_not_configured'}});
});
