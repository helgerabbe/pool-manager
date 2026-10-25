import React, { useState } from 'react';
import { NotebookPen, X, Trash2, Plus } from 'lucide-react';

const KEY = 'notizheft';
const laden = () => JSON.parse(localStorage.getItem(KEY) || '[]');

/** Persönliches Notizheft des Schülers: Symbol links unten, Notizen bleiben über alle Folien erhalten (auf dem Gerät gespeichert). */
export default function NotizHeft({ gross }) {
  const [offen, setOffen] = useState(false);
  const [notizen, setNotizen] = useState(laden);
  const [neu, setNeu] = useState('');
  const speichern = (n) => { setNotizen(n); localStorage.setItem(KEY, JSON.stringify(n)); };
  const hinzu = () => { if (!neu.trim()) return; speichern([...notizen, neu.trim()]); setNeu(''); };
  const s = gross ? 'h-9 w-9' : 'h-6 w-6';
  return (
    <div className="absolute bottom-3 left-3 z-30 text-left" onClick={(e) => e.stopPropagation()}>
      {offen && (
        <div className={`absolute bottom-full left-0 mb-2 rounded-xl border border-[#EBD9A0] bg-[#FBF3D5] p-2 text-[#6B4423] shadow-lg ${gross ? 'w-80 text-base' : 'w-56 text-[11px]'}`}>
          <div className="mb-1 flex items-center font-semibold"><NotebookPen className="mr-1 h-4 w-4" />Mein Notizheft<button onClick={() => setOffen(false)} className="ml-auto"><X className="h-4 w-4" /></button></div>
          <div className="max-h-40 space-y-1 overflow-y-auto">
            {notizen.length === 0 && <p className="italic opacity-70">Noch keine Notizen.</p>}
            {notizen.map((n, i) => (
              <div key={i} className="flex gap-1 rounded bg-white/60 p-1">
                <textarea rows={1} value={n} onChange={(e) => speichern(notizen.map((x, j) => (j === i ? e.target.value : x)))} className="flex-1 resize-none bg-transparent outline-none" />
                <button onClick={() => speichern(notizen.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1">
            <input value={neu} onChange={(e) => setNeu(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && hinzu()} placeholder="Frage oder Stichwort …" className="flex-1 rounded border border-[#EBD9A0] bg-white px-1 outline-none" />
            <button onClick={hinzu} className="rounded bg-[#6B4423] px-1 text-white"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
      )}
      <button title="Mein Notizheft" onClick={() => setOffen(!offen)} className={`relative flex items-center justify-center rounded-full border border-[#EBD9A0] bg-[#FBF3D5] text-[#6B4423] ${s}`}>
        <NotebookPen className={gross ? 'h-4 w-4' : 'h-3 w-3'} />
        {notizen.length > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-[#6B4423] px-1 text-[9px] text-white">{notizen.length}</span>}
      </button>
    </div>
  );
}