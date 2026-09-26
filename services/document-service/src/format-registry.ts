export type FormatCapability = {
  accepted: boolean; parserAvailable: boolean; ocrAvailable: boolean;
  structuredExtraction: boolean; preview: boolean; generation: boolean; validation: boolean;
};
export type FormatDefinition = {
  id: string; extensions: readonly string[]; mimePatterns: readonly RegExp[]; family: string; capabilities: FormatCapability;
};
const cap=(x:Partial<FormatCapability>):FormatCapability=>({accepted:true,parserAvailable:false,ocrAvailable:false,structuredExtraction:false,preview:false,generation:false,validation:false,...x});
export const FORMAT_REGISTRY: readonly FormatDefinition[] = [
 {id:'pdf',extensions:['pdf'],mimePatterns:[/^application\/pdf$/i],family:'document',capabilities:cap({parserAvailable:true,ocrAvailable:true,preview:true,validation:true})},
 {id:'text',extensions:['txt','md','csv','json','xml','yaml','yml','html','htm'],mimePatterns:[/^text\//i,/json|xml|yaml/i],family:'text',capabilities:cap({parserAvailable:true,structuredExtraction:true,preview:true,validation:true})},
 {id:'word',extensions:['doc','docx','odt','rtf'],mimePatterns:[/word|officedocument\.wordprocessingml|opendocument\.text|rtf/i],family:'document',capabilities:cap({generation:true,preview:true})},
 {id:'sheet',extensions:['xls','xlsx','xlsm','xlsb','ods','csv','tsv'],mimePatterns:[/excel|spreadsheet|opendocument\.spreadsheet|csv/i],family:'spreadsheet',capabilities:cap({preview:true,generation:true})},
 {id:'presentation',extensions:['ppt','pptx','odp'],mimePatterns:[/powerpoint|presentation/i],family:'presentation',capabilities:cap({preview:true,generation:true})},
 {id:'image',extensions:['jpg','jpeg','png','tif','tiff','bmp','webp','heic'],mimePatterns:[/^image\//i],family:'image',capabilities:cap({ocrAvailable:true,preview:true,validation:true})},
 {id:'archive',extensions:['zip','7z','rar','tar','gz'],mimePatterns:[/zip|7z|rar|tar|gzip/i],family:'archive',capabilities:cap({})},
 {id:'email',extensions:['eml','msg'],mimePatterns:[/message\/rfc822|outlook/i],family:'email',capabilities:cap({})},
 {id:'cad-bim',extensions:['dwg','dxf','ifc','rvt','dgn','step','stp','iges','igs'],mimePatterns:[/dwg|dxf|ifc|revit|step|iges/i],family:'engineering',capabilities:cap({})},
 {id:'geo',extensions:['landxml','kml','kmz','shp','geojson'],mimePatterns:[/kml|kmz|geo\+json/i],family:'geospatial',capabilities:cap({})},
 {id:'video',extensions:['mp4','mov','avi','webm','mkv'],mimePatterns:[/^video\//i],family:'video',capabilities:cap({preview:true})},
 {id:'audio',extensions:['mp3','wav','m4a','aac','ogg'],mimePatterns:[/^audio\//i],family:'audio',capabilities:cap({preview:true})},
];
export function detectFormat(filename:string,mimeType=''):FormatDefinition|undefined {
 const ext=filename.toLowerCase().split('.').pop() ?? '';
 return FORMAT_REGISTRY.find(f=>f.extensions.includes(ext)||f.mimePatterns.some(p=>p.test(mimeType)));
}
export type IngestionRoute='embedded_text'|'ocr'|'parser'|'store_only';
export function routeFormat(format:FormatDefinition, opts:{hasUsableText?:boolean}={}):IngestionRoute {
 if(format.id==='pdf') return opts.hasUsableText===false?'ocr':'embedded_text';
 if(format.capabilities.parserAvailable) return 'parser';
 if(format.capabilities.ocrAvailable) return 'ocr';
 return 'store_only';
}
