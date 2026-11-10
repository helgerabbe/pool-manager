import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GEWICHTE, neueId } from '@/lib/kompetenzkarte';
import KompetenzBereich from './KompetenzBereich';

/** Bearbeitbare Kompetenzkarte im Aufbau der Schulvorlage. */
export default function KompetenzkarteEditor({ karte, verweise, onChange }) {
  const bereiche = karte.bereiche || [];
  const setzeB = (neu) => onChange({ ...karte, bereiche: bereiche.map((b) => (b.id === neu.id ? neu : b)) });
  const entferneB = (id) => {
    if (window.confirm('Diesen Bereich mit allen Kompetenzen entfernen?')) onChange({ ...karte, bereiche: bereiche.filter((b) => b.id !== id) });
  };
  const neuerB = () => onChange({ ...karte, bereiche: [...bereiche, { id: neueId('B'), titel: '', kompetenzen: [] }] });
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <input value={karte.untertitel || ''} onChange={(e) => onChange({ ...karte, untertitel: e.target.value })} placeholder="Kompetenzkarte Fach Jahrgang"
          className="w-full bg-transparent text-sm outline-none" />
        <input value={karte.titel || ''} onChange={(e) => onChange({ ...karte, titel: e.target.value })} placeholder="Thema der Einheit"
          className="w-full bg-transparent font-display text-2xl font-bold outline-none" />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        Gewichtung:
        {GEWICHTE.map((g) => <span key={g.key} className={`rounded-full border px-2 py-0.5 font-semibold ${g.chip}`}>{g.label}</span>)}
        <span>· Kompetenzen stehen von zentral nach ergänzend sortiert.</span>
      </div>
      {bereiche.map((b) => (
        <KompetenzBereich key={b.id} bereich={b} verweise={verweise} onChange={setzeB} onDelete={() => entferneB(b.id)} />
      ))}
      <Button variant="outline" onClick={neuerB}><Plus /> Bereich hinzufügen</Button>
    </div>
  );
}