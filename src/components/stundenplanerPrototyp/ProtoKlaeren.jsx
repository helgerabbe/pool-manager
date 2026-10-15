import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FRAGEN } from '@/lib/stundenplanerPrototypDaten';

/** Schritt 2: optionaler Klärungsdialog – Vorschlag wählen, frei antworten oder überspringen. */
export default function ProtoKlaeren({ onFertig }) {
  const [i, setI] = React.useState(0);
  const [frei, setFrei] = React.useState('');
  const [antworten, setAntworten] = React.useState([]);
  const antworte = (a) => {
    const neu = [...antworten, { frage: FRAGEN[i].frage, antwort: a }];
    setAntworten(neu); setFrei('');
    if (i + 1 < FRAGEN.length) setI(i + 1); else onFertig();
  };
  const f = FRAGEN[i];
  return (
    <div className="space-y-4">
      {antworten.map((a, k) => (
        <div key={k} className="text-xs text-muted-foreground"><span className="font-medium">{a.frage}</span> → {a.antwort}</div>
      ))}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex gap-2"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-sm font-semibold">{f.frage}</p></div>
        <p className="mt-1 pl-6 text-xs text-muted-foreground">Warum ich frage: {f.warum}</p>
        <div className="mt-3 flex flex-wrap gap-2 pl-6">
          {f.vorschlaege.map((v) => <Button key={v} size="sm" variant="outline" onClick={() => antworte(v)}>{v}</Button>)}
        </div>
        <div className="mt-3 flex gap-2 pl-6">
          <Input value={frei} onChange={(e) => setFrei(e.target.value)} placeholder="Oder eigene Antwort …" />
          <Button size="sm" disabled={!frei.trim()} onClick={() => antworte(frei)}>OK</Button>
        </div>
        <div className="mt-3 flex gap-2 pl-6">
          <Button size="sm" variant="ghost" onClick={() => antworte('Weiß ich nicht')}>Weiß ich nicht</Button>
          <Button size="sm" variant="ghost" onClick={onFertig}>Keine Fragen mehr – mach einfach einen Vorschlag</Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Frage {i + 1} von {FRAGEN.length}</p>
    </div>
  );
}