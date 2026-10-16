import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ProtoStart from '@/components/stundenplanerPrototyp/ProtoStart';
import ProtoInhaltsanalyse from '@/components/stundenplanerPrototyp/ProtoInhaltsanalyse';
import ProtoStundenziel from '@/components/stundenplanerPrototyp/ProtoStundenziel';
import ProtoLerngruppe from '@/components/stundenplanerPrototyp/ProtoLerngruppe';
import ProtoEntwurf from '@/components/stundenplanerPrototyp/ProtoEntwurf';
import GrobentwurfPruefung from '@/components/stundenplanerPrototyp/GrobentwurfPruefung';
import ProtoAbschluss from '@/components/stundenplanerPrototyp/ProtoAbschluss';
import ProtoStundentyp from '@/components/stundenplanerPrototyp/ProtoStundentyp';
import { FASSUNGEN, ZIELE, STUNDENTYP, alsEntwurf } from '@/lib/stundenplanerPrototypDaten';
import { STUNDEN_MODELLE } from '@/lib/stundenModelle';
import { entwurfsWarnungen } from '@/lib/stundenEntwurfsRegeln';
import { kiGrobentwurf } from '@/lib/kiGrobentwurf';
import useStundenplanerKontext from '@/hooks/useStundenplanerKontext';
import { kiInhaltsanalyse, kiStundenziel, kiStundentyp } from '@/lib/kiStundenVorbereitung';

const SCHRITTE = ['Stunde', 'Inhalt', 'Lerngruppe', 'Stundentyp', 'Ziel', 'Entwurf', 'Fertig'];

// Standardentwurf: Beispiel liegt für „induktiv“ vor, sonst Platzhalter aus den Modellphasen.
const standardFuer = (key, minuten) => {
  if (key === 'induktiv') return alsEntwurf(FASSUNGEN.standard, { vorlage: 'standard' });
  const m = STUNDEN_MODELLE.find((x) => x.key === key);
  const je = Math.max(2, Math.round(minuten / m.phasen.length));
  return alsEntwurf({ ...FASSUNGEN.standard, phasen: m.phasen.map((n) => ({ name: n, minuten: je, aktivitaet: `Beispielaktivität für „${n}“ zur Küchenszene.`, sozialform: 'Plenum' })) }, { vorlage: 'standard' });
};

