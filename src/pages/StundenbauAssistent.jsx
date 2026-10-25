import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, ArrowLeft } from 'lucide-react';
import { fragenZurPhase, bauePhase, folieAusWunsch } from '@/lib/kiStundenbau';
import PhasenLeisteBau from '@/components/stundenbau/PhasenLeisteBau';
import PhasenFragen from '@/components/stundenbau/PhasenFragen';
import PhasenEditor from '@/components/stundenbau/PhasenEditor';

/** Stundenbau-Assistent: baut den Foliensatz der Stunde Phase für Phase. */
export default function StundenbauAssistent() {
  const { id } = useParams();
  const [stunde, setStunde] = React.useState(null);
  const [aktiv, setAktiv] = React.useState(0);
  const [laedt, setLaedt] = React.useState(false);

  React.useEffect(() => { base44.entities.Unterrichtsstunde.get(id).then(setStunde); }, [id]);
  if (!stunde) return <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const phasen = stunde.planer_stand?.entwurf?.phasen || [];
  const staende = stunde.stundenbau?.phasen || {};
  const stand = staende[aktiv];
  const phase = phasen[aktiv];
  const kopf = { einheit: stunde.arbeitstitel, thema: stunde.planer_stand?.v?.anker?.thema };

  const setzeStand = async (patch) => {
    const neu = { ...stunde.stundenbau, phasen: { ...staende, [aktiv]: { ...stand, ...patch } } };
    setStunde((s) => ({ ...s, stundenbau: neu }));
    await base44.entities.Unterrichtsstunde.update(stunde.id, { stundenbau: neu });
  };
  const mitLaden = async (fn) => { setLaedt(true); try { await fn(); } catch { toast.error('Der Assistent hat nicht geantwortet. Bitte noch einmal versuchen.'); } finally { setLaedt(false); } };

  const planen = () => mitLaden(async () => { const r = await fragenZurPhase(stunde, phase); await setzeStand({ einleitung: r.einleitung, fragen: r.fragen || [], antworten: '', annahmen: [], folien: [], fertig: false }); });
  const bauen = (antworten) => mitLaden(async () => { const r = await bauePhase(stunde, phase, stand.fragen, antworten); await setzeStand({ antworten, ...r }); });
  const einfuegen = async (pos, art, wunsch) => {
    const f = await folieAusWunsch(stunde, phase, art, wunsch, stand.folien);
    const folien = [...stand.folien]; folien.splice(pos, 0, f);
    await setzeStand({ folien });
  };
  const fertig = async () => { await setzeStand({ fertig: true }); if (aktiv < phasen.length - 1) setAktiv(aktiv + 1); };

  return (
    <div className="h-full flex">
      <aside className="w-64 shrink-0 border-r p-3 overflow-y-auto space-y-3">
        <Link to="/unterricht" className="text-xs text-muted-foreground flex items-center gap-1 hover:underline"><ArrowLeft className="w-3 h-3" /> Mein Unterricht</Link>
        <p className="text-sm font-semibold">{stunde.arbeitstitel}</p>
        <PhasenLeisteBau phasen={phasen} staende={staende} aktiv={aktiv} onWahl={setAktiv} />
      </aside>
      <main className="flex-1 min-w-0 overflow-y-auto p-6 space-y-4">
        {!phase ? <p className="text-sm text-muted-foreground">Diese Stunde hat noch keinen Ablauf. Plane sie zuerst im Stundenplaner.</p> : (
          <>
            <div>
              <p className="text-xs uppercase tracking-wider text-accent font-semibold">Phase {aktiv + 1} von {phasen.length}{phase.methode ? ` · ${phase.methode}` : ''}</p>
              <h1 className="text-2xl font-display font-bold">{phase.name}</h1>
              <p className="text-sm text-muted-foreground">{phase.aktivitaet}</p>
            </div>
            {!stand?.fragen ? (
              <Button onClick={planen} disabled={laedt}>{laedt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Diese Phase planen</Button>
            ) : !stand.folien?.length && !stand.antworten ? (
              <PhasenFragen key={aktiv} stand={stand} onBauen={bauen} baut={laedt} />
            ) : (
              <PhasenEditor key={aktiv} stand={stand} kopf={kopf} onFolien={(folien) => setzeStand({ folien })} onEinfuegen={einfuegen}
                onFertig={fertig} onNeu={planen} letztePhase={aktiv === phasen.length - 1} />
            )}
          </>
        )}
      </main>
    </div>
  );
}