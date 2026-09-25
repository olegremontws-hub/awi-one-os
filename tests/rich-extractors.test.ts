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


test('PDF extractor reads a real minimal PDF', async () => {
  const pdfBytes=Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 44>>stream\nBT /F1 18 Tf 20 80 Td (AWI Project Brief) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000241 00000 n \n0000000334 00000 n \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n404\n%%EOF');
  const text=await new PdfTextExtractor().extract(pdfBytes);
  assert.match(text,/AWI Project Brief/);
});

test('malformed PDF returns stable extraction error',async()=>{
  await assert.rejects(()=>new PdfTextExtractor().extract(Buffer.from('not a pdf')),/PDF_EXTRACTION_FAILED/);
});

test('malformed XLSX returns stable extraction error',async()=>{
  await assert.rejects(()=>new XlsxTextExtractor().extract(Buffer.from([0,1,2,3,4])),/XLSX_EXTRACTION_FAILED/);
});
