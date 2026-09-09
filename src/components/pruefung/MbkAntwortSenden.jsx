/**
 * MbkAntwortSenden — „Eingearbeitet, bitte neu bauen".
 *
 * Schreibt die Entscheidungen der Fachgruppe zu allen MBK-Befunden als
 * Antwortdatei ins Repository und signalisiert dem Bau, dass ein neuer Lauf
 * ansteht. Optional ein Satz an das Moodle-Team dazu.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, CheckCircle2 } from 'lucide-react';

export default function MbkAntwortSenden({ anzahlEntschieden, anzahlOffen, laeuft, onSenden }) {
  const [offen, setOffen] = useState(false);
  const [hinweis, setHinweis] = useState('');

  if (!offen) {
    return (
      <Button variant="outline" onClick={() => setOffen(true)} disabled={anzahlEntschieden === 0}>
        <Send className="w-4 h-4" />
        Eingearbeitet, bitte neu bauen
      </Button>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2 w-full">
      <p className="text-sm">
        <CheckCircle2 className="w-4 h-4 inline mr-1 text-emerald-600" />
        {anzahlEntschieden} entschiedene Hinweise gehen an das Moodle-Team zurück
        {anzahlOffen > 0 ? ` — ${anzahlOffen} sind noch offen.` : '.'}
      </p>
      <Textarea
        value={hinweis}
        onChange={(e) => setHinweis(e.target.value)}
        placeholder="Optional: ein Satz an das Moodle-Team (z. B. was du geändert hast oder worauf zu achten ist)."
        className="text-sm"
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          disabled={laeuft}
          onClick={async () => {
            await onSenden(hinweis.trim());
            setOffen(false);
            setHinweis('');
          }}
        >
          {laeuft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Abschicken
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOffen(false)}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}