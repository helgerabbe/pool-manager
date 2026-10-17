import React from 'react';
import { Clock, Pencil, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GrobPhaseKarte from '@/components/grobplanung/GrobPhaseKarte';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

const zeitKategorie = (m = 0) => (m <= 5 ? 'kurz (bis 5 Min.)' : m <= 10 ? '5–10 Min.' : m <= 15 ? '10–15 Min.' : m <= 20 ? '15–20 Min.' : 'lang (über 20 Min.)');

/** Eine Phase der methodischen Gestaltung. Unter „Mehr dazu“: Hintergrund, Abschnitt ändern, Frage an den Assistenten. */
export default function MethodikPhase({ phase, nr, onAendern, onFrage }) {
  const [text, setText] = React.useState('');
  const [laedt, setLaedt] = React.useState(false);
  const los = () => { setLaedt(true); onAendern(text).then(() => setText('')).finally(() => setLaedt(false)); };
  return (
    <div className="space-y-1">
      <GrobPhaseKarte phase={phase} nr={nr}>
        <div className="space-y-2 rounded-lg bg-muted/40 p-3">
          <p className="flex items-center gap-1 font-semibold text-foreground"><Pencil className="h-3.5 w-3.5" /> Möchtest du hier etwas ändern oder präzisieren?</p>
          <FreitextMitSprache rows={2} value={text} onChange={setText} placeholder="z. B. Das soll gelenkter sein. Oder: Setz mir hier den Hinweis, dass ich vorher die Gruppen einteile." />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={laedt || !text.trim()} onClick={los}>{laedt && <Loader2 className="animate-spin" />} Nur diesen Abschnitt überarbeiten</Button>
            <Button size="sm" variant="outline" onClick={onFrage}><MessageCircle /> Ich habe eine Frage dazu</Button>
          </div>
        </div>
      </GrobPhaseKarte>
      <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"><Clock className="h-3 w-3" /> {zeitKategorie(phase.minuten)}</span>
    </div>
  );
}