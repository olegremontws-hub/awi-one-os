import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadAndRunVS001 } from '../services/project-service/src/upload-handler.js';

test('concurrent duplicate upload deletes losing object and returns durable winner',async()=>{
  const objects=new Map<string,Uint8Array>(), deleted:string[]=[];
  const storage={
    async put(key:string,bytes:Uint8Array){objects.set(key,bytes);},
    async get(key:string){const v=objects.get(key);if(!v)throw new Error('missing');return v;},
    async delete(key:string){deleted.push(key);objects.delete(key);},
  };
  let hashLookups=0;
  const winner={id:'winner',filename:'same.txt',storage_key:'winner-key',mime_type:'text/plain',processing_status:'processing'};
  const db={
    async query(sql:string){
      if(sql.startsWith('select id,filename,storage_key')) return {rows:hashLookups++===0?[]:[winner]};
      if(sql.startsWith('insert into project_documents')) return {rows:[],rowCount:0};
      throw new Error('unexpected query');
    },
  };
  const provider={} as any, repository={} as any;
  const result=await uploadAndRunVS001({
    projectId:'00000000-0000-0000-0000-000000000001',filename:'same.txt',mimeType:'text/plain',
    bytes:new TextEncoder().encode('same'),correlationId:'00000000-0000-0000-0000-000000000002',
    provider,repository,db,storage,
  });
  assert.equal(result.duplicate,true);
  assert.equal((result.document as any).id,'winner');
  assert.equal(deleted.length,1);
  assert.equal(objects.has(deleted[0]!),false);
});
