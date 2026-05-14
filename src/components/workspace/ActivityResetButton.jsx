/**
 * ActivityResetButton.jsx
 *
 * Wiederverwendbarer Reset-Button für Aktivitäten-Dialoge.
 * Setzt alle Inhalte einer Aktivität auf den leeren Zustand zurück,
 * OHNE die Aktivität selbst aus der Phase/dem Lernpaket zu entfernen.
 *
 * Zeigt einen Inline-Bestätigungsschritt an, bevor der Reset ausgelöst wird.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Loader2 } from 'lucide-react';

export default function ActivityResetButton({ onReset, disabled = false }) {
  const [confirm, setConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleClick = async () => {
    setIsResetting(true);
    try {
      await onReset?.();
    } finally {
      setIsResetting(false);
      setConfirm(false);
    }
  };

  if (!confirm) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setConfirm(true)}
        disabled={disabled}
        className="gap-1.5 bg-red-50 border-red-300 text-red-800 hover:bg-red-100 hover:text-red-900 hover:border-red-400"
        title="Setzt alle Eingaben dieser Aktivität zurück. Die Aktivität bleibt in der Phase erhalten."
      >
        <RotateCcw className="w-4 h-4" />
        Aktuelle Aufgabe löschen (Aktivität bleibt erhalten)
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-amber-800 font-medium">Inhalte wirklich zurücksetzen?</span>
      <Button
        size="sm"
        onClick={handleClick}
        disabled={isResetting}
        className="gap-1.5 h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
      >
        {isResetting
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <RotateCcw className="w-3.5 h-3.5" />}
        Ja, zurücksetzen
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setConfirm(false)}
        disabled={isResetting}
        className="h-7 text-xs"
      >
        Abbrechen
      </Button>
    </div>
  );
}