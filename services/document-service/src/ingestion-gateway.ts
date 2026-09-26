import type { FormatDefinition, IngestionRoute } from './format-registry.js';
export type OcrPage={pageNumber:number;text:string;confidence:number;blocks?:unknown[]};
export type OcrResult={pages:OcrPage[];provider:string;pipelineVersion:string};
export interface OcrProvider { readonly id:string; ready():Promise<boolean>; extract(input:{bytes:Uint8Array;filename:string;mimeType:string}):Promise<OcrResult>; }
export type ParserResult={text:string;structured?:unknown;evidence?:unknown[]};
export interface DocumentParser { readonly id:string; supports(format:FormatDefinition):boolean; parse(input:{bytes:Uint8Array;filename:string;mimeType:string}):Promise<ParserResult>; }
export function validateOcrResult(result:OcrResult){
 if(!result.provider.trim()||!result.pipelineVersion.trim())throw new Error('OCR_RESULT_INVALID');
 if(!Array.isArray(result.pages)||result.pages.length===0||result.pages.length>5000)throw new Error('OCR_RESULT_INVALID');
 const seen=new Set<number>();let total=0;
 for(const page of result.pages){
  if(!Number.isInteger(page.pageNumber)||page.pageNumber<1||seen.has(page.pageNumber))throw new Error('OCR_RESULT_INVALID');
  if(!Number.isFinite(page.confidence)||page.confidence<0||page.confidence>1)throw new Error('OCR_RESULT_INVALID');
  if(typeof page.text!=='string')throw new Error('OCR_RESULT_INVALID');
  total+=page.text.length;if(page.text.length>2_000_000||total>20_000_000)throw new Error('OCR_RESULT_TOO_LARGE');
  seen.add(page.pageNumber);
 }
 return result;
}

export class DocumentIngestionGateway {
 constructor(private readonly ocr:OcrProvider|undefined,private readonly parsers:readonly DocumentParser[]){}
 async execute(route:IngestionRoute,format:FormatDefinition,input:{bytes:Uint8Array;filename:string;mimeType:string}){
  if(route==='ocr'){if(!this.ocr) throw new Error('OCR_PROVIDER_UNAVAILABLE');if(!(await this.ocr.ready()))throw new Error('OCR_PROVIDER_NOT_READY');return {route,ocr:validateOcrResult(await this.ocr.extract(input))};}
  if(route==='parser'){const p=this.parsers.find(x=>x.supports(format));if(!p) throw new Error('DOCUMENT_PARSER_UNAVAILABLE');return {route,parsed:await p.parse(input)};}
  if(route==='store_only') return {route};
  return {route};
 }
}
