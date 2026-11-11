import React from 'react';
import { Loader2, PenLine, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** „Bearbeiten" oben rechts im Kopf; im Bearbeitungsmodus steht dort „Speichern". */
export default function BearbeitenKnopf({ onClick, aktiv = false, laedt = false, disabled = false, title = '' }) {
  if (aktiv) {
    return (
      <Button size="sm" className="gap-2" onClick={onClick} disabled={disabled}>
        <Save /> Speichern
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={disabled || laedt} title={title}
      className="gap-2 bg-green-50 border-green-200 text-green-800 hover:bg-green-100 hover:text-green-900">
      {laedt ? <Loader2 className="animate-spin" /> : <PenLine />} Bearbeiten
    </Button>
  );
}