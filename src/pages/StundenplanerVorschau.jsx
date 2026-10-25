import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles, Save, RotateCcw } from 'lucide-react';
import usePlanerSpeichern from '@/hooks/usePlanerSpeichern';
import { Button } from '@/components/ui/button';
import FundamentStart from '@/components/grobplanung/FundamentStart';
import VorgabenRaster from '@/components/grobplanung/VorgabenRaster';
import MethodischeGestaltung from '@/components/methodik/MethodischeGestaltung';
import GrobentwurfPruefung from '@/components/stundenplanerPrototyp/GrobentwurfPruefung';
import UmsetzungsWahlSchritt from '@/components/feinplanung/UmsetzungsWahlSchritt';
import { kiUmsetzungVorschlag } from '@/lib/kiUmsetzung';
import AufbereitungSchritt from '@/components/feinplanung/AufbereitungSchritt';
import { kiAufbereitung } from '@/lib/kiAufbereitung';
import PlanungsGespraech from '@/components/planungsgespraech/PlanungsGespraech';
import { kiGespraechSchritt, kiGespraechHintergrund } from '@/lib/kiPlanungsGespraech';
import KernschrittListe from '@/components/planungsgespraech/KernschrittListe';
import VorgabenPopup from '@/components/planungsgespraech/VorgabenPopup';
import UebungsformateSchritt from '@/components/uebungsplanung/UebungsformateSchritt';
import { kiUebungsGespraech } from '@/lib/kiUebungsformate';
import ProtoAbschluss from '@/components/stundenplanerPrototyp/ProtoAbschluss';
import { STUNDEN_MODELLE } from '@/lib/stundenModelle';
import { entwurfsWarnungen } from '@/lib/stundenEntwurfsRegeln';
import useStundenplanerKontext from '@/hooks/useStundenplanerKontext';
import { ankerVorhanden, kiAnkerPruefen, kiGrobZiel, kiGrobThema, kiGrobverlauf, kiPlanungsVorgaben, kiPhaseAendern, kiSparring, kiTippCenter } from '@/lib/kiGrobplanung';

const SCHRITTE = ['Fundament & weitere Informationen', 'Kernaufgaben', 'Planungsgespräch', 'Methodische Gestaltung', 'Feinplanung', 'Aufbereitung'];
const START = {
  anker: { abschnitte: [], text: '', vorwissen: '', materialien: [], richtung: '', schulform: 'Integrierte Gesamtschule' },
  ziel: { haupt: '', alternativen: [], vonKi: true, stundentyp: '' },
  gruppe: { fit: 3, stark: 3, leistung: 3 }, methode: null, ritual: null,
};

