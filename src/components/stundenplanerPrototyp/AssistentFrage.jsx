import React from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/** Eine Frage des Assistenten mit drei Vorschlägen, Freitext und „Weiß ich nicht“. */
export default function AssistentFrage({ frage, onAntwort }) {
  const [frei, setFrei] = React.useState('');
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex gap-2"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-sm font-semibold">{frage.frage}</p></div>
      <p className="mt-1 pl-6 text-xs text-muted-foreground">Warum ich frage: {frage.warum}</p>
      <div className="mt-3 flex flex-wrap gap-2 pl-6">
        {frage.vorschlaege.map((v) => <Button key={v} size="sm" variant="outline" onClick={() => onAntwort(v)}>{v}</Button>)}
        <Button size="sm" variant="ghost" onClick={() => onAntwort('Weiß ich nicht')}>Weiß ich nicht</Button>
      </div>
      <div className="mt-3 flex gap-2 pl-6">
        <Input value={frei} onChange={(e) => setFrei(e.target.value)} placeholder="Oder eigene Antwort …" />
        <Button size="sm" disabled={!frei.trim()} onClick={() => { onAntwort(frei); setFrei(''); }}>OK</Button>
      </div>
    </div>
  );
}