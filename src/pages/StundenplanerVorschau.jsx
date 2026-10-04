import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { erstelleGrobentwurf } from '@/lib/stundenGrobentwurf';
import { zielMinuten } from '@/lib/stundenKontext';
import { erstelleFeinplanung, planePhaseNeu } from '@/lib/stundenFeinplanung';
import { toast } from 'sonner';
import { legeStundeAn } from '@/lib/stundeAnlegen';

/** Klickbare Vorschau des Stundenplaners – echter Verlauf, Beispielinhalte, keine KI. */
export default function StundenplanerVorschau() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  const [entwurf, setEntwurf] = React.useState(null);
  const [entwirftGerade, setEntwirftGerade] = React.useState(false);
  const entwerfen = async (wunsch, internet) => {
    setSchritt(3); setEntwirftGerade(true);
    const bisher = wunsch || internet ? entwurf : null;
    if (!bisher) setEntwurf(null);
    try {
      setEntwurf(await erstelleGrobentwurf({ ctx: { planung, abschnitt, rahmen, vorherige }, pruefung, wahl, bisher, wunsch, internet }));
    } catch (e) {
      toast.error('Der Grobentwurf konnte nicht erstellt werden. Bitte versuche es erneut.');
      if (!bisher) setSchritt(2);
    } finally {
      setEntwirftGerade(false);
    }
  };
  const [plan, setPlan] = React.useState(null);
  const [plantGerade, setPlantGerade] = React.useState(false);
  const [neuPlanIndex, setNeuPlanIndex] = React.useState(null);
  const ctx = () => ({ planung, abschnitt, rahmen, vorherige });
  const feinPlanen = async (internet = false) => {
    setSchritt(4); setPlantGerade(true);
    if (!internet) setPlan(null);
    try {
      const neu = await erstelleFeinplanung({ ctx: ctx(), entwurf, internet });
      setPlan(internet && plan ? { phasen: plan.phasen, materialien: [...plan.materialien, ...neu.materialien.filter((m) => m.herkunft === 'internet')] } : neu);
    } catch (e) {
      toast.error('Die Feinplanung konnte nicht erstellt werden. Bitte versuche es erneut.');
      if (!internet) setSchritt(3);
    } finally {
      setPlantGerade(false);
    }
  };
  const phaseNeu = async (index, wunsch) => {
    setNeuPlanIndex(index);
    try {
      const neu = await planePhaseNeu({ ctx: ctx(), plan, index, wunsch });
      setPlan((p) => ({ ...p, phasen: p.phasen.map((x, j) => (j === index ? neu : x)) }));
    } catch (e) {
      toast.error('Die Phase konnte nicht neu geplant werden.');
    } finally {
      setNeuPlanIndex(null);
    }
  };
  const [legtAn, setLegtAn] = React.useState(false);
  const anlegen = async () => {
    setLegtAn(true);
    try {
      const stundeId = await legeStundeAn({ unterrichtseinheitId: id, abschnitt, plan });
      toast.success('Die Stunde wurde angelegt.');
      navigate(`/unterrichtsstunde/${stundeId}/editor`);
    } catch (e) {
      toast.error('Die Stunde konnte nicht angelegt werden.');
      setLegtAn(false);
    }
  };
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
        <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(`/unterrichtseinheit/${id}/struktur`))} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Zurück</button>
        <div>
          <h1 className="font-display text-2xl font-bold">Neue Stunde aus dem Verlauf</h1>
          <p className="text-xs text-accent">Am Ende legst du die Stunde an und gestaltest sie im Editor weiter.</p>
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
          {schritt === 2 && <PlausibilitaetsPruefung pruefung={pruefung} laedt={prueftGerade} wahl={wahl} setWahl={setWahl} onErneut={pruefen} onWeiter={() => entwerfen()} />}
          {schritt === 3 && <Grobentwurf entwurf={entwurf} laedt={entwirftGerade} ziel={abschnitt ? zielMinuten(rahmen, abschnitt) : 40} onAendern={entwerfen} onWeiter={() => feinPlanen()} />}
          {schritt === 4 && <Feinplanung plan={plan} laedt={plantGerade} neuPlanIndex={neuPlanIndex} setPlan={setPlan} onNeuPlanen={phaseNeu} onInternet={() => feinPlanen(true)} onAnlegen={anlegen} legtAn={legtAn} />}
        </section>
      </div>
    </div>
  );
}