/** PROTOTYP (2026-10-17): Stundenplanung in vier Schritten, Schritt 1 = Grobplanung mit Vorgaben-Containern. Nichts wird gespeichert. */
export default function StundenplanerVorschau() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: kontext, isLoading } = useStundenplanerKontext(id);
  const [phase, setPhase] = React.useState('start');
  const [minuten, setMinuten] = React.useState(45);
  const [pause, setPause] = React.useState(false);
  const [v, setV] = React.useState(START);
  const [entwurf, setEntwurf] = React.useState(null);
  const [laedt, setLaedt] = React.useState(false);
  const [fehler, setFehler] = React.useState('');
  const [assistent, setAssistent] = React.useState(() => localStorage.getItem('stundenplaner_assistent') || 'base44');
  const setze = (key) => (w) => setV((alt) => ({ ...alt, [key]: typeof w === 'function' ? w(alt[key]) : w }));

  const profil = kontext?.einheit?.profil || kontext?.lerngruppe?.profil;
  React.useEffect(() => { if (profil) setV((alt) => ({ ...alt, gruppe: { ...alt.gruppe, ...profil } })); }, [profil]);
  const einheit = kontext?.einheit;
  const netto = minuten === null ? null : minuten - (pause && minuten > 45 ? 5 : 0);
  const summe = (entwurf?.phasen || []).reduce((s, p) => s + (p.minuten || 0), 0);
  const k = () => ({ assistent, einheit, anker: v.anker, minuten: netto });
  const generieren = (bisher, aenderung) => kiGrobverlauf({ ...k(), vorgaben: v, bisher, aenderung });
  const [punkte, setPunkte] = React.useState([]);
  const lauf = (p, ok) => { setLaedt(true); setFehler(''); p.then(ok).catch(() => setFehler('Das hat nicht geklappt. Bitte noch einmal versuchen.')).finally(() => setLaedt(false)); };
  const [popup, setPopup] = React.useState(false);
  const [anstoss, setAnstoss] = React.useState(null);
  const [gLaedt, setGLaedt] = React.useState(false);
  const gespraechSchritt = async (verlauf) => {
    let hintergrund = v.hintergrund;
    if (!hintergrund) { hintergrund = await kiGespraechHintergrund(k()); setze('hintergrund')(hintergrund); }
    const r = await kiGespraechSchritt({ ...k(), vorgaben: { ...v, hintergrund }, verlauf });
    if (r.kernschritte?.length) {
      const alt = v.kernschritte || [];
      setze('kernschritte')(r.kernschritte.map((s) => {
        const vorher = alt.find((a) => a.name === s.name && a.satz === s.satz);
        return { name: s.name, satz: s.satz, neu: alt.length > 0 && !vorher, ok: !!vorher?.ok };
      }));
    }
    return r;
  };
  const listeZeigen = () => { setPunkte([]); setPopup(true); lauf(kiPlanungsVorgaben({ ...k(), vorgaben: v }), setPunkte); };
  const bauen = () => lauf(kiGrobverlauf({ ...k(), vorgaben: { ...v, punkte } }), (e) => { setEntwurf(e); setPhase('methodik'); });
  const uebungWeiter = (u) => { setze('uebungen')(u); if (!Array.isArray(v.gespraech)) setze('gespraech')([]); setPhase('gespraech'); };
  const phaseAendern = (index, wunsch) => kiPhaseAendern({ ...k(), entwurf, index, wunsch }).then(setEntwurf);
  const modell = STUNDEN_MODELLE.find((m) => m.key === entwurf?.modell) || STUNDEN_MODELLE[0];
  const annahmen = [
    v.gruppe.fit === 3 && v.gruppe.stark === 3 && v.gruppe.leistung === 3 && 'Normale Lerngruppe angenommen.',
    !v.ziel.haupt && 'Stundenziel vom Assistenten abgeleitet.',
    !v.ritual && 'Kein festes Ritual eingeplant.',
  ].filter(Boolean);
  const { stundeId, status, laden, speichern } = usePlanerSpeichern(einheit);
  const stand = () => ({ phase, minuten, pause, v, punkte, entwurf });
  const titel = entwurf?.name || v.anker.thema || v.anker.abschnitte?.[0]?.titel;
  React.useEffect(() => {
    laden().then((s) => { if (!s) return; setPhase(s.phase || 'grob'); setMinuten(s.minuten ?? 45); setPause(!!s.pause); setV(s.v || START); setPunkte(s.punkte || []); setEntwurf(s.entwurf || null); });
  }, [laden]);
  React.useEffect(() => { if (einheit && phase !== 'start') speichern(stand(), titel); }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const neuStarten = () => {
    if (!window.confirm('Die bisherige Planung dieser Stunde wird verworfen und du startest wieder beim Fundament. Wirklich von vorne anfangen?')) return;
    const leer = { phase: 'start', minuten: 45, pause: false, v: { ...START, gruppe: { ...START.gruppe, ...(profil || {}) } }, punkte: [], entwurf: null };
    setPhase(leer.phase); setMinuten(leer.minuten); setPause(false); setV(leer.v); setPunkte([]); setEntwurf(null); setFehler('');
    if (stundeId) speichern(leer, 'Neue Stunde');
  };
  const stufe = { start: 0, gespraech: 2, grob: 0, uebung: 1, methodik: 3, fein: 4, aufbereitung: 5, fertig: 5 }[phase];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <button onClick={() => navigate(`/unterrichtseinheit/${id}/struktur`)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Zurück</button>
        <div>
          <h1 className="font-display text-2xl font-bold">Neue Stunde planen</h1>
          {einheit && <p className="text-sm text-muted-foreground">{einheit.titel} · {einheit.fach} · Jg. {einheit.jahrgangsstufe}</p>}
          {phase !== 'start' && (
            <div className="mt-1 flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={status === 'speichert'} onClick={() => speichern(stand(), titel)}>
                {status === 'speichert' ? <Loader2 className="animate-spin" /> : <Save />} Speichern
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={neuStarten}><RotateCcw /> Von vorne anfangen</Button>
              <span className="text-xs text-muted-foreground">{status === 'gespeichert' ? 'Gespeichert. Wird bei jedem Schrittwechsel automatisch gesichert.' : status === 'speichert' ? 'Speichert …' : ''}</span>
            </div>
          )}
          <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            Assistent:
            <select value={assistent} onChange={(e) => { setAssistent(e.target.value); localStorage.setItem('stundenplaner_assistent', e.target.value); }} className="rounded-md border bg-card px-2 py-1 text-foreground">
              <option value="base44">Plattform-KI (Base44)</option>
              <option value="anthropic">Anthropic (Claude, eigener Schlüssel)</option>
            </select>
          </label>
        </div>
        <div className="flex gap-1">
          {SCHRITTE.map((s, i) => (
            <button key={s} type="button" disabled={i > stufe || (i >= 3 && !entwurf)} title="Zu diesem Schritt springen"
              onClick={() => setPhase(['grob', 'uebung', 'gespraech', 'methodik', 'fein', 'aufbereitung'][i])}
              className="flex-1 text-left enabled:hover:opacity-80 disabled:cursor-default">
              <div className={`h-1 rounded-full ${i <= stufe ? 'bg-primary' : 'bg-muted'}`} />
              <p className={`mt-1 text-[11px] ${i === stufe ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{i + 1}. {s}</p>
            </button>
          ))}
        </div>
        <section className="space-y-6 rounded-2xl border bg-card/50 p-6">
          {isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Lade die Unterrichtseinheit …</p>}
          {kontext && phase === 'start' && (
            <FundamentStart einheit={einheit} verlauf={kontext.verlauf} anker={v.anker} setAnker={setze('anker')} dauer={{ minuten, setMinuten, pause, setPause }}
              onPruefen={() => kiAnkerPruefen(k())} onWeiter={() => setPhase('grob')} />
          )}
          {kontext && phase === 'grob' && (
            <>
              <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <Sparkles className="h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm text-muted-foreground">Das sind deine Vorgaben. Nur das Thema ist Pflicht, alles andere ist optional oder hat einen Standard. Klick auf einen Bereich, um ihn zu bearbeiten.</p>
              </div>
              <VorgabenRaster v={v} setze={setze} verlauf={kontext.verlauf} assistent={assistent} onZielVorschlag={(ziel, korrektur) => kiGrobZiel({ ...k(), stundentyp: ziel.stundentyp, bisher: ziel.haupt, korrektur, vorgaben: v })}
                onThemaVorschlag={(bisher, korrektur) => kiGrobThema({ ...k(), bisher, korrektur })} />
              <div className="flex flex-wrap gap-2">
                <Button disabled={!ankerVorhanden(v.anker)} onClick={() => setPhase('uebung')}><Sparkles /> Weiter zu den Kernaufgaben</Button>
                <Button variant="ghost" disabled={!ankerVorhanden(v.anker)} onClick={listeZeigen}>Ohne Gespräch: Worauf achten wir?</Button>
              </div>
              {fehler && <p className="text-xs text-destructive">{fehler}</p>}
              <VorgabenPopup offen={popup} onSchliessen={() => setPopup(false)} punkte={punkte} setPunkte={setPunkte} laedt={laedt} onBauen={bauen} />
            </>
          )}
          {kontext && phase === 'gespraech' && (
            <>
              <div className="space-y-3">
                <KernschrittListe schritte={v.kernschritte} gesperrt={gLaedt} onOk={(i) => setze('kernschritte')((ks) => ks.map((s, j) => (j === i ? { ...s, ok: !s.ok, neu: false } : s)))} onAnsprechen={(s) => setAnstoss({ text: `Ich möchte über die Phase „${s.name}“ sprechen.` })} />
                <PlanungsGespraech verlauf={v.gespraech || []} setVerlauf={setze('gespraech')} onListe={listeZeigen} onSchritt={gespraechSchritt} anstoss={anstoss} onLaedt={setGLaedt} />
              </div>
              {fehler && <p className="text-xs text-destructive">{fehler}</p>}
              <Button variant="ghost" onClick={() => setPhase('uebung')}><ArrowLeft /> Zurück zu den Kernaufgaben</Button>
              <VorgabenPopup offen={popup} onSchliessen={() => setPopup(false)} punkte={punkte} setPunkte={setPunkte} laedt={laedt} onBauen={bauen} />
            </>
          )}
          {phase === 'uebung' && (
            <>
              <UebungsformateSchritt wert={v.uebungen} setWert={setze('uebungen')} laedt={laedt} onGespraech={(a) => kiUebungsGespraech({ ...k(), vorgaben: v, ...a })}
                onZurueck={() => setPhase('grob')} onWeiter={uebungWeiter} />
              {fehler && <p className="text-xs text-destructive">{fehler}</p>}
            </>
          )}
          {phase === 'methodik' && entwurf && (
            <MethodischeGestaltung entwurf={entwurf} setEntwurf={setEntwurf} onPhaseAendern={phaseAendern}
              onSparring={(verlauf, fokus) => kiSparring({ ...k(), entwurf, verlauf, fokus })}
              onTipps={() => kiTippCenter({ ...k(), entwurf })} onZurueck={() => setPhase('gespraech')} onWeiter={() => setPhase('fein')}
                pruefung={<GrobentwurfPruefung entwurf={entwurf} modellPhasen={modell.phasen} minuten={netto ?? summe} ziel={v.ziel.haupt} annahmen={annahmen}
                  onVorschlag={(hinweis) => generieren(entwurf, `Die Passungsprüfung meldet: "${hinweis}". Baue die Stunde so um, dass dieses Problem behoben ist, und erkläre in "hinweise" in einfachen Worten, was der Hinweis bedeutet, was du geändert hast und warum.`)}
                  onUebernehmen={setEntwurf}
                  warnungen={entwurfsWarnungen({ entwurf, modellKey: modell.key, gruppe: v.gruppe, jahrgang: einheit?.jahrgangsstufe })} />} />
          )}
          {phase === 'fein' && entwurf && (
            <UmsetzungsWahlSchritt entwurf={entwurf} setEntwurf={setEntwurf} onVorschlag={() => kiUmsetzungVorschlag({ assistent, einheit, entwurf })}
              onZurueck={() => setPhase('methodik')} onWeiter={() => setPhase('aufbereitung')} />
          )}
          {phase === 'aufbereitung' && entwurf && (
            <AufbereitungSchritt entwurf={entwurf} setEntwurf={setEntwurf} onErstellen={() => kiAufbereitung({ assistent, einheit, anker: v.anker, entwurf })}
              onZurueck={() => setPhase('fein')} onWeiter={() => setPhase('fertig')} />
          )}
          {phase === 'fertig' && <ProtoAbschluss name={entwurf?.name} onAnsehen={() => setPhase('aufbereitung')} onFeinplanung={() => setPhase('fein')} onZurueck={() => navigate(`/unterrichtseinheit/${id}/struktur`)} />}
        </section>
      </div>
    </div>
  );
}