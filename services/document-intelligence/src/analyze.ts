export type DocumentAnalysis = {
  documentId: string;
  documentType: 'brief'|'contract'|'estimate'|'drawing'|'invoice'|'correspondence'|'unknown';
  summary: string;
  extractedFacts: Record<string, unknown>;
  evidenceRefs: string[];
  confidence: number;
};

export interface DocumentAnalyzer {
  analyze(input: { documentId: string; filename: string; text?: string }): Promise<DocumentAnalysis>;
}

export class DeterministicDocumentAnalyzer implements DocumentAnalyzer {
  async analyze(input: { documentId: string; filename: string; text?: string }): Promise<DocumentAnalysis> {
    const lower = input.filename.toLowerCase();
    const documentType: DocumentAnalysis['documentType'] =
      lower.includes('contract') ? 'contract' :
      lower.includes('estimate') ? 'estimate' :
      lower.match(/\.(dwg|dxf)$/) ? 'drawing' :
      lower.includes('invoice') ? 'invoice' :
      lower.match(/brief|tz|тз/) ? 'brief' : 'unknown';

    return {
      documentId: input.documentId,
      documentType,
      summary: input.text?.slice(0, 1000) || `Uploaded document: ${input.filename}`,
      extractedFacts: {},
      evidenceRefs: [`document:${input.documentId}`],
      confidence: documentType === 'unknown' ? 0.5 : 0.9,
    };
  }
}
