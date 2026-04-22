import React, { useState } from 'react';
import BaseActivityModal from '@/components/workspace/BaseActivityModal';
import MiniQuizEditor from '@/components/workspace/MiniQuizEditor';

export default function MiniQuizModal({ open, onOpenChange, initialData = {}, onSave, onDelete, isSaving = false, isCopy = false, exportLocked = false }) {
  const [editorData, setEditorData] = useState({
    questions: initialData.questions || [],
    instruction: initialData.instruction || ''
  });

  return (
    <BaseActivityModal
      open={open}
      onOpenChange={onOpenChange}
      title="Mini-Quiz bearbeiten"
      initialData={initialData}
      isSaving={isSaving}
      isCopy={isCopy}
      exportLocked={exportLocked}
      onDelete={onDelete}
      onSave={(baseData) => {
        onSave({ ...editorData, ...baseData });
      }}
    >
      <MiniQuizEditor
        initialData={initialData}
        onChange={(data) => setEditorData(data)}
      />
    </BaseActivityModal>
  );
}