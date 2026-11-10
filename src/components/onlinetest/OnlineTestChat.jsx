import React from 'react';
import { Bot, Loader2, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

/** Gespräch mit dem Test-Assistenten: Test erstellen und per Wunsch verändern. */
const TEST_TEXTE = {
  titel: 'Test-Assistent',
  intro: 'Ich erstelle den Abschlusstest aus der Kompetenzkarte und dem Pragmatiker-Lernplan dieser Einheit: 8–10 Aufgaben mit je 3–4 Varianten, dazu fachlicher Hintergrund und Erwartungshorizont für die korrigierende KI.',
  start: 'Test erstellen',
  platzhalter: 'Was soll sich am Test ändern?',
  erstellt: 'Ich überarbeite den Test …',
  neu: 'Ich baue den Test, das dauert etwa eine Minute …',
};

export default function OnlineTestChat({ verlauf, laedt, hatTest, onSenden, texte = TEST_TEXTE }) {
  const [text, setText] = React.useState('');
  const ende = React.useRef(null);
  React.useEffect(() => { ende.current?.scrollIntoView({ block: 'nearest' }); }, [verlauf.length, laedt]);
  const senden = () => { const t = text.trim(); if (!t) return; setText(''); onSenden(t); };

  return (
    <div className="flex h-full flex-col">
      <p className="border-b px-4 py-3 font-display font-bold">{texte.titel}</p>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {!verlauf.length && !laedt && (
          <div className="space-y-3 rounded-xl bg-primary/5 p-4 text-sm">
            <p>{texte.intro}</p>
            <Button onClick={() => onSenden('')}><Sparkles /> {texte.start}</Button>
          </div>
        )}
        {verlauf.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'assistant' && <Bot className="mt-1 h-4 w-4 shrink-0 text-primary" />}
            <p className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-primary/5'}`}>{m.content}</p>
          </div>
        ))}
        {typeof laedt === 'string' && <p className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground">{laedt}</p>}
        {laedt && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {hatTest ? texte.erstellt : texte.neu}</p>}
        <div ref={ende} />
      </div>
      {hatTest && (
        <div className="flex items-end gap-2 border-t p-3">
          <div className="flex-1"><FreitextMitSprache rows={3} value={text} onChange={setText} placeholder={texte.platzhalter} /></div>
          <Button variant="outline" disabled={!text.trim() || laedt} onClick={senden}><Send /></Button>
        </div>
      )}
    </div>
  );
}