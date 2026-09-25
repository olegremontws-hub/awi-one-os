import pdf from 'pdf-parse';
import type { TextExtractor } from './extract-text.js';

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
    return /spreadsheetml|excel/i.test(mimeType) || /\.xlsx?$/i.test(filename);
  }
  async extract(_bytes: Uint8Array) {
    throw new Error('XLSX_EXTRACTION_UNAVAILABLE');
  }
}
