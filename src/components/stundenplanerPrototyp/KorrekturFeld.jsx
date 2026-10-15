import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';

/** „Nein, das ist anders“ – aufklappbares Korrekturfeld mit Spracheingabe. */
export default function KorrekturFeld({ knopf, platzhalter, neuText, onNeu }) {
  const [offen, setOffen] = React.useState(false);
  const [text, setText] = React.useState('');
  if (!offen) return <Button variant="outline" onClick={() => setOffen(true)}>{knopf}</Button>;
  return (
    <div className="w-full space-y-2 rounded-xl border bg-muted/30 p-3">
      <FreitextMitSprache value={text} onChange={setText} placeholder={platzhalter} rows={2} />
      <div className="flex gap-2">
        <Button size="sm" disabled={!text.trim()} onClick={() => { onNeu(text); setOffen(false); setText(''); }}><RotateCcw /> {neuText}</Button>
        <Button size="sm" variant="ghost" onClick={() => setOffen(false)}>Abbrechen</Button>
      </div>
    </div>
  );
}