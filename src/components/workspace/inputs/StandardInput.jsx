import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function StandardInput({ field, value = '', onChange }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onChange(file_url);
    } catch (err) {
      console.error('Upload fehlgeschlagen:', err);
    } finally {
      setIsUploading(false);
    }
  };

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
    const fileType = field.type === 'image' ? 'image/*' : field.type === 'audio' ? 'audio/*' : undefined;
    const label = field.type === 'image' ? 'Bild' : field.type === 'audio' ? 'Audio' : 'Datei';

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept={fileType}
            onChange={handleFileUpload}
            disabled={isUploading}
            className="w-full px-3 py-2 rounded-lg border border-input text-sm file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:bg-primary/10 file:text-primary cursor-pointer"
          />
          {isUploading && <span className="text-xs text-muted-foreground">Uploading...</span>}
        </div>
        {value && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 border border-green-200">
            <span className="text-xs text-green-700 truncate">{value}</span>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-xs text-green-600 hover:text-green-800 underline"
            >
              Entfernen
            </button>
          </div>
        )}
      </div>
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