import React from 'react';
import { Repeat, Coffee, Loader2 } from 'lucide-react';
import TippBlase from './TippBlase';
import TippLegende from './TippLegende';
import useEntwurfsTipps from '@/hooks/useEntwurfsTipps';
import { Button } from '@/components/ui/button';
import RitualBaustein from './RitualBaustein';
import PhasenKarte from './PhasenKarte';
import PhasenAlternativen from './PhasenAlternativen';
import KiAenderungsFeld from './KiAenderungsFeld';
import MethodeWaehlen from './MethodeWaehlen';

/** Schritt 5: Grobentwurf mit parallelen Fassungen (Standard bleibt immer erhalten). */
export default function ProtoEntwurf({ entwuerfe, setEntwuerfe, aktiv, setAktiv, routine, setRoutine, pause, modellName, modellKey, varianteKey, pruefung, onKiAendern, onTippsLaden, onWeiter }) {
  const [methodeLaedt, setMethodeLaedt] = React.useState(false);
  const e = entwuerfe[aktiv];
  const kiAendern = async (wunsch) => {
    const neu = await onKiAendern(e, wunsch);
    setEntwuerfe((all) => all.map((x, k) => (k !== aktiv ? x : { ...x, kurz: neu.kurz, hinweis: neu.hinweis, phasen: neu.phasen })));
  };
  const { tipps, laedt: tippsLaedt, verwerfen } = useEntwurfsTipps(e, onTippsLaden);
  const tippAnnehmen = (t) => kiAendern(t.aenderung || t.text);
  // Methode in EINE Phase einsetzen – direkt im Entwurf, an dem gearbeitet wird.
  const methodeEinsetzen = (i, m) => {
    const phasen = e.phasen.map((p, k) => (k !== i ? p : { ...p, aktivitaet: `${m.name}: ${m.kurzbeschreibung || ''}`, methode: m.name, methode_dauer_min: m.dauer_min, neu: true }));
    setEntwuerfe((all) => all.map((x, k) => (k !== aktiv ? x : { ...x, phasen })));
  };
  // Bestimmte Methode auf jeden Fall einbauen: die KI sucht die passende Stelle.
  const methodeEinbauen = async (m) => {
    setMethodeLaedt(true);
    await kiAendern(`Baue die Methode „${m.name}“ auf jeden Fall an einer passenden Stelle ein (${m.kurzbeschreibung || ''}). Passe die übrigen Phasen und Zeiten stimmig an.`);
    setMethodeLaedt(false);
  };
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
        Das ist <span className="font-semibold text-foreground">dein Entwurf</span>, an dem du jetzt weiterarbeitest. Der Assistent macht dir rechts ein paar Vorschläge –
        nimm an, was dir gefällt. Feinheiten wie digital oder analog klärst du später in der Feinplanung.
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Aufbau nach: {modellName}</p>
        <p className="text-sm font-semibold">{e.kurz}</p>
        {e.hinweis && <p className="text-xs text-accent">{e.hinweis}</p>}
        {e.impuls && <p className="text-xs text-muted-foreground">Dein Impuls: „{e.impuls}“</p>}
      </div>
      <div className="space-y-2">
        <RitualBaustein routine={routine} setRoutine={setRoutine} />
        {tipps.length > 0 && <TippLegende />}
        {tippsLaedt && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Der Assistent schaut sich deinen Entwurf an …</p>}
        {tipps.filter((t) => t.phase === -1).map((t, k) => (
          <div key={`g${k}`} className="lg:ml-auto lg:w-1/3"><TippBlase tipp={t} onAnnehmen={tippAnnehmen} onVerwerfen={verwerfen} /></div>
        ))}
        {e.phasen.map((ph, i) => (
          <React.Fragment key={`${aktiv}-${i}`}>
            {pause && i === Math.floor(e.phasen.length / 2) && <div className="flex items-center gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground"><Coffee className="h-4 w-4" /> 5 Min. Pause</div>}
            <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
              <PhasenKarte phase={ph}>
                <PhasenAlternativen phase={ph} modellKey={modellKey} varianteKey={varianteKey} onEinsetzen={(m) => methodeEinsetzen(i, m)} />
              </PhasenKarte>
              <div className="space-y-2">
                {tipps.filter((t) => t.phase === i).map((t, k) => <TippBlase key={k} tipp={t} zeigtAufPhase onAnnehmen={tippAnnehmen} onVerwerfen={verwerfen} />)}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
      {(e.entfaellt || []).map((x) => (
        <div key={x.phase} className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
          <span className="font-medium line-through">{x.phase}</span> entfällt hier: {x.grund}
        </div>
      ))}
      <div className="space-y-2">
        <KiAenderungsFeld key={aktiv} onAendern={kiAendern} />
        <div className="flex flex-wrap items-center gap-2">
          <MethodeWaehlen onWahl={methodeEinbauen} />
          {methodeLaedt && <span className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ich baue die Methode ein …</span>}
        </div>
      </div>
      {pruefung}
      <Button onClick={onWeiter}>Sieht gut aus – Entwurf übernehmen</Button>
    </div>
  );
}