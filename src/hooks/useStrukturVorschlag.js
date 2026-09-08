import { useCallback, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { ASSISTENT_ENDPOINT, assistentHeaders } from '@/lib/assistentEndpunkt';
import { fehlerText, verbindungsFehlerText } from '@/lib/assistentFehler';

/**
 * useStrukturVorschlag
 * ────────────────────
 * Die Struktur-Phase: Der Assistent schlägt die SCHRITTFOLGE einer Aufgabe
 * vor — als Text, ohne etwas zu bauen. Erst danach wird pro Schritt gebaut,
 * und nur der, den die Lehrkraft gerade offen hat.
 *
 * Spricht denselben Endpunkt wie useAufgabenGenerator, nur mit
 * `modus: 'struktur'`. Zurück kommen keine Fragmente, sondern eine geprüfte
 * Liste von Schrittvorschlägen.
 *
 * Der Vorschlag wird NICHT selbst übernommen — er landet in `vorschlag` und
 * wartet dort auf die Lehrkraft. Etwas ungefragt in die Schrittfolge zu
 * schreiben wäre der falsche Umgang mit einer Aufgabe, an der sie vielleicht
 * schon gearbeitet hat.
 */

export default function useStrukturVorschlag({ kontext = {} } = {}) {
  const [verlauf, setVerlauf] = useState([]);       // [{ rolle, text }]
  const [vorschlag, setVorschlag] = useState(null); // [{ titel, typ, … }] | null
  const [teilAntwort, setTeilAntwort] = useState('');
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState(null);
  // Bei einem Fehler geht die getippte Nachricht sonst verloren — die
  // Lehrkraft müsste alles neu formulieren. Sie wird hier aufbewahrt und
  // von der Gesprächsspalte als "Nochmal versuchen" angeboten.
  const [fehlgeschlagen, setFehlgeschlagen] = useState(null);
  // Die Materialien gehoerten zur gescheiterten Anfrage — beim Wiederholen
  // muessen sie wieder mit, sonst entsteht ein anderer Vorschlag.
  const letzteOptionenRef = useRef({});
  const [warnungen, setWarnungen] = useState([]);
  const abortRef = useRef(null);

  const abbrechen = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setTeilAntwort('');
  }, []);

  const zuruecksetzen = useCallback(() => {
    setVerlauf([]);
    setVorschlag(null);
    setFehler(null);
    setWarnungen([]);
  }, []);

  // `basis`: die Folge, auf die sich die Nachricht bezieht — wenn der Aufrufer
  // sie gerade erst gesetzt hat, steht sie noch nicht in `vorschlag`.
  const senden = useCallback(async (nachricht, { materialien = [], basis = null } = {}) => {
    const text = String(nachricht || '').trim();
    if (!text || busy) return;

    setFehler(null);
    setFehlgeschlagen(null);
    letzteOptionenRef.current = { materialien, basis };
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

    try {
      await fetchEventSource(ASSISTENT_ENDPOINT, {
        method: 'POST',
        signal: ctrl.signal,
        openWhenHidden: true,
        headers: await assistentHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          modus: 'struktur',
          nachricht: text,
          schritte: basis || vorschlag || [],
          materialien,
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
            if (Array.isArray(d.schritte) && d.schritte.length) setVorschlag(d.schritte);
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
  }, [busy, verlauf, vorschlag, kontext]);

  /** Die zuletzt gescheiterte Nachricht erneut schicken. */
  const nochmalVersuchen = useCallback(() => {
    if (fehlgeschlagen) senden(fehlgeschlagen, letzteOptionenRef.current);
  }, [fehlgeschlagen, senden]);

  return {
    verlauf,
    teilAntwort,
    vorschlag,
    busy,
    fehler,
    fehlgeschlagen,
    nochmalVersuchen,
    warnungen,
    senden,
    abbrechen,
    zuruecksetzen,
    setVorschlag,
  };
}