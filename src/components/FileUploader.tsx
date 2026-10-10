'use client';
import { useRef,useState } from 'react';
import { IconSparkles } from '@tabler/icons-react';
import { MAX_FILE_SIZE,parseInputFile } from '@/lib/parseInputFile';
export default function FileUploader({onLoad,disabled}:{onLoad:(urls:string[],name:string)=>void;disabled:boolean}) {
  const input=useRef<HTMLInputElement>(null);const [error,setError]=useState('');const [dragging,setDragging]=useState(false);
  async function read(file?:File) {
    if(!file||disabled)return;setError('');
    if(!/\.(md|txt)$/i.test(file.name)){setError('Choose a .md or .txt file.');return;}
    if(file.size>MAX_FILE_SIZE){setError('File must be 1 MB or smaller.');return;}
    try {const p=parseInputFile(await file.text());if(p.errors.length){setError(p.errors.slice(0,5).join(' '));return;}if(!p.urls.length){setError('The file contains no careers page URLs.');return;}onLoad(p.urls,file.name);}catch{setError('Unable to read this file.');}
  }
  return <div><div onDragOver={e=>{e.preventDefault();if(!disabled)setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);if(e.dataTransfer.files.length>1)setError('Upload one file at a time.');else void read(e.dataTransfer.files[0]);}} className={`rounded-lg border border-dashed px-4 py-[14px] text-center ${dragging?'border-blue-500 bg-blue-50':'border-[#d4e0f4] bg-[#f8faff]'}`}>
    <div className="icon-tile mx-auto mb-3"><IconSparkles size={28} stroke={1.8}/></div><h3 className="font-semibold">Drag &amp; drop your file here</h3><p className="mt-1.5 text-xs text-[var(--muted)]">One URL per line · .md or .txt · up to 1 MB</p><button className="quiet-button mt-4 min-w-36 font-medium" disabled={disabled} onClick={()=>input.current?.click()}>Choose File</button><input ref={input} type="file" aria-label="Upload careers pages file" accept=".md,.txt" className="sr-only" disabled={disabled} onChange={e=>{void read(e.target.files?.[0]);e.target.value='';}}/></div>{error&&<p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}</div>;
}
