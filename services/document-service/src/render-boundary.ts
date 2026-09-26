import type {DocumentDraft} from './document-factory.js';import type {RenderFormat} from './document-renderer.js';import type {TemplateDefinition} from './document-templates.js';
export function validateRenderRequest(draft:DocumentDraft,template:TemplateDefinition,format:RenderFormat){
 const issues:string[]=[];if(draft.status!=='APPROVED')issues.push('DOCUMENT_APPROVAL_REQUIRED');if(draft.templateId!==template.id||draft.templateVersion!==template.version)issues.push('TEMPLATE_VERSION_MISMATCH');if(!template.outputFormats.includes(format))issues.push('OUTPUT_FORMAT_NOT_ALLOWED');if(draft.issues.length)issues.push('DOCUMENT_DRAFT_HAS_ISSUES');return issues;
}
