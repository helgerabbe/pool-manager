import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FundamentStart from '@/components/grobplanung/FundamentStart';
import VorgabenRaster from '@/components/grobplanung/VorgabenRaster';
import VorgabenListe from '@/components/grobplanung/VorgabenListe';
import MethodischeGestaltung from '@/components/methodik/MethodischeGestaltung';
import GrobentwurfPruefung from '@/components/stundenplanerPrototyp/GrobentwurfPruefung';
import ProtoAbschluss from '@/components/stundenplanerPrototyp/ProtoAbschluss';
import { STUNDEN_MODELLE } from '@/lib/stundenModelle';
import { entwurfsWarnungen } from '@/lib/stundenEntwurfsRegeln';
import useStundenplanerKontext from '@/hooks/useStundenplanerKontext';
import { ankerVorhanden, kiAnkerPruefen, kiGrobZiel, kiGrobThema, kiGrobverlauf, kiPlanungsVorgaben, kiPhaseAendern, kiSparring } from '@/lib/kiGrobplanung';

const SCHRITTE = ['Fundament', 'Grobplanung', 'Methodische Gestaltung', 'Feinplanung', 'Aufbereitung'];
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

  const einheit = kontext?.einheit;
  const netto = minuten === null ? null : minuten - (pause && minuten > 45 ? 5 : 0);
  const summe = (entwurf?.phasen || []).reduce((s, p) => s + (p.minuten || 0), 0);
  const k = () => ({ assistent, einheit, anker: v.anker, minuten: netto });
  const generieren = (bisher, aenderung) => kiGrobverlauf({ ...k(), vorgaben: v, bisher, aenderung });
  const [punkte, setPunkte] = React.useState([]);
  const lauf = (p, ok) => { setLaedt(true); setFehler(''); p.then(ok).catch(() => setFehler('Das hat nicht geklappt. Bitte noch einmal versuchen.')).finally(() => setLaedt(false)); };
  const vorgabenErstellen = () => lauf(kiPlanungsVorgaben({ ...k(), vorgaben: v }), setPunkte);
  const bauen = () => lauf(kiGrobverlauf({ ...k(), vorgaben: { ...v, punkte } }), (e) => { setEntwurf(e); setPhase('methodik'); });
  const phaseAendern = (index, wunsch) => kiPhaseAendern({ ...k(), entwurf, index, wunsch }).then(setEntwurf);
  const modell = STUNDEN_MODELLE.find((m) => m.key === entwurf?.modell) || STUNDEN_MODELLE[0];
  const annahmen = [
    v.gruppe.fit === 3 && v.gruppe.stark === 3 && v.gruppe.leistung === 3 && 'Normale Lerngruppe angenommen.',
    !v.ziel.haupt && 'Stundenziel vom Assistenten abgeleitet.',
    !v.ritual && 'Kein festes Ritual eingeplant.',
  ].filter(Boolean);
  const stufe = { start: 0, grob: 1, methodik: 2, fertig: 3 }[phase];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <button onClick={() => navigate(`/unterrichtseinheit/${id}/struktur`)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Zurück</button>
        <div>
          <h1 className="font-display text-2xl font-bold">Neue Stunde planen</h1>
          {einheit && <p className="text-sm text-muted-foreground">{einheit.titel} · {einheit.fach} · Jg. {einheit.jahrgangsstufe}</p>}
          <p className="text-xs text-accent">Prototyp – nichts wird gespeichert.</p>
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
            <div key={s} className="flex-1">
              <div className={`h-1 rounded-full ${i <= stufe ? 'bg-primary' : 'bg-muted'}`} />
              <p className={`mt-1 text-[11px] ${i === stufe ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{i + 1}. {s}</p>
            </div>
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
              <VorgabenRaster v={v} setze={setze} verlauf={kontext.verlauf} assistent={assistent} onZielVorschlag={(ziel, korrektur) => kiGrobZiel({ ...k(), stundentyp: ziel.stundentyp, bisher: ziel.haupt, korrektur })}
                onThemaVorschlag={(bisher, korrektur) => kiGrobThema({ ...k(), bisher, korrektur })} />
              <Button variant={punkte.length ? 'outline' : 'default'} disabled={!ankerVorhanden(v.anker) || laedt} onClick={vorgabenErstellen}>
                {laedt && !punkte.length ? <Loader2 className="animate-spin" /> : <Sparkles />} {punkte.length ? 'Vorgaben neu zusammenstellen' : 'Worauf achten wir in der Stunde?'}
              </Button>
              {fehler && <p className="text-xs text-destructive">{fehler}</p>}
              {punkte.length > 0 && <VorgabenListe punkte={punkte} setPunkte={setPunkte} laedt={laedt} onBauen={bauen} />}
            </>
          )}
          {phase === 'methodik' && entwurf && (
            <MethodischeGestaltung entwurf={entwurf} setEntwurf={setEntwurf} onPhaseAendern={phaseAendern}
              onSparring={(verlauf, fokus) => kiSparring({ ...k(), entwurf, verlauf, fokus })} onZurueck={() => setPhase('grob')} onWeiter={() => setPhase('fertig')}
                pruefung={<GrobentwurfPruefung entwurf={entwurf} modellPhasen={modell.phasen} minuten={netto ?? summe} ziel={v.ziel.haupt} annahmen={annahmen}
                  onVorschlag={(hinweis) => generieren(entwurf, `Die Passungsprüfung meldet: "${hinweis}". Baue die Stunde so um, dass dieses Problem behoben ist, und erkläre in "hinweise" in einfachen Worten, was der Hinweis bedeutet, was du geändert hast und warum.`)}
                  onUebernehmen={setEntwurf}
                  warnungen={entwurfsWarnungen({ entwurf, modellKey: modell.key, gruppe: v.gruppe, jahrgang: einheit?.jahrgangsstufe })} />} />
          )}
          {phase === 'fertig' && <ProtoAbschluss name={entwurf?.name} onZurueck={() => navigate(`/unterrichtseinheit/${id}/struktur`)} />}
        </section>
      </div>
    </div>
  );
}