import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import SchrittLeiste from '@/components/stundenplaner/SchrittLeiste';
import AbschnittWahl from '@/components/stundenplaner/AbschnittWahl';
import RahmenKlaeren from '@/components/stundenplaner/RahmenKlaeren';
import PlausibilitaetsPruefung from '@/components/stundenplaner/PlausibilitaetsPruefung';
import Grobentwurf from '@/components/stundenplaner/Grobentwurf';
import Feinplanung from '@/components/stundenplaner/Feinplanung';
import { pruefeRahmen } from '@/lib/stundenPruefung';
import { toast } from 'sonner';

/** Klickbare Vorschau des Stundenplaners – echter Verlauf, Beispielinhalte, keine KI. */
export default function StundenplanerVorschau() {
  const { id } = useParams();
  const [schritt, setSchritt] = React.useState(0);
  const [abschnitt, setAbschnitt] = React.useState(null);
  const [rahmen, setRahmen] = React.useState({ zeit: 'Einzelstunde (40 Min.)' });
  const [pruefung, setPruefung] = React.useState(null);
  const [prueftGerade, setPrueftGerade] = React.useState(false);
  const [wahl, setWahl] = React.useState({});
  const { data: planung, isLoading } = useQuery({
    queryKey: ['unterrichtsPlanungStatus', id],
    queryFn: async () => (await base44.entities.UnterrichtsPlanung.filter({ unterrichtseinheit_id: id }))[0] || null,
  });

  const vorherige = (planung?.verlauf || []).slice(0, abschnitt?.index ?? 0).filter((s) => s.gewichtung !== 'raus');
  const pruefen = async () => {
    setSchritt(2); setPruefung(null); setWahl({}); setPrueftGerade(true);
    try {
      setPruefung(await pruefeRahmen({ planung, abschnitt, rahmen, vorherige }));
    } catch (e) {
      toast.error('Die Prüfung ist fehlgeschlagen. Bitte versuche es erneut.');
      setSchritt(1);
    } finally {
      setPrueftGerade(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-5 p-6">
        <Link to="/unterricht" className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Zurück</Link>
        <div>
          <h1 className="font-display text-2xl font-bold">Neue Stunde aus dem Verlauf</h1>
          <p className="text-xs text-accent">Rahmen und Prüfung sind echt – Grobentwurf und Feinplanung zeigen noch Beispiele.</p>
        </div>
        <SchrittLeiste aktiv={schritt} onWahl={setSchritt} />
        <section className="rounded-xl border bg-card/50 p-5">
          {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          {!isLoading && schritt === 0 && (
            planung?.verlauf?.length
              ? <AbschnittWahl verlauf={planung.verlauf} onWahl={(s, i) => { setAbschnitt({ ...s, index: i }); setSchritt(1); }} />
              : <p className="text-sm text-muted-foreground">Diese Unterrichtseinheit hat noch keinen Verlauf.</p>
          )}
          {schritt === 1 && abschnitt && <RahmenKlaeren abschnitt={abschnitt} vorherige={vorherige} rahmen={rahmen} setRahmen={setRahmen} onWeiter={pruefen} />}
          {schritt === 2 && <PlausibilitaetsPruefung pruefung={pruefung} laedt={prueftGerade} wahl={wahl} setWahl={setWahl} onErneut={pruefen} onWeiter={() => setSchritt(3)} />}
          {schritt === 3 && <Grobentwurf onWeiter={() => setSchritt(4)} />}
          {schritt === 4 && <Feinplanung />}
        </section>
      </div>
    </div>
  );
}