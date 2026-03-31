import React from 'react';

export default function TextbookInput({ value = {}, onChange }) {
  const handleChange = (field, fieldValue) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1 space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Seite</label>
        <input
          type="number"
          value={value.seite || ''}
          onChange={(e) => handleChange('seite', e.target.value)}
          placeholder="z.B. 42"
          className="w-full px-3 py-2 rounded-lg border border-input text-sm"
          min="1"
        />
      </div>
      <div className="flex-1 space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Nummer/Aufgabe</label>
        <input
          type="text"
          value={value.nummer || ''}
          onChange={(e) => handleChange('nummer', e.target.value)}
          placeholder="z.B. 1a, 3-5"
          className="w-full px-3 py-2 rounded-lg border border-input text-sm"
        />
      </div>
    </div>
  );
}