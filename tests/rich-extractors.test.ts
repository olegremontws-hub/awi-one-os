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


