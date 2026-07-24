import React from 'react';
import { Label } from '@/components/ui/label';

const ZIELE = [
  { value: 'allgemeine_aufgabe', label: 'Allgemeine Aufgabe (Ebene 2)' },
  { value: 'projektaufgabe', label: 'Anwendungs-/Projektaufgabe (Ebene 3)' },
  { value: 'lernpaket_empfehlung', label: 'Lernpaket-Übung (Ebene 1)' },
];

/**
 * Platzierungs-Auswahl im Integrations-Schritt des Aufgabenassistenten:
 * Der KI-Vorschlag ist vorausgewählt, die Lehrkraft kann Art, Themenfeld
 * und Lernpaket jederzeit ändern — die Entscheidung liegt immer bei ihr.
 */
export default function IntegrationZielAuswahl({
  ziel,
  onZielChange,
  themenfeldId,
  onThemenfeldChange,
  lernpaketId,
  onLernpaketChange,
  themenfelder = [],
  lernpakete = [],
  empfohlenesZiel = null,
}) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2.5">
      <p className="text-xs font-semibold text-primary">
        Platzierung wählen — die Empfehlung des Assistenten ist vorausgewählt, Sie entscheiden.
      </p>

      <div>
        <Label className="text-xs text-muted-foreground">Als was soll die Aufgabe integriert werden?</Label>
        <select
          value={ziel || ''}
          onChange={(e) => onZielChange(e.target.value)}
          className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
        >
          {ZIELE.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}{z.value === empfohlenesZiel ? ' — Empfehlung' : ''}
            </option>
          ))}
        </select>
      </div>

      {ziel === 'allgemeine_aufgabe' && (
        <div>
          <Label className="text-xs text-muted-foreground">Themenfeld</Label>
          <select
            value={themenfeldId || ''}
            onChange={(e) => onThemenfeldChange(e.target.value || null)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">Kein Themenfeld (Einheitenebene)</option>
            {themenfelder.map((t) => (
              <option key={t.id} value={t.id}>{t.titel || t.name || 'Ohne Titel'}</option>
            ))}
          </select>
        </div>
      )}

      {ziel === 'lernpaket_empfehlung' && (
        <div>
          <Label className="text-xs text-muted-foreground">Lernpaket</Label>
          <select
            value={lernpaketId || ''}
            onChange={(e) => onLernpaketChange(e.target.value || null)}
            className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm"
          >
            <option value="">Lernpaket wählen …</option>
            {lernpakete.map((p) => (
              <option key={p.id} value={p.id}>{p.titel_des_pakets}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}