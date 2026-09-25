import type { ClientTestDriver } from './journey.js';

async function json(response:Response) {
  if(!response.ok) throw new Error(`HTTP_${response.status}`);
  return response.json();
}

export class HttpClientTestDriver implements ClientTestDriver {
  constructor(private readonly baseUrl:string, private readonly fixtureText='Client QA synthetic project requirements') {}
  async health(){ return (await fetch(`${this.baseUrl}/health`)).ok; }
  async createProject(){
    return json(await fetch(`${this.baseUrl}/v1/projects`,{
      method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({projectCode:`QA-${Date.now()}`,name:'QA-CLIENT-001 synthetic project'})
    })) as Promise<{id:string}>;
  }
  async uploadDocument(projectId:string){
    const form=new FormData();
    form.append('file',new Blob([this.fixtureText],{type:'text/plain'}),'requirements.txt');
    return json(await fetch(`${this.baseUrl}/v1/projects/${projectId}/documents`,{method:'POST',body:form})) as Promise<any>;
  }
  async roundTable(projectId:string){ return json(await fetch(`${this.baseUrl}/v1/projects/${projectId}/round-table`)) as Promise<any>; }
  async history(projectId:string){ return json(await fetch(`${this.baseUrl}/v1/projects/${projectId}/history`)) as Promise<any[]>; }
}
