import React from 'react';
import { MessageSquarePlus, Pin, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

/** Kommentar zu einer Phase: als Hinweis merken oder die Phase neu planen lassen. */
export default function PhasenKommentar({ phase }) {
  const [offen, setOffen] = React.useState(false);
  const [text, setText] = React.useState('');
  const [hinweise, setHinweise] = React.useState([]);

  const merken = () => {
    setHinweise([...hinweise, text.trim()]);
    setText('');
    setOffen(false);
  };
  const neuPlanen = () => {
    toast.info(`In der Vorschau planen wir „${phase}“ noch nicht neu – später entsteht hier eine neue Fassung nach deinen Wünschen.`);
    setText('');
    setOffen(false);
  };

  return (
    <div className="mt-2 space-y-2">
      {hinweise.map((h, i) => (
        <p key={i} className="flex gap-2 rounded-md bg-primary/5 px-2 py-1.5 text-xs">
          <Pin className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="flex-1">{h}</span>
          <button onClick={() => setHinweise(hinweise.filter((_, j) => j !== i))} aria-label="Hinweis entfernen">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </p>
      ))}
      {!offen ? (
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs text-muted-foreground" onClick={() => setOffen(true)}>
          <MessageSquarePlus className="h-3.5 w-3.5" /> Ich möchte dazu etwas sagen bzw. etwas ändern
        </Button>
      ) : (
        <div className="space-y-2 rounded-md border bg-muted/30 p-2">
          <div className="relative">
            <Textarea rows={3} autoFocus value={text} onChange={(e) => setText(e.target.value)} className="pr-12 bg-card"
              placeholder="Sprich oder tippe, was dir dazu einfällt – z. B. „Das Bild muss gut erkennen lassen, dass …“ oder „Bitte eine andere Methode“." />
            <SpeechInputButton value={text} onResult={setText} maxSeconds={90} className="absolute right-2 top-2" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" disabled={!text.trim()} onClick={merken}>
              <Pin className="h-3.5 w-3.5" /> Als Hinweis mitgeben
            </Button>
            <Button size="sm" className="gap-1.5" disabled={!text.trim()} onClick={neuPlanen}>
              <RefreshCw className="h-3.5 w-3.5" /> Diese Phase neu planen
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOffen(false)}>Abbrechen</Button>
          </div>
        </div>
      )}
    </div>
  );
}