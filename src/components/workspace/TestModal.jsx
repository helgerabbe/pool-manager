/**
 * TestModal.jsx
 *
 * Modal für die Bearbeitung von "Test" Aktivitäten.
 * Nutzt BaseActivityModal als Wrapper und MiniQuizModalDetail als Editor
 * (Tests und Quizze teilen sich das gleiche Fragen-Antwort-Format).
 */

import React, { useState, useEffect } from 'react';
import BaseActivityModal from '@/components/workspace/BaseActivityModal';
import MiniQuizModalDetail from '@/components/workspace/MiniQuizModalDetail';

export default function TestModal({
  open,
  onOpenChange,
  initialData = {},
  onSave,
  onDelete,
  isSaving = false,
  isCopy = false,
  exportLocked = false,
  onCancel,
}) {
  const [editorData, setEditorData] = useState(initialData);

  useEffect(() => {
    if (open) {
      setEditorData(initialData || {});
    }
  }, [open, initialData]);

  const handleSave = (baseData) => {
    const payload = {
      ...editorData,
      ...baseData,
    };
    onSave?.(payload);
  };

  return (
    <MiniQuizModalDetail
      open={open}
      onOpenChange={onOpenChange}
      initialData={initialData}
      onSave={handleSave}
      onDelete={onDelete}
      isSaving={isSaving}
      isCopy={isCopy}
      exportLocked={exportLocked}
      onCancel={onCancel}
    />
  );
}