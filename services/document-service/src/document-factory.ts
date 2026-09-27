export type GeneratedDocumentKind='contract'|'additional_agreement'|'commercial_offer'|'estimate'|'specification'|'invoice'|'act'|'ks2'|'ks3'|'letter'|'meeting_minutes';
export type DraftField={key:string;value:string|number;sourceEvidenceIds:string[];required?:boolean};
export type DocumentDraft={id:string;projectId:string;kind:GeneratedDocumentKind;templateId:string;templateVersion:number;status:'DRAFT'|'NEEDS_REVIEW'|'APPROVED'|'RENDERED';fields:DraftField[];issues:string[];humanGateId?:string};
export function createDocumentDraft(input:{id:string;projectId:string;kind:GeneratedDocumentKind;templateId:string;templateVersion:number;fields:DraftField[]}):DocumentDraft{
 const issues:string[]=[];for(const f of input.fields){if(f.required&&(f.value===''||f.value===undefined))issues.push('MISSING_REQUIRED_FIELD:'+f.key);if(f.sourceEvidenceIds.length===0)issues.push('FIELD_WITHOUT_EVIDENCE:'+f.key);}
 return{...input,status:issues.length?'NEEDS_REVIEW':'DRAFT',issues};
}
export function approveDocumentDraft(draft:DocumentDraft,input:{humanGateId:string}):DocumentDraft{
 if(draft.issues.length)throw new Error('DOCUMENT_DRAFT_HAS_ISSUES');if(!input.humanGateId)throw new Error('HUMAN_GATE_REQUIRED');return{...draft,status:'APPROVED',humanGateId:input.humanGateId};
}
export function markRendered(draft:DocumentDraft):DocumentDraft{if(draft.status!=='APPROVED')throw new Error('DOCUMENT_APPROVAL_REQUIRED');return{...draft,status:'RENDERED'};}
