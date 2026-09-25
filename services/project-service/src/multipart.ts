import Busboy from 'busboy';
import type http from 'node:http';

export async function readMultipartDocument(req: http.IncomingMessage): Promise<{
  filename: string; mimeType: string; bytes: Uint8Array; correlationId?: string;
}> {
  return new Promise((resolve, reject) => {
    const parser = Busboy({ headers: req.headers, limits: { files: 1, fileSize: 50 * 1024 * 1024, fields: 10 } });
    const chunks: Buffer[] = [];
    let filename = '';
    let mimeType = 'application/octet-stream';
    let correlationId: string | undefined;
    parser.on('file', (_name, stream, info) => {
      filename = info.filename;
      mimeType = info.mimeType;
      stream.on('data', chunk => chunks.push(Buffer.from(chunk)));
      stream.on('limit', () => reject(new Error('UPLOAD_TOO_LARGE')));
    });
    parser.on('field', (name, value) => { if (name === 'correlationId') correlationId = value; });
    parser.on('finish', () => filename ? resolve({ filename, mimeType, bytes: Buffer.concat(chunks), correlationId }) : reject(new Error('DOCUMENT_FILE_REQUIRED')));
    parser.on('error', reject);
    req.pipe(parser);
  });
}
