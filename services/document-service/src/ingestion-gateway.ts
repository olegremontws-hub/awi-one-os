import type { FormatDefinition, IngestionRoute } from './format-registry.js';
export type OcrPage={pageNumber:number;text:string;confidence:number;blocks?:unknown[]};
export type OcrResult={pages:OcrPage[];provider:string;pipelineVersion:string};
export interface OcrProvider { readonly id:string; ready():Promise<boolean>; extract(input:{bytes:Uint8Array;filename:string;mimeType:string}):Promise<OcrResult>; }
export type ParserResult={text:string;structured?:unknown;evidence?:unknown[]};
export interface DocumentParser { readonly id:string; supports(format:FormatDefinition):boolean; parse(input:{bytes:Uint8Array;filename:string;mimeType:string}):Promise<ParserResult>; }
export class DocumentIngestionGateway {
 constructor(private readonly ocr:OcrProvider|undefined,private readonly parsers:readonly DocumentParser[]){}
 async execute(route:IngestionRoute,format:FormatDefinition,input:{bytes:Uint8Array;filename:string;mimeType:string}){
  if(route==='ocr'){if(!this.ocr) throw new Error('OCR_PROVIDER_UNAVAILABLE'); return {route,ocr:await this.ocr.extract(input)};}
  if(route==='parser'){const p=this.parsers.find(x=>x.supports(format));if(!p) throw new Error('DOCUMENT_PARSER_UNAVAILABLE');return {route,parsed:await p.parse(input)};}
  if(route==='store_only') return {route};
  return {route};
 }
}
