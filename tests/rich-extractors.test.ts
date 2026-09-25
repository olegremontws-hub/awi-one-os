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


test('PDF extractor reads a valid generated PDF', async () => {
  const objects:string[]=[];
  const add=(body:string)=>{objects.push(body);return objects.length;};
  add('<< /Type /Catalog /Pages 2 0 R >>');
  add('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>');
  const stream='BT /F1 18 Tf 20 80 Td (AWI Project Brief) Tj ET';
  add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  let pdf='%PDF-1.4\n', offsets=[0];
  objects.forEach((body,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${body}\nendobj\n`;});
  const xref=Buffer.byteLength(pdf);
  pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(let i=1;i<offsets.length;i++) pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';
  pdf+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const text=await new PdfTextExtractor().extract(Buffer.from(pdf));
  assert.match(text,/AWI Project Brief/);
});

test('malformed PDF returns stable extraction error',async()=>{
  await assert.rejects(()=>new PdfTextExtractor().extract(Buffer.from('not a pdf')),/PDF_EXTRACTION_FAILED/);
});

test('malformed XLSX returns stable extraction error',async()=>{
  await assert.rejects(()=>new XlsxTextExtractor().extract(Buffer.from([0,1,2,3,4])),/XLSX_EXTRACTION_FAILED/);
});
