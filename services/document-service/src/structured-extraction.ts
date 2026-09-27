import type { ClassifiedDocumentType } from './document-classifier.js';
export type FactCandidate={fieldPath:string;value:string|number;unit?:string;confidence:number;evidence:{quote:string;start:number;end:number}};
function hit(text:string,fieldPath:string,re:RegExp,confidence=.86):FactCandidate|undefined{const m=re.exec(text);if(!m)return;const raw=m[1]?.trim()??m[0];return{fieldPath,value:raw,confidence,evidence:{quote:m[0],start:m.index,end:m.index+m[0].length}}}
export function extractFactCandidates(type:ClassifiedDocumentType,text:string):FactCandidate[]{
 const out:FactCandidate[]=[]; const push=(x?:FactCandidate)=>{if(x)out.push(x)};
 if(type==='contract'||type==='additional_agreement'){
  push(hit(text,'contract.number',/(?:договор|контракт)\s*(?:№|N)\s*([^\n,;]+)/i));
  push(hit(text,'contract.amount',/(?:цена|стоимость|сумма)[^\d]{0,40}([\d\s]+(?:[.,]\d{1,2})?)\s*(?:руб|₽)/i));
 }
 if(['work_volume_sheet','estimate','commercial_offer','technical_specification'].includes(type)){
  push(hit(text,'document.totalAmount',/(?:итого|всего)[^\d]{0,30}([\d\s]+(?:[.,]\d{1,2})?)\s*(?:руб|₽)/i,.8));
 }
 return out;
}
