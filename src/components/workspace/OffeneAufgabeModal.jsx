/**
 * OffeneAufgabeModal.jsx
 *
 * Modal für die Bearbeitung von "Offene Aufgabe" Aktivitäten.
 * Nutzt BaseActivityModal als Wrapper und OffeneAufgabeEditor für die Eingabe.
 */

import React, { useState } from 'react';
import BaseActivityModal from '@/components/workspace/BaseActivityModal';
import OffeneAufgabeEditor from '@/components/workspace/OffeneAufgabeEditor';

export default function OffeneAufgabeModal({
  open,
  onOpenChange,
  initialData = {},
  onSave,
  onDelete,
  onReset,
  isSaving = false,
  isCopy = false,
  exportLocked = false,
}) {
  const [editorData, setEditorData] = useState(initialData);

  return (
    <BaseActivityModal
      open={open}
      onOpenChange={onOpenChange}
      title={isCopy ? "Offene Aufgabe (Kopie) bearbeiten" : "Offene Aufgabe bearbeiten"}
      initialData={initialData}
      isSaving={isSaving}
      isCopy={isCopy}
      exportLocked={exportLocked}
      onDelete={onDelete}
      onReset={onReset}
      onSave={(baseData) => {
        onSave?.({ ...editorData, ...baseData });
      }}
    >
      <OffeneAufgabeEditor
        initialData={initialData}
        onChange={(data) => setEditorData(data)}
        readOnly={false}
      />
    </BaseActivityModal>
  );
}