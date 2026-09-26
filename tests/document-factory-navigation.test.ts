import test from 'node:test';
import assert from 'node:assert/strict';
import {renderProjectDocuments} from '../apps/round-table/src/documents-screen.js';
import {renderDocumentAnalysis} from '../apps/round-table/src/document-analysis-screen.js';
import {renderProjectEstimate} from '../apps/round-table/src/estimate-screen.js';
import {renderProjectContracts,renderContractDetail} from '../apps/round-table/src/contracts-screen.js';
import {renderProjectHistory} from '../apps/round-table/src/history-screen.js';

test('every operational sidebar links to Document Factory',()=>{
 const project={projectId:'p1',projectName:'Project'};
 const pages=[
  renderProjectDocuments({...project,documents:[]}),
  renderDocumentAnalysis({...project,document:{id:'d1',filename:'x.pdf',kind:'other',status:'completed',mimeType:'application/pdf',currentVersion:1,storageKey:'private/x'},evidence:[],facts:[],relations:[]}),
  renderProjectEstimate({...project,rows:[]}),
  renderProjectContracts({...project,contracts:[]}),
  renderContractDetail({...project,contract:{id:'c1',currency:'RUB',status:'active',version:1,committed:0,changes:0,accepted:0,invoiced:0,paid:0,obligations:0},items:[],movements:[],obligations:[]}),
  renderProjectHistory({...project,history:[]}),
 ];
 for(const page of pages)assert.match(page,/href="\/app\/projects\/p1\/document-factory"/);
});
