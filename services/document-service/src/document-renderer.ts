import type {DocumentDraft} from './document-factory.js';
export type RenderFormat='docx'|'xlsx'|'pdf';
export type RenderArtifact={documentId:string;version:number;format:RenderFormat;contentType:string;storageKey:string;sha256?:string;status:'PENDING'|'STORED'};
export interface DocumentRenderer{readonly format:RenderFormat;render(draft:DocumentDraft):Promise<Uint8Array>;}
export interface RenderStorage{put(key:string,bytes:Uint8Array):Promise<void>;}
const contentTypes:Record<RenderFormat,string>={docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pdf:'application/pdf'};
export async function renderApprovedDocument(input:{draft:DocumentDraft;version:number;format:RenderFormat;renderer:DocumentRenderer;storage:RenderStorage}):Promise<RenderArtifact>{
 if(input.draft.status!=='APPROVED')throw new Error('DOCUMENT_APPROVAL_REQUIRED');
 if(input.renderer.format!==input.format)throw new Error('RENDERER_FORMAT_MISMATCH');
 const bytes=await input.renderer.render(input.draft);if(bytes.byteLength===0)throw new Error('EMPTY_RENDER_OUTPUT');
 const storageKey=`projects/${input.draft.projectId}/generated/${input.draft.id}/v${input.version}.${input.format}`;
 await input.storage.put(storageKey,bytes);
 return{documentId:input.draft.id,version:input.version,format:input.format,contentType:contentTypes[input.format],storageKey,status:'STORED'};
}
