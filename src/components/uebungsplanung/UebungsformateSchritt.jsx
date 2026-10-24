import React from 'react';
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Send, Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';
import MaterialUpload from '@/components/unterrichtsplanung/MaterialUpload';
import AufgabenKarten from './AufgabenKarten';
import DifferenzierungKarten from './DifferenzierungKarten';
import AufklappBox from './AufklappBox';

const WUNSCH = {
  kern: 'Eigene Rückmeldung zur Kernaufgabe oder eigene Aufgabe eingeben',
  diff: 'Rückmeldung zur Differenzierung geben',
  vorstufen: 'Bestimmte Art von Teilaufgabe wünschen',
};
const ZURUECK = { kern: null, diff: 'kern', vorstufen: 'diff' };

/** Kernaufgaben: 1) Kernaufgabe (mittleres Niveau, optional zweite) → 2) Differenzierung in drei Niveaus → 3) Pool möglicher Teilaufgaben. */
export default function UebungsformateSchritt({ wert, setWert, onGespraech, laedt, onZurueck, onWeiter }) {
  const u = { kern: [], vorstufen: [], beispiele: [], gespraech: [], stufe: 'kern', ...(wert || {}) };
  const [text, setText] = React.useState('');
  const [denkt, setDenkt] = React.useState(false);

  const fragen = (basis, stufe, nachricht) => {
    setDenkt(true);
    onGespraech({ u: basis, stufe, nachricht }).then((r) => {
      const neu = { ...basis, stufe, gespraech: [...basis.gespraech, ...(nachricht ? [{ role: 'user', content: nachricht }] : []), { role: 'assistant', content: r.antwort }] };
      if (stufe === 'kern') neu.kern = (r.aufgaben || []).slice(0, 2);
      if (stufe === 'diff') neu.kern = basis.kern.map((k, i) => ({ ...k, niveaus: r.niveaus?.[i] || k.niveaus }));
      if (stufe === 'vorstufen') neu.vorstufen = [...basis.vorstufen, ...(r.aufgaben || [])].slice(0, 20);
      setWert(neu);
    }).finally(() => setDenkt(false));
  };

  React.useEffect(() => { if (!u.gespraech.length) fragen(u, 'kern'); }, []);

  const senden = () => { if (!text.trim() && !u.beispiele.length) return; fragen({ ...u, beschreibung: [u.beschreibung, text.trim()].filter(Boolean).join('\n') }, u.stufe, text.trim() || 'Ich habe Beispielaufgaben angehängt.'); setText(''); };
  const entfernen = (f) => (i) => setWert({ ...u, [f]: u[f].filter((_, j) => j !== i) });
  const letzte = [...u.gespraech].reverse().find((m) => m.role === 'assistant');

  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">Wir schlüsseln die Stunde an den Aufgaben auf: erst die Kernaufgabe (was sollen die Schüler am Schluss können?), dann ihre Differenzierung, dann mögliche Teilaufgaben, die dorthin führen.</p>
      </div>

      <AufklappBox titel={WUNSCH[u.stufe]}>
        <FreitextMitSprache rows={3} value={text} onChange={setText} placeholder="z. B. „Ja, aber es muss mehr in Richtung … gehen“ oder deine eigene Aufgabe …" />
        <p className="text-xs text-muted-foreground">Beispielaufgaben als PDF oder Bild hochladen oder mit Strg+V einfügen:</p>
        <MaterialUpload materialien={u.beispiele} onChange={(b) => setWert({ ...u, beispiele: b })} />
        <Button size="sm" disabled={denkt || (!text.trim() && !u.beispiele.length)} onClick={senden}><Send /> Senden</Button>
      </AufklappBox>

      {letzte && (
        <AufklappBox titel="Hinweise des Assistenten">
          {u.gespraech.map((m, i) => (
            <div key={i} className={`rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'ml-10 bg-muted' : 'mr-10 border bg-card'}`}>{m.content}</div>
          ))}
        </AufklappBox>
      )}
      {denkt && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Der Assistent denkt nach …</p>}

      <AufgabenKarten titel="Kernaufgaben" aufgaben={u.kern} onEntfernen={u.stufe === 'kern' && u.kern.length > 1 ? entfernen('kern') : undefined} />
      {u.stufe === 'kern' && u.kern.length === 1 && (
        <Button size="sm" variant="outline" disabled={denkt} onClick={() => fragen(u, 'kern', 'Schlage mir zusätzlich eine zweite Kernaufgabe vor; die erste bleibt unverändert.')}><Plus /> Zweite Kernaufgabe hinzufügen</Button>
      )}
      {u.stufe !== 'kern' && <DifferenzierungKarten kern={u.kern} />}
      {u.stufe === 'vorstufen' && (
        <>
          <AufgabenKarten titel={`Mögliche Teilaufgaben (${u.vorstufen.length}/20) – bewerte sie mit Sternen`} aufgaben={u.vorstufen.map((x) => (u.kern.length > 1 && x.kern ? { ...x, titel: `[K${x.kern}] ${x.titel}` } : x))} onEntfernen={entfernen('vorstufen')}
            onBewerten={(i, s) => setWert({ ...u, vorstufen: u.vorstufen.map((x, j) => (j === i ? { ...x, bewertung: s } : x)) })} />
          <Button size="sm" variant="outline" disabled={denkt || u.vorstufen.length >= 20} onClick={() => fragen(u, 'vorstufen', 'Gib mir noch mehr Vorschläge für Teilaufgaben.')}><Sparkles /> Mehr Vorschläge</Button>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={ZURUECK[u.stufe] ? () => setWert({ ...u, stufe: ZURUECK[u.stufe] }) : onZurueck}><ArrowLeft /> Zurück</Button>
        {u.stufe === 'kern' && <Button disabled={denkt || !u.kern.length} onClick={() => fragen(u, 'diff')}><Check /> So machen wir es, weiter zur Differenzierung</Button>}
        {u.stufe === 'diff' && <Button disabled={denkt || !u.kern.some((k) => k.niveaus)} onClick={() => fragen(u, 'vorstufen')}><Check /> Passt, weiter zu den Teilaufgaben</Button>}
        {u.stufe === 'vorstufen' && <Button disabled={denkt || laedt} onClick={() => onWeiter({ ...u, status: 'gewaehlt' })}><ArrowRight /> Weiter zum Planungsgespräch</Button>}
      </div>
    </div>
  );
}