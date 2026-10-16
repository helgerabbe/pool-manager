import React from 'react';
import { Repeat, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PhasenKarte from './PhasenKarte';
import FassungenLeiste from './FassungenLeiste';
import { FASSUNGEN, IDEEN_POOL, alsEntwurf } from '@/lib/stundenplanerPrototypDaten';

/** Schritt 5: Grobentwurf mit parallelen Fassungen (Standard bleibt immer erhalten). */
export default function ProtoEntwurf({ entwuerfe, setEntwuerfe, aktiv, setAktiv, routine, setRoutine, pause, modellName, pruefung, onWeiter }) {
  const [laedt, setLaedt] = React.useState(false);
  const hinzu = (neu) => {
    setLaedt(true);
    setTimeout(() => { setEntwuerfe((e) => [...e, neu]); setAktiv(entwuerfe.length); setLaedt(false); }, 1200);
  };
  const nochEine = (impuls) => {
    const zahl = entwuerfe.filter((e) => e.vorlage === 'idee').length;
    const v = IDEEN_POOL[zahl % IDEEN_POOL.length];
    hinzu(alsEntwurf(v, { vorlage: 'idee', name: zahl >= IDEEN_POOL.length ? `${v.name} (${zahl + 1})` : v.name, impuls }));
  };
  const e = entwuerfe[aktiv];
  const aendern = (i, text) => setEntwuerfe((all) => all.map((x, k) => (k !== aktiv ? x : { ...x, phasen: x.phasen.map((p, j) => (j === i ? { ...p, aktivitaet: text } : p)) })));
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
        Das ist dein <span className="font-semibold text-foreground">Grobentwurf</span> nach eurem Standardmodell – er soll zu 70–80 % passen.
        Kleinigkeiten ändern, Phasen weglassen oder zusammenfassen, digital oder analog: Das machst du später in Ruhe in der Feinplanung.
      </div>
      <FassungenLeiste entwuerfe={entwuerfe} aktiv={aktiv} setAktiv={setAktiv} laedt={laedt}
        onErzeugen={(k) => hinzu(alsEntwurf(FASSUNGEN[k], { vorlage: k }))} onNochEine={nochEine} />
      <div>
        <p className="text-xs text-muted-foreground">Aufbau nach: {modellName}</p>
        <p className="text-sm font-semibold">{e.kurz}</p>
        {e.hinweis && <p className="text-xs text-accent">{e.hinweis}</p>}
        {e.impuls && <p className="text-xs text-muted-foreground">Dein Impuls: „{e.impuls}“</p>}
      </div>
      <div className="space-y-2">
        {routine.trim() && <div className="flex items-center gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground"><Repeat className="h-4 w-4" /> Feste Routine: {routine}</div>}
        {e.phasen.map((ph, i) => (
          <React.Fragment key={`${aktiv}-${i}`}>
            {pause && i === Math.floor(e.phasen.length / 2) && <div className="flex items-center gap-2 rounded-xl border border-dashed p-3 text-sm text-muted-foreground"><Coffee className="h-4 w-4" /> 5 Min. Pause</div>}
            <PhasenKarte phase={ph} onAendern={(t) => aendern(i, t)} />
          </React.Fragment>
        ))}
      </div>
      {(e.entfaellt || []).map((x) => (
        <div key={x.phase} className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
          <span className="font-medium line-through">{x.phase}</span> entfällt hier: {x.grund}
        </div>
      ))}
      {pruefung}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Gibt es eine feste Routine in deinem Unterricht? (optional)</p>
        <Input value={routine} onChange={(ev) => setRoutine(ev.target.value)} placeholder="z. B. Begrüßung und Wochenplan-Check, 3 Min." />
      </div>
      <Button onClick={onWeiter}>„{e.name}“ als Grobentwurf übernehmen</Button>
    </div>
  );
}