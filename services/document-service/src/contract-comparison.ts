export type ComparisonStatus='MATCH'|'MISSING'|'EXTRA'|'CHANGED'|'CONFLICT'|'UNVERIFIED';
export type ComparableItem={id:string;key:string;name:string;quantity?:number;unit?:string;amount?:number;evidenceIds:string[]};
export type ComparisonResult={key:string;status:ComparisonStatus;left?:ComparableItem;right?:ComparableItem;changes:string[];evidenceIds:string[]};
const eq=(a?:number,b?:number)=>a===undefined||b===undefined?a===b:Math.abs(a-b)<1e-9;
export function compareItems(left:readonly ComparableItem[],right:readonly ComparableItem[]):ComparisonResult[]{
 const l=new Map(left.map(x=>[x.key,x])),r=new Map(right.map(x=>[x.key,x]));const keys=new Set([...l.keys(),...r.keys()]);const out:ComparisonResult[]=[];
 for(const key of keys){const a=l.get(key),b=r.get(key);if(!a){out.push({key,status:'EXTRA',right:b,changes:['item only in right'],evidenceIds:b?.evidenceIds??[]});continue}if(!b){out.push({key,status:'MISSING',left:a,changes:['item missing in right'],evidenceIds:a.evidenceIds});continue}
 const changes:string[]=[];if(a.name!==b.name)changes.push('name');if(a.unit!==b.unit)changes.push('unit');if(!eq(a.quantity,b.quantity))changes.push('quantity');if(!eq(a.amount,b.amount))changes.push('amount');
 const evidenceIds=[...new Set([...a.evidenceIds,...b.evidenceIds])];const verified=a.evidenceIds.length>0&&b.evidenceIds.length>0;
 out.push({key,status:changes.length?(a.unit!==b.unit?'CONFLICT':'CHANGED'):(verified?'MATCH':'UNVERIFIED'),left:a,right:b,changes,evidenceIds});
 }return out;
}
export type ContractGraphEdge={fromId:string;toId:string;relation:'REQUIRES'|'SPECIFIES'|'PRICES'|'AMENDS'|'EXECUTES'|'ACCEPTS'|'INVOICES'|'PAYS';evidenceIds:string[]};
export function validateContractGraph(edges:readonly ContractGraphEdge[]){return edges.filter(e=>e.evidenceIds.length===0).map(e=>({edge:e,error:'RELATION_WITHOUT_EVIDENCE'}));}
