/**
 * TestModal.jsx
 *
 * Modal für die Bearbeitung von "Test" Aktivitäten.
 * Nutzt BaseActivityModal als Wrapper und TestEditor für die Eingabe.
 * Tests und Quizze sind vollständig getrennte Systeme.
 */

import React, { useState } from 'react';
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
}) {
  const [editorData, setEditorData] = useState(initialData);

  return (
    <BaseActivityModal
      open={open}
      onOpenChange={onOpenChange}
      title={isCopy ? "Test-Kopie bearbeiten" : "Test bearbeiten"}
      initialData={initialData}
      isSaving={isSaving}
      isCopy={isCopy}
      exportLocked={exportLocked}
      onDelete={onDelete}
      onSave={(baseData) => {
        onSave?.({ ...editorData, ...baseData });
      }}
    >
      <TestEditor
        initialData={initialData}
        onChange={(data) => setEditorData(data)}
      />
    </BaseActivityModal>
  );
}