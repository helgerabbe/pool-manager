import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import ActivityPreviewModal from '@/components/workspace/ActivityPreviewModal';

/**
 * Zeigt, wie die Aufgabe aus diesem Auftrag für Schüler aussehen würde —
 * OHNE dass die Aktivität dafür schon angelegt sein muss. Gerendert wird mit
 * der bestehenden Schüler-Vorschau; hier wandern lediglich die field_values
 * des Auftrags hinein.
 */
export default function AuftragVorschauButton({ aufgabenartName, fieldValues }) {
  const [offen, setOffen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOffen(true)}>
        <Eye className="h-4 w-4" /> Vorschau
      </Button>
      <ActivityPreviewModal
        open={offen}
        onOpenChange={setOffen}
        aktivitaet={{ name: aufgabenartName || 'Aufgabe' }}
        fieldValues={fieldValues || {}}
      />
    </>
  );
}