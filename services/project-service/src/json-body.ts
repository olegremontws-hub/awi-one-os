import type http from 'node:http';

export const DEFAULT_JSON_BODY_LIMIT_BYTES = 1024 * 1024;

export async function readJsonBody(
  req: http.IncomingMessage,
  maxBytes = DEFAULT_JSON_BODY_LIMIT_BYTES,
): Promise<Record<string, unknown>> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('INVALID_JSON_BODY_LIMIT');

  const declaredLength = req.headers['content-length'];
  if (declaredLength !== undefined) {
    const length = Number(Array.isArray(declaredLength) ? declaredLength[0] : declaredLength);
    if (!Number.isSafeInteger(length) || length < 0) throw new Error('INVALID_CONTENT_LENGTH');
    if (length > maxBytes) {
      req.resume();
      throw new Error('REQUEST_BODY_TOO_LARGE');
    }
  }

  const chunks: Buffer[] = [];
  let receivedBytes = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    receivedBytes += bytes.byteLength;
    if (receivedBytes > maxBytes) {
      req.resume();
      throw new Error('REQUEST_BODY_TOO_LARGE');
    }
    chunks.push(bytes);
  }

  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return {};
  try {
    const value: unknown = JSON.parse(text);
    if (value === null || Array.isArray(value) || typeof value !== 'object') throw new Error('INVALID_JSON_BODY');
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_JSON_BODY') throw error;
    throw new Error('INVALID_JSON_BODY');
  }
}
