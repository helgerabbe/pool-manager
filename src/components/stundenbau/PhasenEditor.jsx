import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, Trash2, Check, RotateCcw } from 'lucide-react';
import FolieAnzeige from '@/components/aktivitaetengalerie/foliensatz/FolieAnzeige';
import { toast } from 'sonner';
import FolieEinfuegenDialog from './FolieEinfuegenDialog';

/** Editor einer Phase: Lehrer- und Schüleransicht nebeneinander, durchklicken, einfügen, löschen. */
export default function PhasenEditor({ stand, kopf, onFolien, onEinfuegen, onFertig, onNeu, letztePhase }) {
  const [nr, setNr] = React.useState(0);
  const [einfuegen, setEinfuegen] = React.useState(false);
  const folien = stand.folien || [];
  const folie = folien[Math.min(nr, folien.length - 1)];

  const loeschen = () => { onFolien(folien.filter((_, i) => i !== nr)); setNr(Math.max(0, nr - 1)); };
  const neu = async (art, wunsch) => { await onEinfuegen(nr + 1, art, wunsch); setNr(nr + 1); };

  return (
    <div className="space-y-4">
      {stand.annahmen?.length > 0 && (
        <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 text-xs">
          <p className="font-semibold mb-1">Das habe ich selbst entschieden (kannst du ändern):</p>
          <ul className="list-disc pl-4 space-y-0.5">{stand.annahmen.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
      )}
      {folie ? (
        <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-4 items-start">
          <div><p className="text-xs font-semibold text-muted-foreground mb-1">Lehreransicht (Tafel)</p><FolieAnzeige folie={folie} ansicht="lehrer" kopf={kopf} /></div>
          <div><p className="text-xs font-semibold text-muted-foreground mb-1">Schüleransicht (Tablet)</p><FolieAnzeige folie={folie} ansicht="schueler" kopf={kopf} /></div>
        </div>
      ) : <p className="text-sm text-muted-foreground italic">Diese Phase hat keine Folien mehr.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" disabled={nr <= 0} onClick={() => setNr(nr - 1)}><ChevronLeft className="w-4 h-4" /></Button>
        <span className="text-xs text-muted-foreground">Folie {folien.length ? nr + 1 : 0} von {folien.length}{folie ? ` · ${folie.titel || ''}` : ''}</span>
        <Button size="sm" variant="outline" disabled={nr >= folien.length - 1} onClick={() => setNr(nr + 1)}><ChevronRight className="w-4 h-4" /></Button>
        {/* Vorgesehen: Folie nach der aktuellen einfügen, der Assistent fragt dann, was darauf soll (onEinfuegen/FolieEinfuegenDialog). Noch ohne Funktion. */}
        <Button size="sm" variant="outline" onClick={() => toast('Folien einfügen kommt in einem nächsten Schritt.')}><Plus className="w-4 h-4" /> Folie dahinter einfügen</Button>
        <Button size="sm" variant="outline" disabled={!folie} onClick={loeschen}><Trash2 className="w-4 h-4" /> Löschen</Button>
        <Button size="sm" variant="ghost" onClick={onNeu}><RotateCcw className="w-4 h-4" /> Phase neu planen</Button>
        <Button size="sm" className="ml-auto" onClick={onFertig}><Check className="w-4 h-4" /> {letztePhase ? 'Phase fertig' : 'Phase fertig – weiter'}</Button>
      </div>
      <FolieEinfuegenDialog offen={einfuegen} onSchliessen={() => setEinfuegen(false)} onEinfuegen={neu} />
    </div>
  );
}