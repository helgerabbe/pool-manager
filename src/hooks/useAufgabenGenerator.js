import { useCallback, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { base44 } from '@/api/base44Client';
import { fehlerText, verbindungsFehlerText } from '@/lib/assistentFehler';

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
  // Bei einem Fehler geht die getippte Nachricht sonst verloren — die
  // Lehrkraft müsste alles neu formulieren. Sie wird hier aufbewahrt und
  // von der Gesprächsspalte als "Nochmal versuchen" angeboten.
  const [fehlgeschlagen, setFehlgeschlagen] = useState(null);
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

  /**
   * Setzt das Fragment von außen — für das Zurückspringen auf einen dauerhaft
   * gespeicherten Stand aus einer früheren Sitzung. Der Stand wird als neuer
   * Eintrag angehängt statt die Liste zu überschreiben: Zurückspringen soll
   * nichts wegwerfen, was man danach vielleicht wieder braucht.
   */
  const setzeFragment = useCallback((neuesFragment, label = 'Geladener Stand') => {
    const text = String(neuesFragment || '');
    if (!text.trim()) return;
    setStaende((alt) => {
      const neu = [...alt, { fragment: text, label, zeit: new Date().toISOString() }];
      setIndex(neu.length - 1);
      return neu;
    });
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
          let detail = '';
          try {
            const body = await res.json();
            if (body?.error) detail = String(body.error);
          } catch { /* ignorieren */ }
          const fehler = new Error(fehlerText(res.status, detail));
          fehler.uebersetzt = true;
          throw fehler;
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
        setFehler(err?.uebersetzt ? err.message : verbindungsFehlerText(err));
        // Die unbeantwortete Frage wieder aus dem Verlauf nehmen und für
        // "Nochmal versuchen" aufheben. Sonst stünde sie doppelt da, sobald
        // die Lehrkraft es erneut schickt — und ohne Aufheben wäre der
        // getippte Text verloren.
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
  }, [busy, fragment, kontext, verlauf]);

  /** Die zuletzt gescheiterte Nachricht erneut schicken. */
  const nochmalVersuchen = useCallback(() => {
    if (fehlgeschlagen) senden(fehlgeschlagen);
  }, [fehlgeschlagen, senden]);

  return {
    verlauf,
    teilAntwort,
    fragment,
    staende,
    index,
    busy,
    fehler,
    fehlgeschlagen,
    nochmalVersuchen,
    warnungen,
    senden,
    springeZu,
    setzeFragment,
    abbrechen,
  };
}
