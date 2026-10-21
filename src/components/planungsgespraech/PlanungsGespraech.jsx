import React from 'react';
import { Loader2, Send, ListChecks, Rocket, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';
import GespraechAntworten from './GespraechAntworten';

/** Planungsgespräch als Ping-Pong: Assistent fragt, Lehrkraft antwortet per Klick oder freiem Text. Jederzeit abbrechbar. */
export default function PlanungsGespraech({ verlauf, setVerlauf, onSchritt, onListe, anstoss, onLaedt }) {
  const [laedt, setLaedt] = React.useState(false);
  const [fehler, setFehler] = React.useState('');
  const [text, setText] = React.useState('');
  const ende = React.useRef(null);

  const fragen = (vl) => {
    setLaedt(true); setFehler('');
    onSchritt(vl).then((r) => setVerlauf([...vl, { role: 'assistant', content: r.nachricht, art: r.art, optionen: r.optionen || [] }]))
      .catch(() => setFehler('Das hat nicht geklappt. Bitte noch einmal schicken.')).finally(() => setLaedt(false));
  };
  const senden = (t) => { const neu = [...verlauf, { role: 'user', content: t }]; setVerlauf(neu); setText(''); fragen(neu); };
  React.useEffect(() => { if (!verlauf.length) fragen([]); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { if (anstoss && !laedt) senden(anstoss.text); }, [anstoss]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { onLaedt?.(laedt); }, [laedt]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { ende.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [verlauf.length, laedt]);
  const letzte = verlauf[verlauf.length - 1];

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display font-bold">Planungsgespräch</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onListe}><ListChecks /> Worauf würdest du achten?</Button>
          <Button size="sm" onClick={onListe}><Rocket /> Leg los</Button>
        </div>
      </div>
      <div className="max-h-[28rem] space-y-2 overflow-y-auto">
        {verlauf.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && <Bot className="mt-1 h-4 w-4 shrink-0 text-primary" />}
            <p className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-primary/5'}`}>{m.content}</p>
          </div>
        ))}
        {laedt && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {verlauf.length > 1 ? 'Ich denke kurz nach …' : verlauf.length ? 'Ich recherchiere kurz zum Thema und überlege …' : 'Ich analysiere, was du mir gegeben hast …'}</p>}
        <div ref={ende} />
      </div>
      {!laedt && letzte?.role === 'assistant' && <GespraechAntworten nachricht={letzte} onSenden={senden} onListe={onListe} />}
      {fehler && <p className="text-xs text-destructive">{fehler} <button className="underline" onClick={() => fragen(verlauf)}>Erneut</button></p>}
      <div className="flex items-end gap-2">
        <div className="flex-1"><FreitextMitSprache rows={2} value={text} onChange={setText} placeholder="Oder sag es in deinen Worten …" /></div>
        <Button variant="outline" disabled={!text.trim() || laedt} onClick={() => senden(text.trim())}><Send /></Button>
      </div>
    </div>
  );
}