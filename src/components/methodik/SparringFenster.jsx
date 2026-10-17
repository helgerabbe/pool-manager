import React from 'react';
import { GripHorizontal, X, Loader2, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';
import SparringNachricht from './SparringNachricht';

/** Verschiebbares Gesprächsfenster: Fragen stellen, Alternativen besprechen, Änderungen erst nach Zustimmung übernehmen. */
export default function SparringFenster({ titel, verlauf, setVerlauf, onAnfrage, onUebernehmen, onSchliessen }) {
  const [pos, setPos] = React.useState({ x: window.innerWidth - 440, y: 90 });
  const [text, setText] = React.useState('');
  const [laedt, setLaedt] = React.useState(false);
  const ende = React.useRef(null);
  React.useEffect(() => ende.current?.scrollIntoView({ block: 'end' }), [verlauf, laedt]);

  const ziehen = (e) => {
    const sx = e.clientX - pos.x, sy = e.clientY - pos.y;
    const move = (m) => setPos({ x: Math.max(0, m.clientX - sx), y: Math.max(0, m.clientY - sy) });
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const senden = () => {
    if (!text.trim()) return;
    const neu = [...verlauf, { role: 'user', content: text.trim() }];
    setVerlauf(neu); setText(''); setLaedt(true);
    onAnfrage(neu).then((r) => setVerlauf([...neu, { role: 'assistant', content: r.antwort, vorschlag: r.vorschlag }]))
      .catch(() => setVerlauf([...neu, { role: 'assistant', content: 'Da ist etwas schiefgegangen. Magst du es noch einmal versuchen?' }]))
      .finally(() => setLaedt(false));
  };
  const uebernehmen = (i) => { onUebernehmen(verlauf[i].vorschlag); setVerlauf(verlauf.map((m, j) => (j === i ? { ...m, uebernommen: true } : m))); };

  return (
    <div className="fixed z-50 flex h-[520px] w-[400px] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl" style={{ left: pos.x, top: pos.y }}>
      <div onPointerDown={ziehen} className="flex cursor-move items-center gap-2 bg-primary px-3 py-2 text-primary-foreground">
        <GripHorizontal className="h-4 w-4" /><Sparkles className="h-4 w-4" />
        <p className="flex-1 truncate text-sm font-semibold">{titel}</p>
        <button onClick={onSchliessen}><X className="h-4 w-4" /></button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {verlauf.map((m, i) => <SparringNachricht key={i} m={m} onUebernehmen={() => uebernehmen(i)} />)}
        {laedt && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Ich denke nach …</p>}
        <div ref={ende} />
      </div>
      <div className="space-y-2 border-t p-3">
        <FreitextMitSprache rows={2} value={text} onChange={setText} placeholder="Frage oder Wunsch, z. B. Was könnte ich hier noch machen?" />
        <Button size="sm" className="w-full" disabled={laedt || !text.trim()} onClick={senden}><Send /> Senden</Button>
      </div>
    </div>
  );
}