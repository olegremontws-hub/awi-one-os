import type {GeneratedDocumentKind} from './document-factory.js';
export type TemplateDefinition={id:string;kind:GeneratedDocumentKind;version:number;requiredFields:readonly string[];outputFormats:readonly ('docx'|'xlsx'|'pdf')[]};
const templates:TemplateDefinition[]=[
 {id:'contract-v1',kind:'contract',version:1,requiredFields:['contract.number','parties','subject','amount','currency'],outputFormats:['docx','pdf']},
 {id:'additional-agreement-v1',kind:'additional_agreement',version:1,requiredFields:['baseContract','changes'],outputFormats:['docx','pdf']},
 {id:'commercial-offer-v1',kind:'commercial_offer',version:1,requiredFields:['recipient','scope','total'],outputFormats:['docx','pdf']},
 {id:'estimate-v1',kind:'estimate',version:1,requiredFields:['estimate.items','estimate.total'],outputFormats:['xlsx','pdf']},
 {id:'specification-v1',kind:'specification',version:1,requiredFields:['items'],outputFormats:['xlsx','pdf']},
 {id:'invoice-v1',kind:'invoice',version:1,requiredFields:['contract','amount','currency'],outputFormats:['xlsx','pdf']},
 {id:'act-v1',kind:'act',version:1,requiredFields:['contract','acceptedItems'],outputFormats:['docx','pdf']},
 {id:'ks2-v1',kind:'ks2',version:1,requiredFields:['contract','acceptedItems'],outputFormats:['xlsx','pdf']},
 {id:'ks3-v1',kind:'ks3',version:1,requiredFields:['contract','period','total'],outputFormats:['xlsx','pdf']}
];
export function getTemplate(kind:GeneratedDocumentKind){return templates.find(t=>t.kind===kind);}
