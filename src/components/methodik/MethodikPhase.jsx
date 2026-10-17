import React from 'react';
import { Clock, Pencil, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GrobPhaseKarte from '@/components/grobplanung/GrobPhaseKarte';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

const zeitKategorie = (m = 0) => (m <= 5 ? 'kurz (bis 5 Min.)' : m <= 10 ? '5–10 Min.' : m <= 15 ? '10–15 Min.' : m <= 20 ? '15–20 Min.' : 'lang (über 20 Min.)');

/** Eine Phase der methodischen Gestaltung: grobe Zeitkategorie und gezielte Änderung nur dieses Abschnitts. */
export default function MethodikPhase({ phase, nr, onAendern }) {
  const [offen, setOffen] = React.useState(false);
  const [text, setText] = React.useState('');
  const [laedt, setLaedt] = React.useState(false);
  const los = () => { setLaedt(true); onAendern(text).then(() => { setOffen(false); setText(''); }).finally(() => setLaedt(false)); };
  return (
    <div className="space-y-2">
      <GrobPhaseKarte phase={phase} nr={nr} />
      <div className="flex flex-wrap items-center gap-2 pl-1">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" /> {zeitKategorie(phase.minuten)}</span>
        {!offen && <Button size="sm" variant="ghost" onClick={() => setOffen(true)}><Pencil /> Diesen Abschnitt ändern</Button>}
      </div>
      {offen && (
        <div className="space-y-2 rounded-lg bg-muted/40 p-3">
          <FreitextMitSprache rows={2} value={text} onChange={setText} placeholder="z. B. Hier sollen sich die Schüler vorher mehr austauschen." />
          <div className="flex gap-2">
            <Button size="sm" disabled={laedt || !text.trim()} onClick={los}>{laedt && <Loader2 className="animate-spin" />} Nur diesen Abschnitt überarbeiten</Button>
            <Button size="sm" variant="ghost" onClick={() => setOffen(false)}>Abbrechen</Button>
          </div>
        </div>
      )}
    </div>
  );
}