import React from 'react';

export default function StandardInput({ field, value = '', onChange }) {
  if (field.type === 'text') {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full px-3 py-2 rounded-lg border border-input text-sm"
      />
    );
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full px-3 py-2 rounded-lg border border-input text-sm min-h-[120px]"
      />
    );
  }

  if (field.type === 'url') {
    return (
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || 'https://...'}
        className="w-full px-3 py-2 rounded-lg border border-input text-sm"
      />
    );
  }

  if (field.type === 'number') {
    return (
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="w-full px-3 py-2 rounded-lg border border-input text-sm"
      />
    );
  }

  if (field.type === 'file' || field.type === 'image' || field.type === 'audio') {
    return (
      <input
        type="file"
        accept={field.type === 'image' ? 'image/*' : field.type === 'audio' ? 'audio/*' : undefined}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange(file.name);
        }}
        className="w-full px-3 py-2 rounded-lg border border-input text-sm"
      />
    );
  }

  if (field.type === 'select') {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-lg border border-input text-sm"
      >
        <option value="">-- Wählen --</option>
        {field.options?.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'json') {
    return (
      <textarea
        value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
        onChange={(e) => {
          try {
            onChange(JSON.parse(e.target.value));
          } catch {
            onChange(e.target.value);
          }
        }}
        placeholder="JSON-Format..."
        className="w-full px-3 py-2 rounded-lg border border-input text-sm font-mono min-h-[120px]"
      />
    );
  }

  return null;
}