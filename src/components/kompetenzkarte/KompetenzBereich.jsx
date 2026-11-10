import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { STUFEN, sortiert, neueId } from '@/lib/kompetenzkarte';
import KompetenzZeile from './KompetenzZeile';

/** Ein Bereich der Kompetenzkarte als Tabelle, sortiert von zentral zu ergänzend. */
export default function KompetenzBereich({ bereich, verweise, onChange, onDelete }) {
  const ks = bereich.kompetenzen || [];
  const setzeK = (neu) => onChange({ ...bereich, kompetenzen: ks.map((k) => (k.id === neu.id ? neu : k)) });
  const entferneK = (id) => onChange({ ...bereich, kompetenzen: ks.filter((k) => k.id !== id) });
  const neu = () => onChange({ ...bereich, kompetenzen: [...ks, { id: neueId('K'), text: '', gewicht: 'wichtig', verweise: [] }] });
  return (
    <div className="overflow-hidden rounded-lg border-2 border-foreground/70 bg-card">
      <div className="grid grid-cols-[1fr_repeat(4,5.5rem)] bg-muted">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2">
            <input value={bereich.titel} onChange={(e) => onChange({ ...bereich, titel: e.target.value })} placeholder="Bereich"
              className="flex-1 bg-transparent font-bold outline-none" />
            <button type="button" onClick={onDelete} title="Bereich entfernen" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
          <p className="text-xs text-muted-foreground">Du kannst …</p>
        </div>
        {STUFEN.map((s) => <div key={s} className="flex items-center justify-center border-l px-1 text-center text-[10px] leading-tight">{s}</div>)}
      </div>
      {sortiert(ks).map((k) => (
        <KompetenzZeile key={k.id} k={k} verweise={verweise} onChange={setzeK} onDelete={() => entferneK(k.id)} />
      ))}
      <button type="button" onClick={neu} className="flex w-full items-center gap-1 border-t px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">
        <Plus className="h-3.5 w-3.5" /> Kompetenz hinzufügen
      </button>
    </div>
  );
}