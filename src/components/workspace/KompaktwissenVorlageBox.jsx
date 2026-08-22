/**
 * KompaktwissenVorlageBox.jsx
 *
 * Zeigt im Kompaktwissen-Editor die ursprüngliche, selbst geschriebene
 * Textvorlage der Lehrkraft an (2026-08-22). Sobald das Kompaktwissen per KI
 * aufbereitet wird, wird der Originaltext nicht überschrieben, sondern in
 * field_values.text_vorlage gesichert. Die Schüler:innen sehen ihn nicht — er
 * bleibt hier als Arbeitsgrundlage erhalten und kann zurückgeholt werden.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Archive, ChevronDown, ChevronUp, Undo2 } from 'lucide-react';

export default function KompaktwissenVorlageBox({ vorlage = '', onRestore, disabled = false }) {
  const [offen, setOffen] = useState(false);
  if (!vorlage.trim()) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60">
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-amber-900">
          <Archive className="w-4 h-4" /> Ursprüngliche Textvorlage (nur für Lehrkräfte)
        </span>
        {offen ? <ChevronUp className="w-4 h-4 text-amber-700" /> : <ChevronDown className="w-4 h-4 text-amber-700" />}
      </button>

      {offen && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-amber-800">
            Dieser Text wurde vor der KI-Aufbereitung eingegeben. Er bleibt dauerhaft erhalten und wird
            den Schüler:innen nicht angezeigt.
          </p>
          <div className="max-h-56 overflow-y-auto rounded-md border border-amber-200 bg-white px-3 py-2 text-sm whitespace-pre-wrap text-foreground">
            {vorlage}
          </div>
          {onRestore && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => onRestore(vorlage)}
              className="gap-1.5 text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
            >
              <Undo2 className="w-3.5 h-3.5" /> Diesen Text wieder als Kompaktwissen verwenden
            </Button>
          )}
        </div>
      )}
    </div>
  );
}