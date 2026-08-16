import { useEffect, useState } from 'react';

/**
 * Lädt eine als Datei gespeicherte interaktive Aufgabe (HTML) und gibt den
 * Quelltext zurück, damit er in einem Sandbox-iframe per srcDoc gerendert
 * werden kann. Direktes Laden per iframe-src funktioniert nicht zuverlässig,
 * weil die Datei aus dem Storage ausgeliefert wird.
 *
 * @param {string} url  URL der HTML-Datei (leer = nichts laden)
 * @returns {{ html: string, isLoading: boolean }}
 */
export default function useSnapshotHtml(url) {
  const [html, setHtml] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setHtml('');
      return;
    }
    let abgebrochen = false;
    setIsLoading(true);
    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        if (!abgebrochen) setHtml(text);
      })
      .finally(() => {
        if (!abgebrochen) setIsLoading(false);
      });
    return () => {
      abgebrochen = true;
    };
  }, [url]);

  return { html, isLoading };
}