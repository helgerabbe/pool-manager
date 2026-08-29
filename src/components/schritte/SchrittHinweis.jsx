import React from 'react';

/**
 * Kleiner grauer Erklärtext unter einem Formularfeld.
 *
 * Eigene Komponente, damit die Hinweise in allen Schritt-Editoren gleich
 * aussehen und nicht jedes Formular seine eigene Textgröße erfindet.
 */
export function HinweisText({ children, className = '' }) {
  return (
    <p className={`text-xs text-muted-foreground leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

export default HinweisText;
