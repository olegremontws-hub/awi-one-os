import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { PdfTextExtractor, XlsxTextExtractor } from '../services/document-service/src/rich-extractors.js';

test('XLSX extractor exposes sheet data to VS-001', async () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Task','Cost'],['Foundation',100]]), 'Estimate');
  const bytes = XLSX.write(wb, { type:'buffer', bookType:'xlsx' });
  const text = await new XlsxTextExtractor().extract(bytes);
  assert.match(text, /Estimate/);
  assert.match(text, /Foundation/);
  assert.match(text, /100/);
});


test('malformed PDF returns stable extraction error',async()=>{
  await assert.rejects(()=>new PdfTextExtractor().extract(Buffer.from('not a pdf')),/PDF_EXTRACTION_FAILED/);
});

test('malformed XLSX returns stable extraction error',async()=>{
  await assert.rejects(()=>new XlsxTextExtractor().extract(Buffer.from([0,1,2,3,4])),/XLSX_EXTRACTION_FAILED/);
});
