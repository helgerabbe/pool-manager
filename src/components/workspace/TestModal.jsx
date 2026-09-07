/**
 * TestModal.jsx
 *
 * Modal für die Bearbeitung von "Test" Aktivitäten.
 * Nutzt BaseActivityModal als Wrapper und TestEditor für die Eingabe.
 * Tests und Quizze sind vollständig getrennte Systeme.
 */

import React, { useEffect, useState } from 'react';
import BaseActivityModal from '@/components/workspace/BaseActivityModal';
import TestEditor from '@/components/workspace/TestEditor';

export default function TestModal({
  open,
  onOpenChange,
  initialData = {},
  onSave,
  onDelete,
  isSaving = false,
  isCopy = false,
  exportLocked = false,
  footerExtra = null,
  readOnly = false,
  lockedMessage = null,
  lernpaketId = null,
}) {
  const [editorData, setEditorData] = useState(initialData);

  // NUR beim Öffnen zurücksetzen. `initialData` kommt als neues Objekt bei
  // jedem Rendern des Elternteils (Hintergrund-Refetch alle 5 Sek.) — stünde
  // es in den Abhängigkeiten, würde der Bearbeitungsstand laufend auf den
  // Ausgangsstand zurückfallen und beim Speichern leer überschrieben.
  useEffect(() => {
    if (open) setEditorData(initialData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <BaseActivityModal
      open={open}
      onOpenChange={onOpenChange}
      title={isCopy ? "Test-Kopie bearbeiten" : "Test bearbeiten"}
      initialData={initialData}
      isSaving={isSaving}
      isCopy={isCopy}
      exportLocked={exportLocked}
      footerExtra={footerExtra}
      readOnly={readOnly}
      lockedMessage={lockedMessage}
      onDelete={readOnly ? undefined : onDelete}
      onSave={(baseData) => {
        if (readOnly) return;
        const { content_status, ...cleanEditorData } = editorData || {};
        onSave?.({ ...cleanEditorData, ...baseData });
      }}
    >
      <TestEditor
        initialData={initialData}
        onChange={(data) => !readOnly && setEditorData(data)}
        readOnly={readOnly}
        lernpaketId={lernpaketId}
      />
    </BaseActivityModal>
  );
}