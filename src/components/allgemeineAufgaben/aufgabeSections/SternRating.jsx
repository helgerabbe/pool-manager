import React from 'react';

/**
 * SternRating
 * Kleines 1–3 Sterne-Rating mit Reset.
 * 1:1 aus AufgabeCreateView extrahiert.
 */
export default function SternRating({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(value === star ? null : star)}
          className={`text-2xl transition-transform hover:scale-110 ${
            value && value >= star ? 'text-amber-400' : 'text-gray-300'
          }`}
          title={`${star} Stern${star > 1 ? 'e' : ''}`}
        >
          ★
        </button>
      ))}
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs text-muted-foreground hover:text-foreground ml-2"
        >
          Zurücksetzen
        </button>
      )}
    </div>
  );
}