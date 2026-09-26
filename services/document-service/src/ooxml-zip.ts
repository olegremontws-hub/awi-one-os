type ZipEntry={name:string;data:string|Uint8Array};

const crcTable=Array.from({length:256},(_,n)=>{
 let c=n;
 for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;
 return c>>>0;
});

function crc32(data:Uint8Array){
 let c=0xffffffff;
 for(const b of data)c=crcTable[(c^b)&0xff]!^(c>>>8);
 return (c^0xffffffff)>>>0;
}

function localHeader(name:Buffer,data:Buffer,crc:number){
 const h=Buffer.alloc(30+name.length);
 h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0,6);h.writeUInt16LE(0,8);
 h.writeUInt16LE(0,10);h.writeUInt16LE(0x21,12);h.writeUInt32LE(crc,14);h.writeUInt32LE(data.length,18);
 h.writeUInt32LE(data.length,22);h.writeUInt16LE(name.length,26);h.writeUInt16LE(0,28);name.copy(h,30);
 return h;
}

function centralHeader(name:Buffer,data:Buffer,crc:number,offset:number){
 const h=Buffer.alloc(46+name.length);
 h.writeUInt32LE(0x02014b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(20,6);h.writeUInt16LE(0,8);
 h.writeUInt16LE(0,10);h.writeUInt16LE(0,12);h.writeUInt16LE(0x21,14);h.writeUInt32LE(crc,16);
 h.writeUInt32LE(data.length,20);h.writeUInt32LE(data.length,24);h.writeUInt16LE(name.length,28);
 h.writeUInt16LE(0,30);h.writeUInt16LE(0,32);h.writeUInt16LE(0,34);h.writeUInt16LE(0,36);
 h.writeUInt32LE(0,38);h.writeUInt32LE(offset,42);name.copy(h,46);
 return h;
}

export function zipStore(entries:readonly ZipEntry[]):Uint8Array{
 const locals:Buffer[]=[];const centrals:Buffer[]=[];let offset=0;
 for(const entry of entries){
  const name=Buffer.from(entry.name,'utf8');
  const data=typeof entry.data==='string'?Buffer.from(entry.data,'utf8'):Buffer.from(entry.data);
  const crc=crc32(data),local=localHeader(name,data,crc);
  locals.push(local,data);centrals.push(centralHeader(name,data,crc,offset));offset+=local.length+data.length;
 }
 const central=Buffer.concat(centrals),body=Buffer.concat(locals);
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(0,4);end.writeUInt16LE(0,6);
 end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(central.length,12);
 end.writeUInt32LE(body.length,16);end.writeUInt16LE(0,20);
 return Buffer.concat([body,central,end]);
}
