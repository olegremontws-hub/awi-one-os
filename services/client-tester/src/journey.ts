export type JourneyStep = { name:string; ok:boolean; detail?:string };
export type JourneyReport = { agentId:'QA-CLIENT-001'; passed:boolean; steps:JourneyStep[] };

export interface ClientTestDriver {
  health(): Promise<boolean>;
  createProject(): Promise<{id:string}>;
  uploadDocument(projectId:string): Promise<{document?:{documentId?:string;id?:string};decision?:unknown;duplicate?:boolean}>;
  roundTable(projectId:string): Promise<{decisionCards?:unknown[];timeline?:unknown[];documents?:unknown[];attention?:unknown[]}>;
  history(projectId:string): Promise<unknown[]>;
}

export async function runClientJourney(driver:ClientTestDriver):Promise<JourneyReport> {
  const steps:JourneyStep[]=[];
  const health=await driver.health(); steps.push({name:'service_health',ok:health});
  if(!health) return {agentId:'QA-CLIENT-001',passed:false,steps};
  const project=await driver.createProject(); steps.push({name:'create_project',ok:Boolean(project.id)});
  const upload=await driver.uploadDocument(project.id); steps.push({name:'upload_and_ai_intake',ok:Boolean(upload.document)});
  const table=await driver.roundTable(project.id);
  steps.push({name:'round_table_durable_state',ok:Array.isArray(table.decisionCards)&&Array.isArray(table.timeline)&&Array.isArray(table.documents)&&table.documents.length>0&&Array.isArray(table.attention)});
  const history=await driver.history(project.id); steps.push({name:'causal_history',ok:Array.isArray(history)});
  return {agentId:'QA-CLIENT-001',passed:steps.every(s=>s.ok),steps};
}
