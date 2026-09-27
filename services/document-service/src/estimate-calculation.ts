export type Money={amount:number;currency:string};
export type EstimateResource={kind:'labor'|'material'|'equipment'|'logistics'|'subcontract';quantity:number;unit:string;unitPrice?:Money;priceEvidenceIds:string[]};
export type EstimateInput={quantity:number;unit:string;resources:readonly EstimateResource[];overheadRate?:number;coefficient?:number;vatRate?:number;riskRate?:number};
export type EstimateCalculation={currency?:string;direct?:number;overhead?:number;risk?:number;vat?:number;total?:number;status:'VERIFIED'|'UNVERIFIED'|'CONFLICT';issues:string[];priceEvidenceIds:string[]};
const round=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export function calculateEstimate(input:EstimateInput):EstimateCalculation{
 const issues:string[]=[];const priced=input.resources.filter(r=>r.unitPrice);const currencies=new Set(priced.map(r=>r.unitPrice!.currency));
 for(const r of input.resources){if(!r.unitPrice)issues.push('MISSING_PRICE:'+r.kind);else if(r.priceEvidenceIds.length===0)issues.push('MISSING_PRICE_EVIDENCE:'+r.kind);}
 if(currencies.size>1)return{status:'CONFLICT',issues:[...issues,'MULTIPLE_CURRENCIES'],priceEvidenceIds:[...new Set(input.resources.flatMap(r=>r.priceEvidenceIds))]};
 if(issues.length)return{currency:[...currencies][0],status:'UNVERIFIED',issues,priceEvidenceIds:[...new Set(input.resources.flatMap(r=>r.priceEvidenceIds))]};
 const direct=round(input.resources.reduce((s,r)=>s+r.quantity*r.unitPrice!.amount,0)*input.quantity);
 const coefficient=input.coefficient??1, overhead=round(direct*(input.overheadRate??0)),base=round((direct+overhead)*coefficient),risk=round(base*(input.riskRate??0)),vat=round((base+risk)*(input.vatRate??0)),total=round(base+risk+vat);
 return{currency:[...currencies][0],direct,overhead,risk,vat,total,status:'VERIFIED',issues:[],priceEvidenceIds:[...new Set(input.resources.flatMap(r=>r.priceEvidenceIds))]};
}
