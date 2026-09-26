export type GeneratedDocumentVersion={documentId:string;version:number;templateId:string;templateVersion:number;createdAt:string;createdBy:string;sourceEvidenceIds:string[];artifactKeys:string[];supersedesVersion?:number};
export function nextDocumentVersion(history:readonly GeneratedDocumentVersion[],input:Omit<GeneratedDocumentVersion,'version'|'supersedesVersion'>):GeneratedDocumentVersion{
 const latest=history.filter(v=>v.documentId===input.documentId).sort((a,b)=>b.version-a.version)[0];
 return{...input,version:(latest?.version??0)+1,supersedesVersion:latest?.version};
}
export function validateVersion(v:GeneratedDocumentVersion){const issues:string[]=[];if(v.version<1)issues.push('INVALID_VERSION');if(!v.sourceEvidenceIds.length)issues.push('VERSION_EVIDENCE_REQUIRED');if(!v.artifactKeys.length)issues.push('VERSION_ARTIFACT_REQUIRED');return issues;}
