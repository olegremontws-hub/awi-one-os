import type { GateSqlClient } from './human-gate-service.js';

type AmountRow={amount:unknown;currency:unknown};
export type ProjectMoneySnapshot={currency:string;baseline:number;committed:number;changes:number;accepted:number;invoiced:number;paid:number;remaining:number};

function amount(rows:AmountRow[], currency:string){return rows.filter(r=>String(r.currency)===currency).reduce((sum,r)=>sum+Number(r.amount??0),0);}
function currencies(groups:AmountRow[][]){return new Set(groups.flat().filter(r=>Number(r.amount??0)!==0).map(r=>String(r.currency)));}

export async function getProjectMoneySnapshot(db:GateSqlClient,projectId:string):Promise<ProjectMoneySnapshot|undefined>{
 const [baselineRows,commitmentRows,eventRows]=await Promise.all([
  db.query(`select coalesce(sum(ei.total_amount),0) amount,e.currency
    from estimates e join estimate_items ei on ei.estimate_id=e.id
    where e.id=(select id from estimates where project_id=$1 and status in ('approved','baseline') order by version desc,created_at desc limit 1)
    group by e.currency`,[projectId]),
  db.query(`select coalesce(sum(ci.amount),0) amount,ci.currency
    from contract_items ci join contracts c on c.id=ci.contract_id
    where c.project_id=$1 and c.status in ('active','changed','completed') and ci.amount is not null
    group by ci.currency`,[projectId]),
  db.query(`select event_type,coalesce(sum(amount),0) amount,currency
    from contract_financial_events where project_id=$1 and status='verified'
    group by event_type,currency`,[projectId]),
 ]);
 const baseline=(baselineRows.rows??[]) as AmountRow[];
 const commitments=(commitmentRows.rows??[]) as AmountRow[];
 const events=(eventRows.rows??[]) as Array<AmountRow&{event_type:unknown}>;
 const currencySet=currencies([baseline,commitments,events]);
 if(currencySet.size===0)return undefined;
 if(currencySet.size>1)throw new Error('PROJECT_MONEY_CURRENCY_CONFLICT');
 const currency=[...currencySet][0]!;
 const event=(kind:string)=>amount(events.filter(r=>String(r.event_type)===kind),currency);
 const baselineAmount=amount(baseline,currency),committed=amount(commitments,currency),changes=event('approved_change'),paid=event('paid');
 return{currency,baseline:baselineAmount,committed,changes,accepted:event('accepted'),invoiced:event('invoiced'),paid,remaining:Math.round(((committed+changes)-paid+Number.EPSILON)*100)/100};
}
