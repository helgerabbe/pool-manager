import React from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

/** Änderungswunsch an die KI: Der Entwurf wird neu gebaut und dabei gleich geprüft. */
export default function KiAenderungsFeld({ onAendern }) {
  const [text, setText] = React.useState('');
  const [laedt, setLaedt] = React.useState(false);
  const [fehler, setFehler] = React.useState('');
  const senden = async () => {
    setLaedt(true); setFehler('');
    await onAendern(text.trim()).then(() => setText('')).catch(() => setFehler('Die Änderung hat nicht geklappt. Bitte noch einmal versuchen.'));
    setLaedt(false);
  };
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      <p className="text-sm font-semibold">Was soll ich am Entwurf ändern?</p>
      <FreitextMitSprache value={text} onChange={setText} rows={2} placeholder="z. B. Einstieg kürzer, dafür mehr Zeit für die Gruppenarbeit" />
      {fehler && <p className="text-xs text-destructive">{fehler}</p>}
      <Button size="sm" onClick={senden} disabled={!text.trim() || laedt}>
        {laedt ? <Loader2 className="animate-spin" /> : <Wand2 />} {laedt ? 'Ich überarbeite den Entwurf …' : 'Entwurf überarbeiten'}
      </Button>
    </div>
  );
}