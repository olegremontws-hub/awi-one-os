import pdf from 'pdf-parse';
import * as XLSX from 'xlsx';
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
  async extract(bytes: Uint8Array) {
    let workbook: XLSX.WorkBook;
    try { workbook = XLSX.read(Buffer.from(bytes), { type: 'buffer' }); }
    catch { throw new Error('XLSX_EXTRACTION_FAILED'); }
    return workbook.SheetNames.map(name => {
      const sheet = workbook.Sheets[name];
      return `# Sheet: ${name}\n${sheet ? XLSX.utils.sheet_to_csv(sheet) : ''}`;
    }).join('\n\n');
  }
}