/** PROTOTYP (2026-10-15): geführter Stundenplaner, klickbar mit Beispieldaten, ohne KI und Speicherung. */
export default function StundenplanerVorschau() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: kontext, isLoading } = useStundenplanerKontext(id);
  const [schritt, setSchritt] = React.useState(0);
  const [erreicht, setErreicht] = React.useState(0);
  const [wahl, setWahl] = React.useState(null);
  const [minuten, setMinuten] = React.useState(40);
  const [pause, setPause] = React.useState(false);
  const [modell, setModell] = React.useState(STUNDENTYP.vorschlag);
  const [typ, setTyp] = React.useState(null);
  const [induktivVariante, setInduktivVariante] = React.useState('gelenkt');
  const [deduktivVariante, setDeduktivVariante] = React.useState('darbietend');
  const [vertieftVariante, setVertieftVariante] = React.useState('problemloesend');
  const [wiederholungVariante, setWiederholungVariante] = React.useState('kurz');
  const [ziel, setZiel] = React.useState({ haupt: '', teil: [], alternativen: [], vonKi: true });
  const [analyse, setAnalyse] = React.useState(null);
  const [gruppe, setGruppe] = React.useState({ fit: 3, stark: 3 });
  const [entwuerfe, setEntwuerfe] = React.useState(null);
  const [aktiv, setAktiv] = React.useState(0);
  const [routine, setRoutine] = React.useState('');
  const [assistent, setAssistent] = React.useState(() => localStorage.getItem('stundenplaner_assistent') || 'base44');
  const assistentWaehlen = (a) => { setAssistent(a); localStorage.setItem('stundenplaner_assistent', a); };

  const aktModell = STUNDEN_MODELLE.find((m) => m.key === modell);
  const annahmen = [
    gruppe.fit === 3 && gruppe.stark === 3 && 'Standard-Lerngruppe („Mach einfach“) – mittleres Arbeitstempo, normale Selbstständigkeit.',
    ziel.vonKi && 'Stundenziel vom Assistenten formuliert und übernommen.',
    modell === typ?.vorschlag && `Vorgeschlagener Stundentyp „${aktModell.name}“ übernommen.`,
    !routine.trim() && 'Keine feste Routine eingeplant.',
  ].filter(Boolean);

  const geheZu = (s) => { setSchritt(s); setErreicht((e) => Math.max(e, s)); };
  const netto = minuten - (pause && minuten > 45 ? 5 : 0);
  const einheit = kontext?.einheit;
  const basis = () => ({ modell: aktModell, minuten: netto, ziel, gruppe, jahrgang: einheit.jahrgangsstufe, fach: einheit.fach, assistent,
    stunde: { einheit: einheit.titel, ...(wahl === 'frei' ? {} : wahl) }, analyse, induktivVariante, deduktivVariante, vertieftVariante, wiederholungVariante });
  const analyseErstellen = (korrektur) => kiInhaltsanalyse({ ...basis(), bisher: analyse, korrektur }).then((a) => {
    setAnalyse(a); setTyp(null); setZiel({ haupt: '', teil: [], alternativen: [], vonKi: true });
  });
  const typErstellen = () => kiStundentyp({ ...basis(), modelle: STUNDEN_MODELLE }).then((t) => { setTyp(t); setModell(t.vorschlag); setInduktivVariante(t.variante); setDeduktivVariante(t.deduktiv_variante); setVertieftVariante(t.vertieft_variante); setWiederholungVariante(t.wiederholung_variante); });
  const zielErstellen = (korrektur) => kiStundenziel({ ...basis(), bisher: ziel.haupt, korrektur }).then((z) => {
    setZiel((alt) => ({ haupt: z.haupt, teil: [], vonKi: true, alternativen: alt.haupt ? [alt.haupt, ...z.alternativen] : z.alternativen }));
  });
  const kiAendern = (bisher, aenderung) => kiGrobentwurf({ ...basis(), bisher, aenderung });
  const entwerfen = () => {
    geheZu(5); setEntwuerfe(null); setAktiv(0);
    kiGrobentwurf(basis())
      .then((e) => setEntwuerfe([e]))
      .catch(() => setEntwuerfe([{ ...standardFuer(modell, minuten), hinweis: 'Der KI-Entwurf ist fehlgeschlagen – hier das Beispiel.' }]));
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <button onClick={() => navigate(`/unterrichtseinheit/${id}/struktur`)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Zurück</button>
        <div>
          <h1 className="font-display text-2xl font-bold">Neue Stunde planen</h1>
          {kontext && <p className="text-sm text-muted-foreground">{kontext.einheit.titel} · {kontext.einheit.fach} · Jg. {kontext.einheit.jahrgangsstufe}</p>}
          <p className="text-xs text-accent">Prototyp mit Beispielinhalten – nichts wird gespeichert.</p>
          <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            Mit welchem Assistenten möchtest du arbeiten?
            <select value={assistent} onChange={(ev) => assistentWaehlen(ev.target.value)} className="rounded-md border bg-card px-2 py-1 text-foreground">
              <option value="base44">Plattform-KI (Base44)</option>
              <option value="anthropic">Anthropic (Claude, eigener Schlüssel)</option>
            </select>
          </label>
        </div>
        <div className="flex gap-1">
          {SCHRITTE.map((s, i) => (
            <button key={s} disabled={i > erreicht || (i >= 5 && !entwuerfe)} onClick={() => setSchritt(i)} className="flex-1 text-left disabled:cursor-default">
              <div className={`h-1 rounded-full ${i <= schritt ? 'bg-primary' : 'bg-muted'}`} />
              <p className={`mt-1 text-[11px] ${i === schritt ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{s}</p>
            </button>
          ))}
        </div>
        <section className="rounded-2xl border bg-card/50 p-6">
          {schritt === 0 && isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Lade die Unterrichtseinheit …</p>}
          {schritt === 0 && kontext && <ProtoStart verlauf={kontext.verlauf} wahl={wahl} setWahl={setWahl} minuten={minuten} setMinuten={setMinuten} pause={pause} setPause={setPause} onWeiter={() => geheZu(1)} />}
          {schritt === 1 && <ProtoInhaltsanalyse analyse={analyse} onErstellen={analyseErstellen} onWeiter={() => geheZu(2)} />}
          {schritt === 2 && <ProtoLerngruppe gruppe={gruppe} setGruppe={(g) => { setGruppe(g); setTyp(null); }} onWeiter={() => geheZu(3)} />}
          {schritt === 3 && <ProtoStundentyp gruppe={gruppe} typ={typ} variante={induktivVariante} setVariante={setInduktivVariante} dVariante={deduktivVariante} setDVariante={setDeduktivVariante} vVariante={vertieftVariante} setVVariante={setVertieftVariante} wVariante={wiederholungVariante} setWVariante={setWiederholungVariante} onErstellen={typErstellen} modell={modell} setModell={setModell} onWeiter={() => geheZu(4)} />}
          {schritt === 4 && <ProtoStundenziel ziel={ziel} setZiel={setZiel} onErstellen={zielErstellen} onWeiter={entwerfen} />}
          {schritt === 5 && !entwuerfe && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ich erstelle einen gut machbaren Standardentwurf …</p>}
          {schritt === 5 && entwuerfe && <ProtoEntwurf entwuerfe={entwuerfe} setEntwuerfe={setEntwuerfe} aktiv={aktiv} setAktiv={setAktiv} routine={routine} setRoutine={setRoutine} pause={pause && minuten > 45} modellName={aktModell.name} modellKey={modell}
            pruefung={<GrobentwurfPruefung entwurf={entwuerfe[aktiv]} modellPhasen={aktModell.phasen} minuten={minuten - (pause && minuten > 45 ? 5 : 0)} ziel={ziel.haupt} annahmen={annahmen}
              warnungen={entwurfsWarnungen({ entwurf: entwuerfe[aktiv], modellKey: modell, gruppe, jahrgang: einheit?.jahrgangsstufe })} />}
            onKiAendern={kiAendern} onWeiter={() => geheZu(6)} />}
          {schritt === 6 && <ProtoAbschluss name={entwuerfe[aktiv].name} onZurueck={() => navigate(`/unterrichtseinheit/${id}/struktur`)} />}
        </section>
      </div>
    </div>
  );
}