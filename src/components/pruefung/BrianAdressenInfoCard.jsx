/**
 * BrianAdressenInfoCard — reine Information im Prüfbereich.
 *
 * Zeigt, für welche Brian-Aufgaben der Pool-Manager schon die Adresse aus dem
 * Austauschordner übernommen hat. Nichts zu entscheiden, nichts zu tun — die
 * Übernahme läuft automatisch; der Knopf holt nur früher als der Tageslauf.
 */
import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

/** Alle Brian-Stellen einer Aufgabenliste: die Aufgabe selbst und ihre Brian-Schritte. */
function sammleBrianStellen(aufgaben) {
  const stellen = [];
  aufgaben.forEach((a) => {
    const schritte = Array.isArray(a.sequenz_schritte) ? a.sequenz_schritte : [];
    const brianSchritte = schritte.filter((s) => s?.typ === 'brian');
    if (brianSchritte.length > 0) {
      brianSchritte.forEach((s) => {
        stellen.push({
          key: `${a.id}:${s.id}`,
          titel: `${a.titel || 'Aufgabe'} · ${s.titel || 'Gespräch'}`,
          url: s.brian?.url || '',
        });
      });
      return;
    }
    if (a.brian_dialog_name || a.brian_learner_instruction || a.brian_url) {
      stellen.push({ key: a.id, titel: a.titel || 'Aufgabe', url: a.brian_url || '' });
    }
  });
  return stellen;
}

export default function BrianAdressenInfoCard({ aufgaben = [], laeuft, onAbholen }) {
  const stellen = useMemo(() => sammleBrianStellen(aufgaben), [aufgaben]);
  const mitAdresse = stellen.filter((s) => !!s.url);

  if (stellen.length === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Bot className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Brian-Adressen</h3>
        <Badge variant="outline" className="bg-card">
          {mitAdresse.length} von {stellen.length} eingetragen
        </Badge>
        <div className="flex-1" />
        <Button size="sm" variant="ghost" onClick={onAbholen} disabled={laeuft}>
          {laeuft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Jetzt nachsehen
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Das Moodle-Team legt die KI-Tutor-Gespräche selbst an; die Adressen kommen von allein hier an
        und werden automatisch in die Aufgaben eingetragen. Du musst dafür nichts tun.
      </p>
      {mitAdresse.length > 0 && (
        <ul className="space-y-1">
          {mitAdresse.map((s) => (
            <li key={s.key} className="text-xs flex items-center gap-1.5">
              <span className="text-emerald-700">✓</span>
              <span className="truncate">{s.titel}</span>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex items-center gap-1 shrink-0"
              >
                öffnen <ExternalLink className="w-3 h-3" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}