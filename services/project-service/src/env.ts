export type RuntimeConfig = {
  databaseUrl:string; llmApiKey?:string; llmModel?:string; port:number;
};

export function validateRuntimeEnv(env:NodeJS.ProcessEnv=process.env):RuntimeConfig {
  const missing=['DATABASE_URL'].filter(k=>!env[k]);
  const deterministic=env.AWI_MODEL_PROVIDER==='deterministic-test';
  if(!deterministic) for(const key of ['AWI_LLM_API_KEY','AWI_LLM_MODEL']) if(!env[key]) missing.push(key);
  if(missing.length) throw new Error(`MISSING_ENV:${missing.join(',')}`);
  if(deterministic && env.NODE_ENV!=='test' && env.AWI_ALLOW_TEST_PROVIDER!=='true') throw new Error('TEST_MODEL_PROVIDER_FORBIDDEN');
  const port=Number(env.PORT??3001);
  if(!Number.isInteger(port)||port<1||port>65535) throw new Error('INVALID_PORT');
  return {databaseUrl:env.DATABASE_URL!,llmApiKey:env.AWI_LLM_API_KEY,llmModel:env.AWI_LLM_MODEL,port};
}
