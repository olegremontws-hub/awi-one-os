import pdf from 'pdf-parse';
import type { TextExtractor } from './extract-text.js';
import { parseXlsxText } from './xlsx-text-parser.js';

export class PdfTextExtractor implements TextExtractor {
  supports(mimeType: string, filename: string) {
    return mimeType === 'application/pdf' || /\.pdf$/i.test(filename);
  }
  async extract(bytes: Uint8Array) {
    try {
      const result = await pdf(Buffer.from(bytes));
      return result.text;
    } catch { throw new Error('PDF_EXTRACTION_FAILED'); }
  }
}

export class XlsxTextExtractor implements TextExtractor {
  supports(mimeType: string, filename: string) {
    return /spreadsheetml|macroenabled\.12/i.test(mimeType) || /\.(xlsx|xlsm)$/i.test(filename);
  }
  async extract(bytes: Uint8Array, _filename: string): Promise<string> {
    try { return parseXlsxText(bytes); }
    catch (error) {
      const message=error instanceof Error?error.message:'unknown';
      if(message.startsWith('ZIP_')||message==='XLSX_NO_READABLE_CELLS') throw new Error(`XLSX_EXTRACTION_FAILED:${message}`);
      throw new Error('XLSX_EXTRACTION_FAILED');
    }
  }
}
