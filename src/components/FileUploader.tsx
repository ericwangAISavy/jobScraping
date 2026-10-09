'use client';
import { useRef, useState } from 'react';
import { MAX_FILE_SIZE, parseInputFile } from '@/lib/parseInputFile';
export default function FileUploader({ onLoad, disabled }: { onLoad: (urls: string[], name: string) => void; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(''); const [dragging, setDragging] = useState(false);
  async function read(file?: File) {
    if (!file || disabled) return;
    setError('');
    if (!/\.(md|txt)$/i.test(file.name)) { setError('Choose a .md or .txt file.'); return; }
    if (file.size > MAX_FILE_SIZE) { setError('File must be 1 MB or smaller.'); return; }
    try {
      const parsed = parseInputFile(await file.text());
      if (parsed.errors.length) { setError(parsed.errors.slice(0, 5).join(' ')); return; }
      if (!parsed.urls.length) { setError('The file contains no careers page URLs.'); return; }
      onLoad(parsed.urls, file.name);
    } catch { setError('Unable to read the file. Please try again.'); }
  }
  return <div>
    <div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length > 1) setError('Upload one file at a time.'); else void read(e.dataTransfer.files[0]); }} className={`rounded-xl border-2 border-dashed p-10 text-center transition ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-slate-50/60'}`}>
      <div aria-hidden="true" className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl text-blue-600">↑</div>
      <h3 className="font-semibold">Drop your careers pages file here</h3><p className="mt-2 text-sm text-slate-500">One URL per line · .md or .txt · up to 1 MB</p>
      <button disabled={disabled} onClick={() => input.current?.click()} className="mt-5 rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-semibold shadow-sm">Choose File</button>
      <input ref={input} type="file" aria-label="Upload careers pages file" accept=".md,.txt" disabled={disabled} className="sr-only" onChange={e => { void read(e.target.files?.[0]); e.target.value = ''; }} />
    </div>{error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  </div>;
}
