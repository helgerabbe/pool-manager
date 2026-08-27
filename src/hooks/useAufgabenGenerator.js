import { useCallback, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { base44 } from '@/api/base44Client';

/**
 * useAufgabenGenerator
 * ────────────────────
 * Client-Seite des Aufgabengenerators: führt das Gespräch mit
 * `/functions/aufgabeGeneratorChat`, hält den Gesprächsverlauf, das aktuelle
 * Fragment und die Liste aller bisherigen Stände.
 *
 * Diese Datei ist die EINZIGE Stelle im Frontend, die den Endpunkt kennt.
 * Beim Umzug nach Vercel wird hier eine Zeile getauscht.
 */

const ENDPOINT = '/functions/aufgabeGeneratorChat';

/** Holt einen gültigen Token — gleiche Logik wie useRealtimeUpdates. */
async function holeToken() {
  try {
    const keys = Object.keys(localStorage);
    const tokenKey = keys.find((k) => k.startsWith('base44_') && k.endsWith('_token'));
    if (tokenKey) {
      const t = localStorage.getItem(tokenKey);
      if (t) return t;
    }
  } catch { /* Storage gesperrt */ }
  try {
    if (typeof base44.auth?.getToken === 'function') return await base44.auth.getToken();
  } catch { /* ignorieren */ }
  return null;
}

export default function useAufgabenGenerator({ kontext = {}, startFragment = '' } = {}) {
  const [verlauf, setVerlauf] = useState([]);        // [{ rolle:'lehrkraft'|'ki', text }]
  const [staende, setStaende] = useState(
    startFragment ? [{ fragment: startFragment, label: 'Gespeicherter Stand', zeit: null }] : [],
  );
  const [index, setIndex] = useState(startFragment ? 0 : -1);
  const [teilAntwort, setTeilAntwort] = useState('');  // strömt während der Antwort
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState(null);
  const [warnungen, setWarnungen] = useState([]);
  const abortRef = useRef(null);

  const fragment = index >= 0 ? (staende[index]?.fragment || '') : '';

  const abbrechen = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setTeilAntwort('');
  }, []);

  const springeZu = useCallback((i) => {
    setIndex((alt) => (i >= 0 && i < staende.length ? i : alt));
  }, [staende.length]);

  const senden = useCallback(async (nachricht) => {
    const text = String(nachricht || '').trim();
    if (!text || busy) return;

    setFehler(null);
    setWarnungen([]);
    setBusy(true);
    setTeilAntwort('');
    setVerlauf((v) => [...v, { rolle: 'lehrkraft', text }]);

    // Verlauf im Protokoll-Format der Function (ohne die neue Nachricht).
    const verlaufFuerApi = verlauf.map((m) => ({
      role: m.rolle === 'ki' ? 'assistant' : 'user',
      content: m.text,
    }));

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let gesammelt = '';

    try {
      const token = await holeToken();
      await fetchEventSource(ENDPOINT, {
        method: 'POST',
        signal: ctrl.signal,
        openWhenHidden: true,
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          nachricht: text,
          fragment,
          verlauf: verlaufFuerApi,
          kontext,
        }),
        onopen: async (res) => {
          if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) return;
          let msg = `Der Generator antwortet nicht (HTTP ${res.status}).`;
          try {
            const body = await res.json();
            if (body?.error) msg = body.error;
          } catch { /* ignorieren */ }
          throw new Error(msg);
        },
        onmessage: (ev) => {
          if (ev.event === 'chunk') {
            const { text: stueck } = JSON.parse(ev.data);
            gesammelt += stueck;
            setTeilAntwort(gesammelt);
          } else if (ev.event === 'ergebnis') {
            const d = JSON.parse(ev.data);
            setVerlauf((v) => [...v, { rolle: 'ki', text: d.antwort || gesammelt || 'Fertig.' }]);
            setTeilAntwort('');
            if (d.warnungen?.length) setWarnungen(d.warnungen);
            if (d.geaendert && d.fragment) {
              setStaende((alt) => {
                const neu = [...alt, {
                  fragment: d.fragment,
                  label: alt.length === 0 ? 'Erste Fassung' : `Stand ${alt.length + 1}`,
                  zeit: new Date().toISOString(),
                }];
                setIndex(neu.length - 1);
                return neu;
              });
            }
          } else if (ev.event === 'fehler') {
            const d = JSON.parse(ev.data);
            setFehler(d.error || 'Unbekannter Fehler.');
          }
        },
        onerror: (err) => {
          // Nicht automatisch neu verbinden — sonst läuft der Auftrag doppelt.
          throw err;
        },
      });
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setFehler(err?.message || 'Verbindung zum Generator abgebrochen.');
        setVerlauf((v) => [...v, {
          rolle: 'ki',
          text: 'Da ist etwas schiefgegangen. Versuch es bitte noch einmal.',
        }]);
      }
    } finally {
      setBusy(false);
      setTeilAntwort('');
      abortRef.current = null;
    }
  }, [busy, fragment, kontext, verlauf]);

  return {
    verlauf,
    teilAntwort,
    fragment,
    staende,
    index,
    busy,
    fehler,
    warnungen,
    senden,
    springeZu,
    abbrechen,
  };
}
