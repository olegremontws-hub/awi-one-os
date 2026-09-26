import type {EstimateBaseline,ContractCommitment,ContractChange,ActualCost} from './contract-lifecycle.js';
export type MovementSnapshot={baseline:number;committed:number;approvedChanges:number;revisedCommitment:number;accepted:number;invoiced:number;paid:number;remaining:number;currency:string};
export function buildMovementSnapshot(input:{baseline:EstimateBaseline;commitment:ContractCommitment;changes:readonly ContractChange[];actual:ActualCost}):MovementSnapshot{
 const currency=input.baseline.total.currency;if([input.commitment.amount.currency,input.actual.accepted.currency,input.actual.invoiced.currency,input.actual.paid.currency,...input.changes.map(x=>x.delta.currency)].some(x=>x!==currency))throw new Error('MOVEMENT_CURRENCY_CONFLICT');
 const approvedChanges=input.changes.filter(x=>x.approved).reduce((s,x)=>s+x.delta.amount,0);const revised=input.commitment.amount.amount+approvedChanges;
 return{baseline:input.baseline.total.amount,committed:input.commitment.amount.amount,approvedChanges,revisedCommitment:revised,accepted:input.actual.accepted.amount,invoiced:input.actual.invoiced.amount,paid:input.actual.paid.amount,remaining:Math.round((revised-input.actual.paid.amount+Number.EPSILON)*100)/100,currency};
}
