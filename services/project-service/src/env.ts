export type RuntimeConfig = {
  databaseUrl: string; llmApiKey: string; llmModel: string; port: number;
};

export function validateRuntimeEnv(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const missing = ['DATABASE_URL','AWI_LLM_API_KEY','AWI_LLM_MODEL'].filter(k => !env[k]);
  if (missing.length) throw new Error(`MISSING_ENV:${missing.join(',')}`);
  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('INVALID_PORT');
  return { databaseUrl: env.DATABASE_URL!, llmApiKey: env.AWI_LLM_API_KEY!, llmModel: env.AWI_LLM_MODEL!, port };
}
