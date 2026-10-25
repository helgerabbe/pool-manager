import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Hand, CheckCircle2, Ear } from 'lucide-react';
import { useLiveRaum } from '@/hooks/useLiveRaum';
import { melden } from '@/lib/liveRaum';
import LiveCodeEingabe from '@/components/praesentation/LiveCodeEingabe';
import NotizHeft from '@/components/aktivitaetengalerie/foliensatz/vorlagen/NotizHeft';

/** Schülergerät im Präsentationsmodus: Code eingeben, dann folgt das Tablet der Tafel. */
export default function LiveMitmachen() {
  const { user } = useAuth();
  const [raumId, setRaumId] = React.useState(sessionStorage.getItem('live_raum') || '');
  const raum = useLiveRaum(raumId);
  const [gesendet, setGesendet] = React.useState({});

  const beitreten = (r) => { sessionStorage.setItem('live_raum', r.id); setRaumId(r.id); melden(r, 'beitritt', user?.full_name); };
  const verlassen = () => { sessionStorage.removeItem('live_raum'); setRaumId(''); };

  if (!raumId || raum === null || raum?.aktiv === false) {
    return <div className="h-full overflow-y-auto">{raum?.aktiv === false && <p className="text-center text-sm text-muted-foreground mt-6">Die Stunde ist beendet.</p>}<LiveCodeEingabe onGefunden={beitreten} /></div>;
  }
  if (!raum) return null;

  const nr = raum.aktueller_schritt;
  const schritt = raum.schritte[nr];
  const senden = async (art) => { await melden(raum, art, user?.full_name); setGesendet((g) => ({ ...g, [`${art}${nr}`]: true })); };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="px-4 py-2 border-b flex items-center text-xs text-muted-foreground">
        <span className="font-medium text-foreground truncate">{raum.titel}</span>
        <button type="button" onClick={verlassen} className="ml-auto hover:underline">Verlassen</button>
      </div>
      <div className="relative flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
        {nr >= 0 && <NotizHeft gross />}
        {nr < 0 ? <p className="text-lg">Du bist dabei. Gleich geht es los …</p> : (
          <>
            <p className="text-xs uppercase tracking-wider text-accent font-semibold">{schritt.titel}</p>
            {schritt.tablet.startsWith('Lehrkraft erklärt') ? <Ear className="w-12 h-12 text-primary" /> : null}
            <p className="text-xl max-w-md">{schritt.tablet}</p>
          </>
        )}
      </div>
      {nr >= 0 && (
        <div className="p-4 border-t flex gap-3 justify-center">
          <Button variant="outline" disabled={gesendet[`melden${nr}`]} onClick={() => senden('melden')}><Hand className="w-4 h-4" /> Melden</Button>
          <Button disabled={gesendet[`fertig${nr}`]} onClick={() => senden('fertig')}><CheckCircle2 className="w-4 h-4" /> Fertig</Button>
        </div>
      )}
    </div>
  );
}