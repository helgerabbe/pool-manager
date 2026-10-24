import React from 'react';
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Send, Check, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import MaterialUpload from '@/components/unterrichtsplanung/MaterialUpload';
import AufgabenKarten from './AufgabenKarten';

/** Aufgabenportfolio: Assistent schlägt zuerst Kernaufgaben vor, danach hinführende Teilaufgaben. Überspringbar. */
export default function UebungsformateSchritt({ wert, setWert, onGespraech, laedt, onZurueck, onWeiter }) {
  const u = { kern: [], vorstufen: [], beispiele: [], gespraech: [], stufe: 'kern', ...(wert || {}) };
  const [text, setText] = React.useState('');
  const [denkt, setDenkt] = React.useState(false);
  const feld = u.stufe === 'kern' ? 'kern' : 'vorstufen';

  const fragen = (basis, stufe, nachricht) => {
    setDenkt(true);
    onGespraech({ u: basis, stufe, nachricht }).then((r) => setWert({
      ...basis, stufe, [stufe]: r.aufgaben || [],
      gespraech: [...basis.gespraech, ...(nachricht ? [{ role: 'user', content: nachricht }] : []), { role: 'assistant', content: r.antwort }],
    })).finally(() => setDenkt(false));
  };

  React.useEffect(() => { if (!u.gespraech.length) fragen(u, 'kern'); }, []);

  const senden = () => { if (!text.trim() && !u.beispiele.length) return; fragen({ ...u, beschreibung: [u.beschreibung, text.trim()].filter(Boolean).join('\n') }, u.stufe, text.trim() || 'Ich habe Beispielaufgaben angehängt.'); setText(''); };
  const entfernen = (f) => (i) => setWert({ ...u, [f]: u[f].filter((_, j) => j !== i) });

  return (
    <div className="space-y-5">
      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">Bevor wir über den Stundenverlauf sprechen, legen wir das Aufgabenportfolio fest: zuerst die Kernaufgabe, an der die Schüler am Ende zeigen, was sie gelernt haben, danach kleinere Übungen, die dorthin führen.</p>
      </div>

      <div className="space-y-2">
        {u.gespraech.map((m, i) => (
          <div key={i} className={`rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'ml-10 bg-muted' : 'mr-10 border bg-card'}`}>{m.content}</div>
        ))}
        {denkt && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Der Assistent denkt nach …</p>}
      </div>

      <AufgabenKarten titel="Kernaufgaben" aufgaben={u.kern} onEntfernen={u.stufe === 'kern' ? entfernen('kern') : undefined} />
      {u.stufe === 'vorstufen' && <AufgabenKarten titel="Hinführende Teilaufgaben" aufgaben={u.vorstufen} onEntfernen={entfernen('vorstufen')} />}

      <div className="space-y-2 rounded-xl border bg-card p-3">
        <p className="text-sm font-semibold">{u.stufe === 'kern' ? 'Wenn du willst: Beschreibe eine typische Aufgabe, die die Schüler am Ende dieser Stunde lösen können sollen.' : 'Deine Rückmeldung zu den Teilaufgaben'}</p>
        <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. „Ja, passt“, „Lieber ohne Sachkontext“ oder deine eigene Aufgabe …" />
        <p className="text-xs text-muted-foreground">Beispielaufgaben als PDF oder Bild hochladen oder mit Strg+V einfügen:</p>
        <MaterialUpload materialien={u.beispiele} onChange={(b) => setWert({ ...u, beispiele: b })} />
        <Button size="sm" disabled={denkt || (!text.trim() && !u.beispiele.length)} onClick={senden}><Send /> Antworten</Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={u.stufe === 'kern' ? onZurueck : () => setWert({ ...u, stufe: 'kern' })}><ArrowLeft /> {u.stufe === 'kern' ? 'Zurück zu den Informationen' : 'Zurück zu den Kernaufgaben'}</Button>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={laedt} onClick={() => onWeiter({ ...u, status: 'uebersprungen' })}><SkipForward /> Überspringen</Button>
          <Button variant="outline" disabled={laedt} onClick={() => onWeiter({ ...u, status: 'offen' })}>Noch offen lassen</Button>
          {u.stufe === 'kern'
            ? <Button disabled={denkt || !u.kern.length} onClick={() => fragen(u, 'vorstufen')}><Check /> Kernaufgaben passen, weiter zu Teilaufgaben</Button>
            : <Button disabled={denkt || laedt} onClick={() => onWeiter({ ...u, status: 'gewaehlt' })}><ArrowRight /> Weiter zum Planungsgespräch</Button>}
        </div>
      </div>
    </div>
  );
}