import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, ArrowLeft } from 'lucide-react';
import { methodenSatz, vorschlaegeZurPhase, fuelleVorlage, vorschlagAnpassen, bauePhase, folieAusWunsch } from '@/lib/kiStundenbau';
import PhasenLeisteBau from '@/components/stundenbau/PhasenLeisteBau';
import PhasenFragen from '@/components/stundenbau/PhasenFragen';
import PhasenEditor from '@/components/stundenbau/PhasenEditor';

/** Stundenbau-Assistent: baut den Foliensatz der Stunde Phase für Phase. */
export default function StundenbauAssistent() {
  const { id } = useParams();
  const [stunde, setStunde] = React.useState(null);
  const [aktiv, setAktiv] = React.useState(0);
  const [laedt, setLaedt] = React.useState(false);

  const [einheitTitel, setEinheitTitel] = React.useState('');
  React.useEffect(() => { base44.entities.Unterrichtsstunde.get(id).then(setStunde); }, [id]);
  React.useEffect(() => {
    if (stunde?.unterrichtseinheit_id) base44.entities.Unterrichtseinheit.get(stunde.unterrichtseinheit_id).then((e) => setEinheitTitel(e?.titel || ''));
  }, [stunde?.unterrichtseinheit_id]);
  if (!stunde) return <div className="h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;

  const phasen = stunde.planer_stand?.entwurf?.phasen || [];
  const staende = stunde.stundenbau?.phasen || {};
  const stand = staende[aktiv];
  const phase = phasen[aktiv];
  // Kopfzeile der Folien: nur Fach und Thema der Unterrichtseinheit.
  const kopf = { einheit: stunde.fach, thema: einheitTitel };

  const setzeStand = async (patch) => {
    const neu = { ...stunde.stundenbau, phasen: { ...staende, [aktiv]: { ...stand, ...patch } } };
    setStunde((s) => ({ ...s, stundenbau: neu }));
    await base44.entities.Unterrichtsstunde.update(stunde.id, { stundenbau: neu });
  };
  const mitLaden = async (fn) => { setLaedt(true); try { await fn(); } catch { toast.error('Der Assistent hat nicht geantwortet. Bitte noch einmal versuchen.'); } finally { setLaedt(false); } };

  // 1. Planen: Vorlage der Methode sofort zeigen (ohne KI). Ohne Vorlage gleich zu den Vorschlägen.
  const planen = () => mitLaden(async () => {
    const satz = await methodenSatz(phase.methode, stunde.fach);
    const folien = (satz || []).map((f, i) => ({ ...f, id: `v${Date.now()}${i}`, phase: phase.name }));
    const basis = { vorlage: true, vorlage_folien: folien, folien, fragen: null, einleitung: '', annahmen: [], fertig: false };
    if (folien.length) return setzeStand(basis);
    const r = await vorschlaegeZurPhase(stunde, phase, []);
    await setzeStand({ ...basis, einleitung: r.einleitung, fragen: r.fragen || [] });
  });
  // 2. Füllen lassen: Vorschläge zu allen Entscheidungen holen.
  const vorschlaege = () => mitLaden(async () => { const r = await vorschlaegeZurPhase(stunde, phase, stand.vorlage_folien); await setzeStand({ einleitung: r.einleitung, fragen: r.fragen || [] }); });
  // 3. Mit den bestätigten bzw. geänderten Entscheidungen füllen.
  const bauen = (entscheidungen) => mitLaden(async () => {
    const r = stand.vorlage_folien?.length
      ? { folien: await fuelleVorlage(stunde, phase, stand.vorlage_folien, entscheidungen), annahmen: [] }
      : await bauePhase(stunde, phase, [], entscheidungen);
    await setzeStand({ antworten: entscheidungen, vorlage: false, fragen: null, ...r });
  });
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
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border bg-card px-3 py-1">Methode: <b>{phase.methode || 'keine feste Methode'}</b>{phase.sozialform ? ` · ${phase.sozialform}` : ''}</span>
                {phase.minuten > 0 && <span className="rounded-full border bg-card px-3 py-1" title="Nur ein Richtwert zur Orientierung">Richtwert: ca. {phase.minuten} Min.</span>}
              </div>
            </div>
            {!stand?.folien?.length && !(stand?.vorlage && stand?.fragen?.length) ? (
              <Button onClick={planen} disabled={laedt}>{laedt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Diese Phase planen</Button>
            ) : (
              <>
                {stand.vorlage && !stand.fragen?.length && stand.folien?.length > 0 && (
                  <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                    <span>Das ist die <b>Vorlage</b> der Methode. Soll ich sie mit den Inhalten dieser Stunde füllen?</span>
                    <Button size="sm" className="ml-auto" onClick={vorschlaege} disabled={laedt}>{laedt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Mit Inhalten füllen</Button>
                  </div>
                )}
                {stand.folien?.length > 0 && (
                  <PhasenEditor key={aktiv} stand={stand} kopf={kopf} onFolien={(folien) => setzeStand({ folien })} onEinfuegen={einfuegen}
                    onFertig={fertig} onNeu={planen} letztePhase={aktiv === phasen.length - 1} />
                )}
                {stand.vorlage && stand.fragen?.length > 0 && (
                  <PhasenFragen key={`f${aktiv}`} stand={stand} onBauen={bauen} baut={laedt} onFragen={(fragen) => setzeStand({ fragen })}
                    onAnpassen={(f, w) => vorschlagAnpassen(stunde, f.frage, f.vorschlag, w)} />
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}