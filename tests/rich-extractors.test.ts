import test from 'node:test';
import assert from 'node:assert/strict';
import { PdfTextExtractor, XlsxTextExtractor } from '../services/document-service/src/rich-extractors.js';
import { XlsxDocumentRenderer } from '../services/document-service/src/builtin-document-renderers.js';
import { zipStore } from '../services/document-service/src/ooxml-zip.js';
import { readZipEntries } from '../services/document-service/src/safe-zip-reader.js';

test('XLSX extractor parses audited OOXML workbook text', async () => {
  const draft={id:'d',projectId:'p',kind:'estimate' as const,templateId:'estimate-v1',templateVersion:1,status:'APPROVED' as const,issues:[],humanGateId:'hg',fields:[
    {key:'work.name',value:'Наружная канализация',sourceEvidenceIds:['e1']},
    {key:'quantity',value:120,sourceEvidenceIds:['e2']},
  ]};
  const bytes=await new XlsxDocumentRenderer().render(draft);
  const text=await new XlsxTextExtractor().extract(bytes,'fixture.xlsx');
  assert.match(text,/Наружная канализация/);
  assert.match(text,/quantity/);
  assert.match(text,/120/);
});

test('malformed PDF returns stable extraction error',async()=>{
  await assert.rejects(()=>new PdfTextExtractor().extract(Buffer.from('not a pdf')),/PDF_EXTRACTION_FAILED/);
});

test('malformed XLSX fails closed with stable extraction error',async()=>{
  await assert.rejects(
    ()=>new XlsxTextExtractor().extract(Buffer.from([0,1,2,3,4]), 'broken.xlsx'),
    /XLSX_EXTRACTION_FAILED:ZIP_EOCD_NOT_FOUND/,
  );
});

test('safe ZIP reader rejects traversal paths',()=>{
  const bytes=zipStore([{name:'../evil.xml',data:'x'}]);
  assert.throws(()=>readZipEntries(bytes,{accept:()=>true}),/ZIP_UNSAFE_PATH/);
});
