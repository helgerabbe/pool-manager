import React from 'react';
import { X, Loader2 } from 'lucide-react';

/**
 * Bilder, die per Zwischenablage ins Gespräch eingefügt wurden und mit der
 * nächsten Nachricht an den Assistenten gehen. Klein, entfernbar, mit
 * Lade-Anzeige während des Hochladens.
 */
export default function GespraechsBildAnhaenge({ bilder = [], uploading = false, onEntfernen, disabled = false }) {
  if (!bilder.length && !uploading) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {bilder.map((b, i) => (
        <div key={b.url} className="relative group">
          <img
            src={b.url}
            alt={b.name || `Bild ${i + 1}`}
            className="h-16 w-16 object-cover rounded-md border border-violet-200 bg-white"
          />
          {onEntfernen && (
            <button
              type="button"
              onClick={() => onEntfernen(i)}
              disabled={disabled}
              title="Bild entfernen"
              className="absolute -top-1.5 -right-1.5 rounded-full bg-white border border-slate-300 p-0.5 text-slate-600 hover:text-red-600 hover:border-red-300 shadow-sm"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      {uploading && (
        <span className="h-16 w-16 flex items-center justify-center rounded-md border border-dashed border-violet-300 text-violet-500">
          <Loader2 className="w-4 h-4 animate-spin" />
        </span>
      )}
    </div>
  );
}