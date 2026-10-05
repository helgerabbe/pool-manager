import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const ZIELE = [
  ['an_mbk', 'An das Moodle-Team'],
  ['an_admin', 'An die Administration'],
];

/** „Nicht meine Aufgabe": Befund an Moodle-Team oder Administration weitergeben. */
export default function WeitergebenButtons({ onWeitergeben }) {
  const [ziel, setZiel] = useState(null);
  const [notiz, setNotiz] = useState('');
  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Nicht meine Aufgabe – weitergeben:</span>
        {ZIELE.map(([k, l]) => (
          <Button key={k} size="sm" variant={ziel === k ? 'default' : 'outline'} onClick={() => setZiel(ziel === k ? null : k)}>
            <Send className="w-3.5 h-3.5" /> {l}
          </Button>
        ))}
      </div>
      {ziel && (
        <div className="space-y-2">
          <Textarea value={notiz} onChange={(e) => setNotiz(e.target.value)} className="text-sm"
            placeholder="Optional: Was genau ist zu tun? (z. B. „Bitte den Brian-Dialog anlegen und die Adresse eintragen.“)" />
          <Button size="sm" onClick={() => onWeitergeben(ziel, notiz.trim())}>Weitergeben</Button>
        </div>
      )}
    </div>
  );
}