import type {OcrProvider,OcrResult} from './ingestion-gateway.js';

type FetchLike=(input:string|URL,init?:RequestInit)=>Promise<Response>;

export class HttpOcrBridgeProvider implements OcrProvider{
 readonly id='http-ocr-bridge';
 constructor(
  private readonly endpoint:string,
  private readonly apiKey:string|undefined,
  private readonly timeoutMs=60_000,
  private readonly fetchImpl:FetchLike=fetch,
 ){}
 private url(path:string){return this.endpoint.replace(/\/$/,'')+path;}
 private headers(){return {'content-type':'application/json',...(this.apiKey?{authorization:`Bearer ${this.apiKey}`}:{})};}
 async ready(){
  try{
   const response=await this.fetchImpl(this.url('/ready'),{method:'GET',headers:this.apiKey?{authorization:`Bearer ${this.apiKey}`}:{},signal:AbortSignal.timeout(Math.min(this.timeoutMs,10_000))});
   return response.ok;
  }catch{return false;}
 }
 async extract(input:{bytes:Uint8Array;filename:string;mimeType:string}):Promise<OcrResult>{
  const response=await this.fetchImpl(this.url('/v1/ocr'),{
   method:'POST',headers:this.headers(),signal:AbortSignal.timeout(this.timeoutMs),
   body:JSON.stringify({filename:input.filename,mimeType:input.mimeType,base64:Buffer.from(input.bytes).toString('base64')}),
  });
  if(!response.ok)throw new Error(`OCR_PROVIDER_HTTP_${response.status}`);
  const body=await response.json() as Partial<OcrResult>;
  return{provider:String(body.provider??this.id),pipelineVersion:String(body.pipelineVersion??'unknown'),pages:Array.isArray(body.pages)?body.pages:[]};
 }
}

export function ocrProviderFromEnv(env:NodeJS.ProcessEnv=process.env,fetchImpl:FetchLike=fetch):OcrProvider|undefined{
 const kind=env.OCR_PROVIDER?.trim();
 if(!kind)return undefined;
 if(kind!=='http-bridge')throw new Error('UNSUPPORTED_OCR_PROVIDER');
 const endpoint=env.OCR_ENDPOINT?.trim();if(!endpoint)throw new Error('MISSING_ENV:OCR_ENDPOINT');
 const timeout=Number(env.OCR_TIMEOUT_MS??60_000);if(!Number.isFinite(timeout)||timeout<1_000||timeout>300_000)throw new Error('INVALID_OCR_TIMEOUT');
 return new HttpOcrBridgeProvider(endpoint,env.OCR_API_KEY,timeout,fetchImpl);
}
