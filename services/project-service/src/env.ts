export type RuntimeConfig = {
  databaseUrl:string; llmApiKey?:string; llmModel?:string; port:number; ocrProvider?:string; ocrEndpoint?:string;
};

export function validateRuntimeEnv(env:NodeJS.ProcessEnv=process.env):RuntimeConfig {
  const missing=['DATABASE_URL'].filter(k=>!env[k]);
  const deterministic=env.AWI_MODEL_PROVIDER==='deterministic-test';
  const testRuntime=env.NODE_ENV==='test'||env.NODE_ENV==='ci';
  if(!deterministic) for(const key of ['AWI_LLM_API_KEY','AWI_LLM_MODEL']) if(!env[key]) missing.push(key);
  if(!testRuntime){
    if(!env.AWI_AUTH_MODE) missing.push('AWI_AUTH_MODE');
    else if(!['jwt','trusted-headers'].includes(env.AWI_AUTH_MODE)) throw new Error('INVALID_AUTH_MODE');
    else if(env.AWI_AUTH_MODE==='jwt'){
      for(const key of ['AWI_JWT_ISSUER','AWI_JWT_AUDIENCE','AWI_JWKS_URL']) if(!env[key]) missing.push(key);
    } else if(env.AWI_AUTH_MODE==='trusted-headers'&&env.AWI_TRUSTED_PROXY_AUTH!=='true') {
      throw new Error('TRUSTED_HEADER_AUTH_REQUIRES_PROXY_ASSERTION');
    }
  }
  if(missing.length) throw new Error(`MISSING_ENV:${missing.join(',')}`);
  if(deterministic && env.NODE_ENV!=='test' && env.AWI_ALLOW_TEST_PROVIDER!=='true') throw new Error('TEST_MODEL_PROVIDER_FORBIDDEN');
  if(env.OCR_PROVIDER){
    if(env.OCR_PROVIDER!=='http-bridge') throw new Error('UNSUPPORTED_OCR_PROVIDER');
    if(!env.OCR_ENDPOINT?.trim()) throw new Error('MISSING_ENV:OCR_ENDPOINT');
    const ocrTimeout=Number(env.OCR_TIMEOUT_MS??60_000);
    if(!Number.isFinite(ocrTimeout)||ocrTimeout<1_000||ocrTimeout>300_000) throw new Error('INVALID_OCR_TIMEOUT');
  }
  const port=Number(env.PORT??3001);
  if(!Number.isInteger(port)||port<1||port>65535) throw new Error('INVALID_PORT');
  return {databaseUrl:env.DATABASE_URL!,llmApiKey:env.AWI_LLM_API_KEY,llmModel:env.AWI_LLM_MODEL,port,ocrProvider:env.OCR_PROVIDER,ocrEndpoint:env.OCR_ENDPOINT};
}
