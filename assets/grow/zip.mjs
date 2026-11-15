// Minimal ZIP writer (stored, no compression) for bundling generated files in the browser.
const table=new Uint32Array(256).map((_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;return c>>>0;});
const crc32=bytes=>{let c=0xFFFFFFFF;for(const b of bytes)c=table[(c^b)&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};

function dosTime(date){
 const time=(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1);
 const day=((Math.max(1980,date.getFullYear())-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
 return [time,day];
}

/** @param {{name:string,data:Uint8Array|string}[]} files */
export function zipFiles(files,date=new Date()){
 const encoder=new TextEncoder(),[time,day]=dosTime(date),locals=[],central=[];
 let offset=0;
 for(const file of files){
  const name=encoder.encode(file.name),data=typeof file.data==='string'?encoder.encode(file.data):file.data,crc=crc32(data);
  const local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);
  lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(6,0x0800,true);lv.setUint16(8,0,true);
  lv.setUint16(10,time,true);lv.setUint16(12,day,true);lv.setUint32(14,crc,true);
  lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,name.length,true);
  local.set(name,30);locals.push(local,data);
  const entry=new Uint8Array(46+name.length),cv=new DataView(entry.buffer);
  cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x0800,true);
  cv.setUint16(12,time,true);cv.setUint16(14,day,true);cv.setUint32(16,crc,true);
  cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);
  cv.setUint32(42,offset,true);entry.set(name,46);central.push(entry);
  offset+=local.length+data.length;
 }
 const size=central.reduce((n,e)=>n+e.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);
 ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);
 ev.setUint32(12,size,true);ev.setUint32(16,offset,true);
 return new Blob([...locals,...central,end],{type:'application/zip'});
}
