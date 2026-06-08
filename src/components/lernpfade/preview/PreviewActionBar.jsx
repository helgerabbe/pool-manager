/**
 * PreviewActionBar.jsx
 *
 * Wiederverwendbarer „Premium-Standard" für ALLE KI-Vorschau-Fenster im
 * Pool-Manager (Onboarding, offene Aufgaben, Systembausteine …).
 *
 * Drei einheitliche Aktionen:
 *   ✅ Übernehmen      → friert den aktuell gezeigten KI-Inhalt als Snapshot ein
 *   ✖️ Abbrechen       → schließt ohne zu speichern (nur geschaut)
 *   🔄 Neu generieren  → optionales Textfeld „Was soll anders sein?";
 *                         der Hinweis wird als Verfeinerung an die Generierung
 *                         übergeben (ERSETZT den vorherigen Hinweis, kumuliert
 *                         NICHT).
 *
 * Diese Komponente ist reine Präsentation/Steuerung. Sie kennt weder die
 * konkrete Generierungs-Funktion noch das Inhaltsschema — der Aufrufer gibt
 * `onRegenerate(verfeinerung)` und `onUebernehmen()` herein.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Check, X, Wand2, ChevronUp } from 'lucide-react';

export default function PreviewActionBar({
  loading = false,
  canUebernehmen = true,
  onRegenerate,
  onUebernehmen,
  onCancel,
  uebernehmenLabel = 'Übernehmen',
  className = '',
}) {
  const [showHinweis, setShowHinweis] = useState(false);
  const [hinweis, setHinweis] = useState('');

  const handleRegenerate = () => {
    // ERSETZEN-Semantik: der aktuelle Hinweis ist der einzige Zusatz.
    onRegenerate?.(hinweis.trim() || null);
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Verfeinerungs-Eingabe (einklappbar) */}
      {showHinweis && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5">
            <Wand2 className="w-3.5 h-3.5 text-violet-600" />
            Was soll anders sein? (optional)
          </label>
          <Textarea
            value={hinweis}
            onChange={(e) => setHinweis(e.target.value)}
            placeholder="z. B. kürzer und lockerer · mehr Bezug zu Alltagsbeispielen · eine Frage weniger …"
            className="bg-white text-sm min-h-[64px]"
            disabled={loading}
          />
        </div>
      )}

      {/* Button-Leiste */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {onCancel && (
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={loading}
            className="gap-1.5 text-slate-500"
          >
            <X className="w-4 h-4" />
            Abbrechen
          </Button>
        )}

        {showHinweis ? (
          <Button
            variant="outline"
            onClick={() => setShowHinweis(false)}
            disabled={loading}
            className="gap-1.5 bg-white"
          >
            <ChevronUp className="w-4 h-4" />
            Hinweis ausblenden
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowHinweis(true)}
            disabled={loading}
            className="gap-1.5 bg-white"
          >
            <Wand2 className="w-4 h-4" />
            Mit Hinweis verfeinern
          </Button>
        )}

        <Button
          variant="outline"
          onClick={handleRegenerate}
          disabled={loading}
          className="gap-1.5 bg-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Neu generieren
        </Button>

        <Button
          onClick={onUebernehmen}
          disabled={loading || !canUebernehmen}
          className="gap-1.5 bg-violet-600 hover:bg-violet-700"
        >
          <Check className="w-4 h-4" />
          {uebernehmenLabel}
        </Button>
      </div>
    </div>
  );
}