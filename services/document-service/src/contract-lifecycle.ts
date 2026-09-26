export type BaselineStatus='DRAFT'|'PENDING_APPROVAL'|'APPROVED'|'SUPERSEDED';
export type ContractLifecycleStatus='DRAFT'|'ACTIVE'|'CHANGED'|'COMPLETED';
export type MoneyValue={amount:number;currency:string};
export type EstimateBaseline={id:string;projectId:string;version:number;status:BaselineStatus;total:MoneyValue;evidenceIds:string[];approvedBy?:string;approvedAt?:string};
export type ContractCommitment={id:string;projectId:string;baselineId:string;contractItemId:string;amount:MoneyValue;evidenceIds:string[]};
export type ContractChange={id:string;contractItemId:string;kind:'ADDITIONAL_AGREEMENT'|'CHANGE_ORDER';delta:MoneyValue;evidenceIds:string[];humanGateId?:string;approved:boolean};
export type ActualCost={contractItemId:string;accepted:MoneyValue;invoiced:MoneyValue;paid:MoneyValue;evidenceIds:string[]};
export function approveBaseline(b:EstimateBaseline,input:{humanGateId:string;actorId:string;at:string}):EstimateBaseline{
 if(!input.humanGateId)throw new Error('HUMAN_GATE_REQUIRED');if(!b.evidenceIds.length)throw new Error('BASELINE_EVIDENCE_REQUIRED');
 return{...b,status:'APPROVED',approvedBy:input.actorId,approvedAt:input.at};
}
export function applyContractChanges(base:ContractCommitment,changes:readonly ContractChange[]):MoneyValue{
 let amount=base.amount.amount;
 for(const c of changes){if(!c.approved||!c.humanGateId)throw new Error('UNAPPROVED_CONTRACT_CHANGE');if(c.delta.currency!==base.amount.currency)throw new Error('CHANGE_CURRENCY_CONFLICT');if(!c.evidenceIds.length)throw new Error('CHANGE_EVIDENCE_REQUIRED');amount+=c.delta.amount;}
 return{amount:Math.round((amount+Number.EPSILON)*100)/100,currency:base.amount.currency};
}
export function validateActualCost(a:ActualCost){const issues:string[]=[];if(a.accepted.currency!==a.invoiced.currency||a.invoiced.currency!==a.paid.currency)issues.push('ACTUAL_CURRENCY_CONFLICT');if(a.invoiced.amount>a.accepted.amount)issues.push('INVOICED_EXCEEDS_ACCEPTED');if(a.paid.amount>a.invoiced.amount)issues.push('PAID_EXCEEDS_INVOICED');if(!a.evidenceIds.length)issues.push('ACTUAL_EVIDENCE_REQUIRED');return issues;}
