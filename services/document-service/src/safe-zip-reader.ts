import {inflateRawSync} from 'node:zlib';

export type ZipEntryData={name:string;data:Uint8Array};

const u16=(b:Buffer,o:number)=>b.readUInt16LE(o);
const u32=(b:Buffer,o:number)=>b.readUInt32LE(o);

export function readZipEntries(input:Uint8Array,opts:{maxEntries?:number;maxEntryBytes?:number;maxTotalBytes?:number;accept?:(name:string)=>boolean}={}):ZipEntryData[]{
 const b=Buffer.from(input),maxEntries=opts.maxEntries??2048,maxEntryBytes=opts.maxEntryBytes??20_000_000,maxTotalBytes=opts.maxTotalBytes??50_000_000;
 let eocd=-1;for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){if(u32(b,i)===0x06054b50){eocd=i;break;}}
 if(eocd<0)throw new Error('ZIP_EOCD_NOT_FOUND');
 const count=u16(b,eocd+10),centralSize=u32(b,eocd+12),centralOffset=u32(b,eocd+16);
 if(count>maxEntries)throw new Error('ZIP_TOO_MANY_ENTRIES');
 if(centralOffset+centralSize>b.length)throw new Error('ZIP_CENTRAL_DIRECTORY_INVALID');
 const out:ZipEntryData[]=[];let p=centralOffset,total=0;
 for(let n=0;n<count;n++){
  if(u32(b,p)!==0x02014b50)throw new Error('ZIP_CENTRAL_ENTRY_INVALID');
  const flags=u16(b,p+8),method=u16(b,p+10),compressed=u32(b,p+20),uncompressed=u32(b,p+24);
  const nameLen=u16(b,p+28),extraLen=u16(b,p+30),commentLen=u16(b,p+32),localOffset=u32(b,p+42);
  if(flags&1)throw new Error('ZIP_ENCRYPTED_UNSUPPORTED');
  const name=b.subarray(p+46,p+46+nameLen).toString('utf8');
  if(name.startsWith('/')||name.includes('..')||name.includes('\\'))throw new Error('ZIP_UNSAFE_PATH');
  p+=46+nameLen+extraLen+commentLen;
  if(!opts.accept?.(name))continue;
  if(uncompressed>maxEntryBytes)throw new Error('ZIP_ENTRY_TOO_LARGE');
  if(compressed>0&&uncompressed/compressed>200)throw new Error('ZIP_COMPRESSION_RATIO_EXCEEDED');
  if(u32(b,localOffset)!==0x04034b50)throw new Error('ZIP_LOCAL_ENTRY_INVALID');
  const localNameLen=u16(b,localOffset+26),localExtraLen=u16(b,localOffset+28),start=localOffset+30+localNameLen+localExtraLen,end=start+compressed;
  if(end>b.length)throw new Error('ZIP_ENTRY_TRUNCATED');
  const raw=b.subarray(start,end);
  let data:Buffer;
  if(method===0)data=Buffer.from(raw);
  else if(method===8)data=inflateRawSync(raw,{maxOutputLength:maxEntryBytes});
  else throw new Error('ZIP_COMPRESSION_UNSUPPORTED');
  if(data.length!==uncompressed)throw new Error('ZIP_SIZE_MISMATCH');
  total+=data.length;if(total>maxTotalBytes)throw new Error('ZIP_TOTAL_TOO_LARGE');
  out.push({name,data});
 }
 return out;
}
