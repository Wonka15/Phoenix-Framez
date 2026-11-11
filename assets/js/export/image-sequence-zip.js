/** Dependency-free ZIP (STORE) writer for numbered still-image sequences. */
const table = (() => { const t = new Uint32Array(256); for (let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0;} return t; })();
const crc32 = bytes => { let c=0xffffffff; for(const b of bytes)c=table[(c^b)&255]^(c>>>8); return (c^0xffffffff)>>>0; };
const u16 = n => [n&255,(n>>>8)&255];
const u32 = n => [n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
const join = parts => { const out=new Uint8Array(parts.reduce((s,p)=>s+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out; };
const bytesFromDataUrl = url => { const raw=atob(url.split(",")[1]||"");const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out; };
export function makeImageSequenceZip(frames) {
  const entries=frames.filter(f=>f?.src&&!f.blank).map((f,i)=>({name:"frames/frame_"+String(i+1).padStart(4,"0")+".jpg",data:bytesFromDataUrl(f.src)}));
  if(!entries.length)throw new Error("There are no captured images to package.");
  entries.push({name:"README.txt",data:new TextEncoder().encode("PhoenixFramez image sequence\nFrames are numbered in playback order. Import at your chosen FPS.\n")});
  const local=[],central=[];let offset=0;
  for(const e of entries){const name=new TextEncoder().encode(e.name),crc=crc32(e.data);
    const header=join([new Uint8Array([80,75,3,4]),new Uint8Array(u16(20)),new Uint8Array(u16(0)),new Uint8Array(u16(0)),new Uint8Array(u16(0)),new Uint8Array(u16(0)),new Uint8Array(u32(crc)),new Uint8Array(u32(e.data.length)),new Uint8Array(u32(e.data.length)),new Uint8Array(u16(name.length)),new Uint8Array(u16(0)),name,e.data]);
    local.push(header);
    central.push(join([new Uint8Array([80,75,1,2]),new Uint8Array(u16(20)),new Uint8Array(u16(20)),new Uint8Array(u16(0)),new Uint8Array(u16(0)),new Uint8Array(u16(0)),new Uint8Array(u16(0)),new Uint8Array(u32(crc)),new Uint8Array(u32(e.data.length)),new Uint8Array(u32(e.data.length)),new Uint8Array(u16(name.length)),new Uint8Array(u16(0)),new Uint8Array(u16(0)),new Uint8Array(u16(0)),new Uint8Array(u16(0)),new Uint8Array(u32(0)),new Uint8Array(u32(offset)),name]));
    offset+=header.length;
  }
  const directory=join(central),end=join([new Uint8Array([80,75,5,6]),new Uint8Array(u16(0)),new Uint8Array(u16(0)),new Uint8Array(u16(entries.length)),new Uint8Array(u16(entries.length)),new Uint8Array(u32(directory.length)),new Uint8Array(u32(offset)),new Uint8Array(u16(0))]);
  return new Blob([...local,directory,end],{type:"application/zip"});
}
export function downloadBlob(blob,filename){const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);}
