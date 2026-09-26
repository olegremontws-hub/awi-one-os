import test from 'node:test';
import assert from 'node:assert/strict';
import {DocxDocumentRenderer,XlsxDocumentRenderer,PdfDocumentRenderer,builtInDocumentRenderer} from '../services/document-service/src/builtin-document-renderers.js';
import {renderApprovedDocument} from '../services/document-service/src/document-renderer.js';

const draft={
 id:'generated-1',projectId:'project-1',kind:'contract' as const,templateId:'contract-v1',templateVersion:1,
 status:'APPROVED' as const,issues:[],humanGateId:'hg-1',
 fields:[
  {key:'contract.number',value:'38-23МГС',sourceEvidenceIds:['ev-1'],required:true},
  {key:'subject',value:'Поставка оборудования',sourceEvidenceIds:['ev-2'],required:true},
  {key:'amount',value:18829880,sourceEvidenceIds:['ev-3'],required:true},
 ],
};

test('built-in DOCX renderer creates a real OOXML package with Unicode and evidence',async()=>{
 const bytes=await new DocxDocumentRenderer().render(draft);const b=Buffer.from(bytes);
 assert.equal(b.subarray(0,2).toString('ascii'),'PK');
 assert.ok(b.includes(Buffer.from('word/document.xml')));
 assert.ok(b.includes(Buffer.from('Поставка оборудования','utf8')));
 assert.ok(b.includes(Buffer.from('Evidence: ev-2')));
});

test('built-in XLSX renderer creates a real OOXML workbook with structured rows',async()=>{
 const bytes=await new XlsxDocumentRenderer().render(draft);const b=Buffer.from(bytes);
 assert.equal(b.subarray(0,2).toString('ascii'),'PK');
 assert.ok(b.includes(Buffer.from('xl/worksheets/sheet1.xml')));
 assert.ok(b.includes(Buffer.from('contract.number')));
 assert.ok(b.includes(Buffer.from('38-23МГС','utf8')));
});

test('built-in PDF renderer emits a valid multi-object PDF with Cyrillic encoding map',async()=>{
 const bytes=await new PdfDocumentRenderer().render(draft);const text=Buffer.from(bytes).toString('ascii');
 assert.ok(text.startsWith('%PDF-1.4'));
 assert.match(text,/\/BaseFont \/Arial/);
 assert.match(text,/afii10017/);
 assert.ok(text.endsWith('%%EOF\n'));
});

test('approved render stores bytes and records SHA-256',async()=>{
 let stored=new Uint8Array();
 const artifact=await renderApprovedDocument({draft,version:1,format:'docx',renderer:builtInDocumentRenderer('docx'),storage:{async put(_key,bytes){stored=bytes;}}});
 assert.ok(stored.byteLength>100);
 assert.equal(artifact.sha256?.length,64);
 assert.equal(artifact.contentType,'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
});
