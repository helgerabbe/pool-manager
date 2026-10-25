import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Hand, CheckCircle2, Users, X, Loader2 } from 'lucide-react';
import { useLiveRaum, useLiveMeldungen } from '@/hooks/useLiveRaum';
import LiveTafelSchritt from '@/components/praesentation/LiveTafelSchritt';
import LiveBeitrittCode from '@/components/praesentation/LiveBeitrittCode';

/** Tafel der Lehrkraft im Präsentationsmodus: zeigt den Schritt und steuert alle Tablets. */
export default function PraesentationTafel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const raum = useLiveRaum(id);
  const meldungen = useLiveMeldungen(id);
  if (raum === undefined) return <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!raum) return <p className="p-6 text-sm">Dieser Raum existiert nicht mehr.</p>;

  const nr = raum.aktueller_schritt;
  const gesamt = raum.schritte.length;
  const gehe = (n) => base44.entities.LiveRaum.update(raum.id, { aktueller_schritt: n });
  const beenden = async () => { await base44.entities.LiveRaum.update(raum.id, { aktiv: false }); navigate('/praesentation'); };
  const namen = new Set(meldungen.filter((m) => m.art === 'beitritt').map((m) => m.created_by_id || m.schueler_name));
  const fertig = new Set(meldungen.filter((m) => m.art === 'fertig' && m.schritt === nr).map((m) => m.created_by_id)).size;
  const meldend = meldungen.filter((m) => m.art === 'melden' && m.schritt === nr);

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="flex-1 min-h-0">
        {nr < 0 ? <LiveBeitrittCode raum={raum} anzahl={namen.size} /> : <LiveTafelSchritt schritt={raum.schritte[nr]} nr={nr + 1} gesamt={gesamt} />}
      </div>
      <div className="border-t bg-muted/40 px-4 py-2 flex items-center gap-3 text-sm">
        <span className="font-mono font-bold text-primary">Code {raum.code}</span>
        <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-4 h-4" /> {namen.size}</span>
        {nr >= 0 && <span className="flex items-center gap-1 text-muted-foreground"><CheckCircle2 className="w-4 h-4" /> {fertig} fertig</span>}
        {meldend.length > 0 && <span className="flex items-center gap-1 text-accent font-medium"><Hand className="w-4 h-4" /> {meldend.map((m) => m.schueler_name).join(', ')}</span>}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={nr < 0} onClick={() => gehe(nr - 1)}><ChevronLeft className="w-4 h-4" /> Zurück</Button>
          <span className="text-xs text-muted-foreground">{nr < 0 ? 'Beitritt' : `${nr + 1} / ${gesamt}`}</span>
          <Button size="sm" disabled={nr >= gesamt - 1} onClick={() => gehe(nr + 1)}>{nr < 0 ? 'Stunde beginnen' : 'Weiter'} <ChevronRight className="w-4 h-4" /></Button>
          <Button size="sm" variant="ghost" onClick={beenden}><X className="w-4 h-4" /> Beenden</Button>
        </div>
      </div>
    </div>
  );
}