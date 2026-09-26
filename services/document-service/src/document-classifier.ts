export type ClassifiedDocumentType =
 'contract'|'additional_agreement'|'specification'|'estimate'|'commercial_offer'|'invoice'|'payment_request'|
 'technical_specification'|'technical_conditions'|'design_documentation'|'working_documentation'|
 'work_volume_sheet'|'act'|'ks2'|'ks3'|'drawing'|'other';
export type Classification={type:ClassifiedDocumentType;confidence:number;reasons:string[]};
const rules:readonly [ClassifiedDocumentType,RegExp][]=[
 ['additional_agreement',/дополнительн\w* соглашен/i],['technical_conditions',/техническ\w* услов/i],
 ['work_volume_sheet',/ведомост\w* (объ[её]м|остат)/i],['commercial_offer',/коммерческ\w* предложен/i],
 ['technical_specification',/техническ\w* задан/i],['working_documentation',/рабочая документац/i],
 ['specification',/спецификац/i],['estimate',/смет/i],['ks2',/кс[- ]?2/i],['ks3',/кс[- ]?3/i],
 ['invoice',/сч[её]т( на оплату)?/i],['contract',/договор/i],['act',/\bакт\b/i]
];
export function classifyDocument(text:string,filename=''):Classification{
 const hay=filename+'\n'+text.slice(0,20000); const hits=rules.filter(([,r])=>r.test(hay));
 if(!hits.length)return{type:'other',confidence:.25,reasons:['no deterministic classification rule matched']};
 return{type:hits[0][0],confidence:hits.length===1?.9:.72,reasons:hits.map(([t])=>'matched:'+t)};
}
