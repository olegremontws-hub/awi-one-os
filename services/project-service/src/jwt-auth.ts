import {createPublicKey,verify as verifySignature} from 'node:crypto';

export type VerifiedIdentity={actorId:string;roles:string[]};
export type JwtVerifierConfig={issuer:string;audience:string;jwksUrl:string;rolesClaim?:string;clockSkewSeconds?:number;cacheTtlMs?:number;timeoutMs?:number};
type FetchLike=(input:string|URL,init?:RequestInit)=>Promise<Response>;
type Jwk=Record<string,unknown>&{kid?:string;kty?:string;alg?:string;use?:string};

const headerValue=(headers:Record<string,string|string[]|undefined>,name:string)=>{
 const value=headers[name]??headers[name.toLowerCase()];
 return Array.isArray(value)?value[0]:value;
};
const decodePart=(part:string)=>{
 try{return JSON.parse(Buffer.from(part,'base64url').toString('utf8')) as Record<string,unknown>}
 catch{throw new Error('JWT_MALFORMED')}
};
const audienceMatches=(claim:unknown,audience:string)=>typeof claim==='string'?claim===audience:Array.isArray(claim)&&claim.some(x=>String(x)===audience);

export class JwtRs256Verifier{
 private keys=new Map<string,Jwk>();private expiresAt=0;
 constructor(private readonly config:JwtVerifierConfig,private readonly fetchImpl:FetchLike=fetch){}
 private async refresh(){
  const response=await this.fetchImpl(this.config.jwksUrl,{method:'GET',headers:{accept:'application/json'},signal:AbortSignal.timeout(this.config.timeoutMs??10_000)});
  if(!response.ok)throw new Error('JWKS_FETCH_FAILED');
  const body=await response.json() as {keys?:Jwk[]};
  if(!Array.isArray(body.keys)||body.keys.length===0)throw new Error('JWKS_INVALID');
  const next=new Map<string,Jwk>();
  for(const key of body.keys){
   if(typeof key.kid==='string'&&key.kty==='RSA'&&(!key.alg||key.alg==='RS256')&&(!key.use||key.use==='sig'))next.set(key.kid,key);
  }
  if(next.size===0)throw new Error('JWKS_INVALID');
  this.keys=next;this.expiresAt=Date.now()+(this.config.cacheTtlMs??300_000);
 }
 private async key(kid:string){
  if(Date.now()>=this.expiresAt||this.keys.size===0)await this.refresh();
  let key=this.keys.get(kid);
  if(!key){await this.refresh();key=this.keys.get(kid);}
  if(!key)throw new Error('JWT_KEY_NOT_FOUND');
  return key;
 }
 async verifyAuthorization(headers:Record<string,string|string[]|undefined>):Promise<VerifiedIdentity>{
  const authorization=headerValue(headers,'authorization');
  if(!authorization?.startsWith('Bearer '))throw new Error('AUTHENTICATION_REQUIRED');
  const token=authorization.slice(7).trim();const parts=token.split('.');
  if(parts.length!==3||parts.some(x=>!x))throw new Error('JWT_MALFORMED');
  const header=decodePart(parts[0]!);const payload=decodePart(parts[1]!);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||!header.kid)throw new Error('JWT_ALGORITHM_NOT_ALLOWED');
  const jwk=await this.key(header.kid);
  let publicKey;
  try{publicKey=createPublicKey({key:jwk as any,format:'jwk'});}
  catch{throw new Error('JWKS_INVALID');}
  const ok=verifySignature('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1],'utf8'),publicKey,Buffer.from(parts[2]!,'base64url'));
  if(!ok)throw new Error('JWT_SIGNATURE_INVALID');
  const now=Math.floor(Date.now()/1000),skew=this.config.clockSkewSeconds??60;
  if(payload.iss!==this.config.issuer)throw new Error('JWT_ISSUER_INVALID');
  if(!audienceMatches(payload.aud,this.config.audience))throw new Error('JWT_AUDIENCE_INVALID');
  if(typeof payload.exp!=='number'||payload.exp<now-skew)throw new Error('JWT_EXPIRED');
  if(typeof payload.nbf==='number'&&payload.nbf>now+skew)throw new Error('JWT_NOT_ACTIVE');
  if(typeof payload.iat==='number'&&payload.iat>now+skew)throw new Error('JWT_IAT_INVALID');
  if(typeof payload.sub!=='string'||!payload.sub.trim())throw new Error('JWT_SUBJECT_REQUIRED');
  const claim=this.config.rolesClaim??'roles',rawRoles=payload[claim];
  const roles=Array.isArray(rawRoles)?[...new Set(rawRoles.filter(x=>typeof x==='string').map(x=>String(x).trim()).filter(Boolean))]:[];
  return{actorId:payload.sub.trim(),roles};
 }
}

export function jwtVerifierFromEnv(env:NodeJS.ProcessEnv=process.env,fetchImpl:FetchLike=fetch){
 if(env.AWI_AUTH_MODE!=='jwt')return undefined;
 const issuer=env.AWI_JWT_ISSUER?.trim(),audience=env.AWI_JWT_AUDIENCE?.trim(),jwksUrl=env.AWI_JWKS_URL?.trim();
 if(!issuer||!audience||!jwksUrl)throw new Error('JWT_CONFIG_REQUIRED');
 return new JwtRs256Verifier({issuer,audience,jwksUrl,rolesClaim:env.AWI_JWT_ROLES_CLAIM?.trim()||'roles'},fetchImpl);
}
