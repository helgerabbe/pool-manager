import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';

export default function PairListInput({ value = [], onChange, placeholder = '' }) {
  const pairs = Array.isArray(value) ? value : [];

  const handleAddPair = () => {
    onChange([...pairs, { key: '', value: '' }]);
  };

  const handleUpdatePair = (index, field, fieldValue) => {
    const updated = [...pairs];
    updated[index] = { ...updated[index], [field]: fieldValue };
    onChange(updated);
  };

  const handleRemovePair = (index) => {
    onChange(pairs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {pairs.map((pair, idx) => (
        <div key={idx} className="flex gap-2 items-end">
          <input
            type="text"
            placeholder="Schlüssel/Frage"
            value={pair.key || ''}
            onChange={(e) => handleUpdatePair(idx, 'key', e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-input text-sm"
          />
          <input
            type="text"
            placeholder="Wert/Antwort"
            value={pair.value || ''}
            onChange={(e) => handleUpdatePair(idx, 'value', e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-input text-sm"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => handleRemovePair(idx)}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAddPair}
        className="gap-2"
      >
        <Plus className="w-4 h-4" /> Paar hinzufügen
      </Button>
    </div>
  );
}