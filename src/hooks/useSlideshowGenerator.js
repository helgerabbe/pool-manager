import { useCallback, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { assistentEndpointFuer, assistentHeaders } from '@/lib/assistentEndpunkt';
import { fehlerText, verbindungsFehlerText } from '@/lib/assistentFehler';

/**
 * useSlideshowGenerator
 * ─────────────────────
 * Client-Seite des Slideshow-Generators: führt das Gespräch mit
 * `/functions/slideshowGeneratorChat`, hält Verlauf, Bildersammlung und die
 * Stände des Foliensatzes (Zurückspringen möglich, nichts wird weggeworfen).
 *
 * Diese Datei ist die EINZIGE Stelle im Frontend, die den Endpunkt kennt.
 */

const ENDPOINT = assistentEndpointFuer('slideshowGeneratorChat');

export default function useSlideshowGenerator({ kontext = {}, startFolien = [] } = {}) {
  const [verlauf, setVerlauf] = useState([]);            // [{ rolle:'lehrkraft'|'ki', text }]
  const [staende, setStaende] = useState(
    startFolien?.length ? [{ folien: startFolien, label: 'Vorhandener Stand' }] : [],
  );
  const [index, setIndex] = useState(startFolien?.length ? 0 : -1);
  const [bilder, setBilder] = useState([]);              // [{ url, label }]
  const [teilAntwort, setTeilAntwort] = useState('');
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState(null);
  const [fehlgeschlagen, setFehlgeschlagen] = useState(null);
  const [warnungen, setWarnungen] = useState([]);
  const abortRef = useRef(null);

  const folien = index >= 0 ? (staende[index]?.folien || []) : [];

  const abbrechen = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setTeilAntwort('');
  }, []);

  const springeZu = useCallback((i) => {
    setIndex((alt) => (i >= 0 && i < staende.length ? i : alt));
  }, [staende.length]);

  const bildHinzufuegen = useCallback((bild) => {
    setBilder((alt) => [...alt, bild]);
  }, []);

  const bildEntfernen = useCallback((url) => {
    setBilder((alt) => alt.filter((b) => b.url !== url));
  }, []);

  const senden = useCallback(async (nachricht) => {
    const text = String(nachricht || '').trim();
    if (!text || busy) return;

    setFehler(null);
    setFehlgeschlagen(null);
    setWarnungen([]);
    setBusy(true);
    setTeilAntwort('');
    setVerlauf((v) => [...v, { rolle: 'lehrkraft', text }]);

    const verlaufFuerApi = verlauf.map((m) => ({
      role: m.rolle === 'ki' ? 'assistant' : 'user',
      content: m.text,
    }));

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let gesammelt = '';
    let hatErgebnis = false;

    try {
      await fetchEventSource(ENDPOINT, {
        method: 'POST',
        signal: ctrl.signal,
        openWhenHidden: true,
        headers: await assistentHeaders(),
        credentials: 'include',
        body: JSON.stringify({ nachricht: text, folien, verlauf: verlaufFuerApi, kontext, bilder }),
        onopen: async (res) => {
          if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) return;
          let detail = '';
          try {
            const body = await res.json();
            if (body?.error) detail = String(body.error);
          } catch { /* ignorieren */ }
          const f = new Error(fehlerText(res.status, detail));
          f.uebersetzt = true;
          throw f;
        },
        onmessage: (ev) => {
          if (ev.event === 'chunk') {
            gesammelt += JSON.parse(ev.data).text;
            setTeilAntwort(gesammelt);
          } else if (ev.event === 'ergebnis') {
            const d = JSON.parse(ev.data);
            hatErgebnis = true;
            setVerlauf((v) => [...v, { rolle: 'ki', text: d.antwort || gesammelt || 'Fertig.' }]);
            setTeilAntwort('');
            if (d.warnungen?.length) setWarnungen(d.warnungen);
            if (d.geaendert && d.folien?.length) {
              setStaende((alt) => {
                const neu = [...alt, {
                  folien: d.folien,
                  label: alt.length === 0 ? 'Erste Fassung' : `Stand ${alt.length + 1}`,
                }];
                setIndex(neu.length - 1);
                return neu;
              });
            }
          } else if (ev.event === 'fehler') {
            setFehler(JSON.parse(ev.data).error || 'Unbekannter Fehler.');
          }
        },
        onerror: (err) => { throw err; },
      });

      if (!hatErgebnis && !ctrl.signal.aborted) {
        if (gesammelt.trim()) setVerlauf((v) => [...v, { rolle: 'ki', text: gesammelt }]);
        setFehler('Die Verbindung ist mitten in der Antwort abgerissen — der Foliensatz wurde nicht fertig. Versuchen Sie es noch einmal, am besten mit weniger Folien.');
        setFehlgeschlagen(text);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setFehler(err?.uebersetzt ? err.message : verbindungsFehlerText(err));
        setVerlauf((v) => {
          const letzter = v[v.length - 1];
          return letzter?.rolle === 'lehrkraft' && letzter.text === text ? v.slice(0, -1) : v;
        });
        setFehlgeschlagen(text);
      }
    } finally {
      setBusy(false);
      setTeilAntwort('');
      abortRef.current = null;
    }
  }, [busy, folien, kontext, verlauf, bilder]);

  const nochmalVersuchen = useCallback(() => {
    if (fehlgeschlagen) senden(fehlgeschlagen);
  }, [fehlgeschlagen, senden]);

  return {
    verlauf, teilAntwort, folien, staende, index, bilder,
    busy, fehler, fehlgeschlagen, warnungen,
    senden, nochmalVersuchen, springeZu, abbrechen,
    bildHinzufuegen, bildEntfernen,
  };
}