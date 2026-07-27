/**
 * components/workspace/lernpaketWizard/WizardIdeenAuswahl.jsx
 *
 * Kreativ-Zwischenstopp des Lernpaket-Wizards (2026-07-26):
 * Zeigt die FREIEN didaktischen Ideen der KI (noch ohne Werkzeug-Zuordnung)
 * gruppiert nach Phase. Die Lehrkraft wählt per Checkbox aus, welche Ideen
 * umgesetzt werden sollen — erst danach mappt die KI auf konkrete
 * Pool-Manager-Aktivitäten (inkl. Aufgabengalerie / Offene Aufgabe).
 */
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Lightbulb } from 'lucide-react';

const PHASEN = [
  { key: 'erarbeitung', label: 'Erarbeitung', emoji: '📘', farbe: 'border-blue-200 bg-blue-50/50' },
  { key: 'uebung', label: 'Übung', emoji: '✏️', farbe: 'border-amber-200 bg-amber-50/50' },
  { key: 'sicherung', label: 'Sicherung / Abschluss', emoji: '🎯', farbe: 'border-green-200 bg-green-50/50' },
];

export default function WizardIdeenAuswahl({ ideen, selectedIds, onToggle, disabled = false }) {
  if (!ideen) return null;

  return (
    <div className="space-y-3">
      {ideen.leitidee && (
        <div className="flex items-start gap-2 rounded-md border border-purple-200 bg-purple-50/60 px-3 py-2 text-xs">
          <Lightbulb className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
          <p className="text-purple-900 leading-snug"><span className="font-semibold">Leitidee:</span> {ideen.leitidee}</p>
        </div>
      )}

      {PHASEN.map(({ key, label, emoji, farbe }) => {
        const items = ideen[key] || [];
        if (items.length === 0) return null;
        return (
          <div key={key} className={`rounded-lg border p-3 space-y-2 ${farbe}`}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
              {emoji} {label}
            </h4>
            {items.map((it) => {
              const checked = selectedIds.has(it.id);
              return (
                <label
                  key={it.id}
                  className={`flex items-start gap-2.5 rounded-md border bg-card px-3 py-2 cursor-pointer transition-colors ${
                    checked ? 'border-primary/50 shadow-sm' : 'border-border opacity-70 hover:opacity-100'
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onToggle(it.id)}
                    disabled={disabled}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 text-sm">
                    <span className="font-medium text-foreground">{it.idee}</span>
                    {it.beschreibung && (
                      <span className="block text-xs text-muted-foreground leading-snug mt-0.5">{it.beschreibung}</span>
                    )}
                    {it.ziel && (
                      <span className="block text-[11px] text-emerald-700 leading-snug mt-0.5">🎯 Ziel: {it.ziel}</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}