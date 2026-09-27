export type RoundTableDocument={id:string;kind:string;status:string;needsReview:boolean};
export type RoundTableGate={id:string;kind:string;status:'PENDING'|'APPROVED'|'REJECTED';subjectId:string};
export type RoundTableMoney={currency:string;baseline:number;committed:number;changes:number;accepted:number;invoiced:number;paid:number;remaining:number};
export type RoundTableSnapshot={projectId:string;documents:RoundTableDocument[];money?:RoundTableMoney;pendingGates:RoundTableGate[];risks:{id:string;severity:string;title:string}[];history:{id:string;type:string;occurredAt:string;evidenceIds:string[]}[];attention:{code:string;subjectId:string}[]};
export function buildRoundTableSnapshot(input:Omit<RoundTableSnapshot,'attention'>):RoundTableSnapshot{
 const attention:{code:string;subjectId:string}[]=[];
 for(const d of input.documents)if(d.needsReview)attention.push({code:'DOCUMENT_NEEDS_REVIEW',subjectId:d.id});
 for(const g of input.pendingGates)if(g.status==='PENDING')attention.push({code:'HUMAN_GATE_PENDING',subjectId:g.subjectId});
 for(const r of input.risks)if(r.severity==='HIGH'||r.severity==='CRITICAL')attention.push({code:'PROJECT_RISK',subjectId:r.id});
 return{...input,attention};
}
