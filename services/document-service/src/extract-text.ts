export type TextExtractor = {
  supports(mimeType: string, filename: string): boolean;
  extract(bytes: Uint8Array, filename: string): Promise<string>;
};

export class PlainTextExtractor implements TextExtractor {
  supports(mimeType: string, filename: string) {
    return mimeType.startsWith('text/') || /\.(txt|md|csv|json)$/i.test(filename);
  }
  async extract(bytes: Uint8Array) { return new TextDecoder().decode(bytes); }
}

export async function extractDocumentText(input: {
  bytes: Uint8Array; filename: string; mimeType: string; extractors: TextExtractor[];
}) {
  const extractor = input.extractors.find(x => x.supports(input.mimeType, input.filename));
  if (!extractor) throw new Error(`UNSUPPORTED_DOCUMENT_TYPE:${input.mimeType || input.filename}`);
  return extractor.extract(input.bytes, input.filename);
}
