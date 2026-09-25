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
  async uploadDocumentWithCorrelation(projectId:string,correlationId:string){
    const form=new FormData();
    form.append('file',new Blob([this.fixtureText],{type:'text/plain'}),'requirements.txt');
    form.append('correlationId',correlationId);
    return json(await fetch(`${this.baseUrl}/v1/projects/${projectId}/documents`,{method:'POST',body:form})) as Promise<any>;
  }
  async roundTable(projectId:string){ return json(await fetch(`${this.baseUrl}/v1/projects/${projectId}/round-table`)) as Promise<any>; }
  async history(projectId:string){ return json(await fetch(`${this.baseUrl}/v1/projects/${projectId}/history`)) as Promise<any[]>; }
  async uploadMalformedPdf(projectId:string){
    const form=new FormData(); form.append('file',new Blob(['not a pdf'],{type:'application/pdf'}),'broken.pdf');
    const response=await fetch(`${this.baseUrl}/v1/projects/${projectId}/documents`,{method:'POST',body:form});
    return {status:response.status,body:await response.json() as any};
  }
  async uploadUnsupported(projectId:string){
    const form=new FormData(); form.append('file',new Blob([new Uint8Array([1,2,3])],{type:'application/octet-stream'}),'payload.bin');
    const response=await fetch(`${this.baseUrl}/v1/projects/${projectId}/documents`,{method:'POST',body:form});
    return {status:response.status,body:await response.json() as any};
  }
}
