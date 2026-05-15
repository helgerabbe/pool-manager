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
}) {
  const [editorData, setEditorData] = useState(initialData);

  useEffect(() => {
    if (open) setEditorData(initialData);
  }, [open, initialData]);

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
        const { content_status, ...cleanEditorData } = editorData || {};
        onSave?.({ ...cleanEditorData, ...baseData });
      }}
    >
      <TestEditor
        initialData={initialData}
        onChange={(data) => setEditorData(data)}
        readOnly={readOnly}
      />
    </BaseActivityModal>
  );
}