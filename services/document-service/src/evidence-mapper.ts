import type { FactCandidate } from './structured-extraction.js';
export type EvidenceRecord={documentId:string;documentVersionId:string;pageNumber?:number;fieldPath:string;quote:string;start:number;end:number;confidence:number};
export function toEvidence(input:{documentId:string;documentVersionId:string;pageNumber?:number},facts:readonly FactCandidate[]):EvidenceRecord[]{
 return facts.map(f=>({...input,fieldPath:f.fieldPath,quote:f.evidence.quote,start:f.evidence.start,end:f.evidence.end,confidence:f.confidence}));
}
export function requiresHumanReview(confidence:number,threshold=.8){return confidence<threshold;}
