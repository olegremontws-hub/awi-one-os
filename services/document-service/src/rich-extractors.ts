import pdf from 'pdf-parse';
import * as XLSX from 'xlsx';
import type { TextExtractor } from './extract-text.js';

export class PdfTextExtractor implements TextExtractor {
  supports(mimeType: string, filename: string) {
    return mimeType === 'application/pdf' || /\.pdf$/i.test(filename);
  }
  async extract(bytes: Uint8Array) {
    const result = await pdf(Buffer.from(bytes));
    return result.text;
  }
}

export class XlsxTextExtractor implements TextExtractor {
  supports(mimeType: string, filename: string) {
    return /spreadsheetml|excel/i.test(mimeType) || /\.xlsx?$/i.test(filename);
  }
  async extract(bytes: Uint8Array) {
    const workbook = XLSX.read(Buffer.from(bytes), { type: 'buffer' });
    return workbook.SheetNames.map(name => {
      const sheet = workbook.Sheets[name];
      return `# Sheet: ${name}\n${sheet ? XLSX.utils.sheet_to_csv(sheet) : ''}`;
    }).join('\n\n');
  }
}
