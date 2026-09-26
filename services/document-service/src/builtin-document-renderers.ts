import type {DocumentDraft} from './document-factory.js';
import type {DocumentRenderer,RenderFormat} from './document-renderer.js';
import {zipStore} from './ooxml-zip.js';

const xml=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));

function draftLines(draft:DocumentDraft){
 const lines=[`${draft.kind.toUpperCase()} · ${draft.templateId} v${draft.templateVersion}`];
 for(const field of draft.fields){
  lines.push(`${field.key}: ${String(field.value)}`);
  lines.push(`Evidence: ${field.sourceEvidenceIds.join(', ')}`);
 }
 return lines;
}

export class DocxDocumentRenderer implements DocumentRenderer{
 readonly format='docx' as const;
 async render(draft:DocumentDraft){
  const paragraphs=draftLines(draft).map(line=>`<w:p><w:r><w:t xml:space="preserve">${xml(line)}</w:t></w:r></w:p>`).join('');
  return zipStore([
   {name:'[Content_Types].xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`},
   {name:'_rels/.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`},
   {name:'word/document.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`},
  ]);
 }
}

function cell(ref:string,value:string|number){
 if(typeof value==='number'&&Number.isFinite(value))return `<c r="${ref}" t="n"><v>${value}</v></c>`;
 return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}

export class XlsxDocumentRenderer implements DocumentRenderer{
 readonly format='xlsx' as const;
 async render(draft:DocumentDraft){
  const rows=[['Field','Value','Evidence'] as const,...draft.fields.map(f=>[f.key,f.value,f.sourceEvidenceIds.join(', ')] as const)];
  const sheet=rows.map((r,i)=>`<row r="${i+1}">${cell(`A${i+1}`,r[0])}${cell(`B${i+1}`,r[1])}${cell(`C${i+1}`,r[2])}</row>`).join('');
  return zipStore([
   {name:'[Content_Types].xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`},
   {name:'_rels/.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
   {name:'xl/workbook.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="AWI ONE" sheetId="1" r:id="rId1"/></sheets></workbook>`},
   {name:'xl/_rels/workbook.xml.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`},
   {name:'xl/worksheets/sheet1.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheet}</sheetData></worksheet>`},
  ]);
 }
}

function cp1251(text:string){
 const out:number[]=[];
 for(const ch of text){
  const n=ch.codePointAt(0)!;
  if(n<=0x7f)out.push(n);
  else if(n>=0x410&&n<=0x44f)out.push(0xc0+n-0x410);
  else if(n===0x401)out.push(0xa8);
  else if(n===0x451)out.push(0xb8);
  else if(n===0x2013)out.push(0x96);
  else if(n===0x2014)out.push(0x97);
  else if(n===0xab)out.push(0xab);
  else if(n===0xbb)out.push(0xbb);
  else if(n===0x2116)out.push(0xb9);
  else if(n===0xa0)out.push(0x20);
  else out.push(0x3f);
 }
 return out;
}
const hexText=(text:string)=>cp1251(text).map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();

function wrap(lines:string[],width=92){
 const out:string[]=[];
 for(const line of lines){
  let rest=line;
  while(rest.length>width){out.push(rest.slice(0,width));rest=rest.slice(width);}
  out.push(rest);
 }
 return out;
}

function pdfBytes(lines:string[]):Uint8Array{
 const upper=Array.from({length:32},(_,i)=>`/afii${i<6?10017+i:10018+i}`);
 const lower=Array.from({length:32},(_,i)=>`/afii${i<6?10065+i:10066+i}`);
 const differences=`168 /afii10023 184 /afii10071 192 ${upper.join(' ')} ${lower.join(' ')}`;
 const widths=Array.from({length:224},()=>500).join(' ');
 const pages:string[][]=[];const all=wrap(lines);
 for(let i=0;i<all.length;i+=52)pages.push(all.slice(i,i+52));
 if(!pages.length)pages.push(['AWI ONE']);
 const objects:string[]=[];
 const pageNums=pages.map((_,i)=>5+i*2);
 objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
 objects[2]=`<< /Type /Pages /Count ${pages.length} /Kids [${pageNums.map(n=>`${n} 0 R`).join(' ')}] >>`;
 objects[3]=`<< /Type /Font /Subtype /TrueType /BaseFont /Arial /FirstChar 32 /LastChar 255 /Widths [${widths}] /FontDescriptor 4 0 R /Encoding << /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences [${differences}] >> >>`;
 objects[4]='<< /Type /FontDescriptor /FontName /Arial /Flags 32 /FontBBox [-665 -325 2000 1006] /ItalicAngle 0 /Ascent 905 /Descent -211 /CapHeight 716 /StemV 80 >>';
 pages.forEach((page,i)=>{
  const pageNo=5+i*2,contentNo=pageNo+1;
  const stream=`BT /F1 10 Tf 42 800 Td 13 TL ${page.map(line=>`<${hexText(line)}> Tj T*`).join(' ')} ET`;
  objects[pageNo]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentNo} 0 R >>`;
  objects[contentNo]=`<< /Length ${Buffer.byteLength(stream,'ascii')} >>\nstream\n${stream}\nendstream`;
 });
 const max=objects.length-1,header=Buffer.from('%PDF-1.4\n%AWI-ONE\n','ascii');
 const parts:Buffer[]=[header],offsets:number[]=[0];let offset=header.length;
 for(let n=1;n<=max;n++){
  const part=Buffer.from(`${n} 0 obj\n${objects[n]}\nendobj\n`,'ascii');
  offsets[n]=offset;parts.push(part);offset+=part.length;
 }
 const xrefOffset=offset;
 let xref=`xref\n0 ${max+1}\n0000000000 65535 f \n`;
 for(let n=1;n<=max;n++)xref+=`${String(offsets[n]).padStart(10,'0')} 00000 n \n`;
 xref+=`trailer\n<< /Size ${max+1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
 parts.push(Buffer.from(xref,'ascii'));
 return Buffer.concat(parts);
}

export class PdfDocumentRenderer implements DocumentRenderer{
 readonly format='pdf' as const;
 async render(draft:DocumentDraft){return pdfBytes(draftLines(draft));}
}

export function builtInDocumentRenderer(format:RenderFormat):DocumentRenderer{
 if(format==='docx')return new DocxDocumentRenderer();
 if(format==='xlsx')return new XlsxDocumentRenderer();
 return new PdfDocumentRenderer();
}
