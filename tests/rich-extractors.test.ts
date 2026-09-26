import test from 'node:test';
import assert from 'node:assert/strict';
import { PdfTextExtractor, XlsxTextExtractor } from '../services/document-service/src/rich-extractors.js';

test('XLSX extractor fails closed while no audited parser is installed', async () => {
  const minimalZipSignature = Buffer.from([0x50,0x4b,0x03,0x04]);
  await assert.rejects(
    () => new XlsxTextExtractor().extract(minimalZipSignature, 'fixture.xlsx'),
    /XLSX_EXTRACTION_UNAVAILABLE/,
  );
});

test('malformed PDF returns stable extraction error',async()=>{
  await assert.rejects(()=>new PdfTextExtractor().extract(Buffer.from('not a pdf')),/PDF_EXTRACTION_FAILED/);
});

test('malformed XLSX also fails closed without invoking a vulnerable parser',async()=>{
  await assert.rejects(
    ()=>new XlsxTextExtractor().extract(Buffer.from([0,1,2,3,4]), 'broken.xlsx'),
    /XLSX_EXTRACTION_UNAVAILABLE/,
  );
});


test('valid generated PDF extracts embedded text', async () => {
  const stream = 'BT /F1 18 Tf 72 720 Td (AWI ONE PDF fixture) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\\nstream\\n${stream}\\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let pdf = '%PDF-1.4\\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\\n${objects[i]}\\nendobj\\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\\n0 ${objects.length + 1}\\n0000000000 65535 f \\n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \\n`;
  pdf += `trailer\\n<< /Size ${objects.length + 1} /Root 1 0 R >>\\nstartxref\\n${xref}\\n%%EOF\\n`;

  const text = await new PdfTextExtractor().extract(Buffer.from(pdf, 'ascii'));
  assert.match(text, /AWI ONE PDF fixture/);
});
