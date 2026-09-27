import {readZipEntries} from './safe-zip-reader.js';

const decode=(s:string)=>s.replace(/&#(x[0-9a-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi,(_m,num,named)=>{
 if(num){const n=num[0].toLowerCase()==='x'?parseInt(num.slice(1),16):parseInt(num,10);return String.fromCodePoint(n);}
 return({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"} as Record<string,string>)[String(named).toLowerCase()]??'';
});
const strip=(s:string)=>decode(s.replace(/<[^>]+>/g,''));

export function parseXlsxText(bytes:Uint8Array):string{
 const entries=readZipEntries(bytes,{accept:n=>n==='xl/sharedStrings.xml'||/^xl\/worksheets\/[^/]+\.xml$/.test(n)});
 const map=new Map(entries.map(e=>[e.name,Buffer.from(e.data).toString('utf8')]));
 const shared:string[]=[];
 const ss=map.get('xl/sharedStrings.xml');
 if(ss)for(const m of ss.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g))shared.push(Array.from(m[1].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)).map(x=>decode(x[1])).join(''));
 const lines:string[]=[];
 for(const [name,xml] of [...map.entries()].filter(([n])=>n.startsWith('xl/worksheets/')).sort()){
  lines.push(`[${name.replace('xl/worksheets/','').replace(/\.xml$/,'')}]`);
  for(const row of xml.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)){
   const cells:string[]=[];
   for(const c of row[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)){
    const attrs=c[1],body=c[2],type=/\bt="([^"]+)"/.exec(attrs)?.[1];
    let value='';
    if(type==='inlineStr')value=Array.from(body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)).map(x=>decode(x[1])).join('');
    else {const raw=/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(body)?.[1]??'';value=type==='s'?shared[Number(raw)]??'':strip(raw);}
    cells.push(value);
   }
   if(cells.some(Boolean))lines.push(cells.join('\t'));
  }
 }
 if(lines.length===0)throw new Error('XLSX_NO_READABLE_CELLS');
 return lines.join('\n');
}
