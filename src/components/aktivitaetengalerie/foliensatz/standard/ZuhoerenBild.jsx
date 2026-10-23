import React, { useState } from 'react';
import { Ear, VolumeX, NotebookPen } from 'lucide-react';
import { CI_SYMBOL_STIL } from '@/lib/folienCI';

const gross = { background: CI_SYMBOL_STIL.hg, color: CI_SYMBOL_STIL.farbe };

/** Zuhör-Folie: Ohr + Stille-Zeichen, optional ein Notizfeld für Fragen und Stichworte. */
export default function ZuhoerenBild({ ansicht }) {
  const [notiz, setNotiz] = useState(false);
  if (ansicht === 'lehrer') return <p className="text-xs">(Inhalt der Lehrkraft an der Tafel)</p>;
  return (
    <div className="flex flex-col items-center gap-2 text-center text-xs">
      <div className="flex gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-full" style={gross}><Ear className="h-6 w-6" /></span>
        <span className="flex h-12 w-12 items-center justify-center rounded-full" style={gross}><VolumeX className="h-6 w-6" /></span>
      </div>
      <p>Deine Lehrkraft erklärt dir jetzt etwas.<br />Sei leise, hör zu und stör die anderen nicht.</p>
      {notiz
        ? <textarea rows={2} placeholder="Stichwort oder Frage, damit du sie nicht vergisst …" className="w-48 rounded-lg border border-[#EBD9A0] bg-[#FBF3D5] p-1.5 text-[10px] text-[#6B4423]" />
        : <button onClick={() => setNotiz(true)} className="flex items-center gap-1 rounded-full border border-[#EBD9A0] bg-[#FBF3D5] px-2 py-0.5 text-[10px] text-[#6B4423]"><NotebookPen className="h-3 w-3" />Notiz machen</button>}
    </div>
  );
}