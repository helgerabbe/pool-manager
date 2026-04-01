/**
 * Ebene2GeneratorButton.jsx
 *
 * Phase 6.7: Integrations-Button für Ebene 2 KI-Generator
 * 
 * Verwendet die generische BulkGeneratorModal mit Ebene 2 Kontext
 */

import React, { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BulkGeneratorModal from '@/components/aufgaben/BulkGeneratorModal';

export default function Ebene2GeneratorButton({
  masterAufgabe,
  lernpaketId,
  themenfeld,
  kompetenzen,
  schwierigkeitsgrad,
  fach,
  jahrgangsstufe,
  onSuccess,
}) {
  const [open, setOpen] = useState(false);

  if (!masterAufgabe) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Wand2 className="w-4 h-4" />
        ✨ Varianten generieren
      </Button>

      <BulkGeneratorModal
        open={open}
        onOpenChange={setOpen}
        masterAufgabe={masterAufgabe}
        lernpaketId={lernpaketId}
        fach={fach}
        jahrgangsstufe={jahrgangsstufe}
        entityType="ebene2"
        contextData={{
          themenfeld,
          kompetenzen,
          schwierigkeitsgrad,
        }}
        invalidateKeys={[['ebene2_aufgaben', lernpaketId]]}
        onSuccess={onSuccess}
      />
    </>
  );
}