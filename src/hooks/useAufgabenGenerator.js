import { useCallback, useRef, useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { ASSISTENT_ENDPOINT, assistentHeaders } from '@/lib/assistentEndpunkt';
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

export default function useAufgabenGenerator({ kontext = {}, startFragment = '' } = {}) {
  const [verlauf, setVerlauf] = useState([]);        // [{ rolle:'lehrkraft'|'ki', text }]
  const [staende, setStaende] = useState(
    startFragment ? [{ fragment: startFragment, label: 'Gespeicherter Stand', zeit: null }] : [],
  );
  const [index, setIndex] = useState(startFragment ? 0 : -1);
  const [teilAntwort, setTeilAntwort] = useState('');  // strömt während der Antwort
  // Baufortschritt in der stillen Codephase: { zeichen, sekunden } — kommt
  // alle zwei Sekunden vom Server und hält zugleich die Leitung offen.
  const [fortschritt, setFortschritt] = useState(null);
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
    setFortschritt(null);
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

  /**
   * `startFragmentUeberschreibung`: Ausgangsstand für DIESEN Auftrag, wenn er
   * nicht der aktuelle Stand sein soll — nötig beim Übernehmen einer Vorlage
   * aus der Aufgabengalerie: Dort wird der Stand im selben Wimpernschlag
   * gesetzt und gleich der Auftrag geschickt; ohne diesen Weg würde der noch
   * alte (leere) Stand mitgehen und die Vorlage wäre wirkungslos.
   */
  const senden = useCallback(async (nachricht, startFragmentUeberschreibung = null) => {
    const text = String(nachricht || '').trim();
    if (!text || busy) return;
    const basisFragment = startFragmentUeberschreibung ?? fragment;

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
    // Ein Ergebnis kam an? Ohne diese Merkung endete ein vorzeitig
    // abgeschnittener Strom (z. B. Zeitgrenze der Function) stillschweigend:
    // Das Gespräch hörte einfach auf, ohne Antwort und ohne Fehler.
    let hatErgebnis = false;
    // Kam ein ausdrücklicher Serverfehler? Dann darf ihn die allgemeine
    // „Verbindung abgerissen"-Meldung nicht überdecken — sonst sucht man an
    // der falschen Stelle.
    let hatServerFehler = false;

    try {
      await fetchEventSource(ASSISTENT_ENDPOINT, {
        method: 'POST',
        signal: ctrl.signal,
        openWhenHidden: true,
        headers: await assistentHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          nachricht: text,
          fragment: basisFragment,
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
          } else if (ev.event === 'fortschritt') {
            setFortschritt(JSON.parse(ev.data));
          } else if (ev.event === 'ergebnis') {
            const d = JSON.parse(ev.data);
            hatErgebnis = true;
            setVerlauf((v) => [...v, { rolle: 'ki', text: d.antwort || gesammelt || 'Fertig.' }]);
            setTeilAntwort('');
            setFortschritt(null);
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
            hatServerFehler = true;
            setFehler(`Beim Bauen ist ein Fehler aufgetreten: ${d.error || 'Unbekannter Fehler.'}`);
          }
        },
        onerror: (err) => {
          // Nicht automatisch neu verbinden — sonst läuft der Auftrag doppelt.
          throw err;
        },
      });

      // Strom zu Ende, aber kein Ergebnis: Die Verbindung ist mitten in der
      // Antwort abgerissen. Das muss die Lehrkraft erfahren — und der
      // bereits geschriebene Text bleibt sichtbar, damit nichts verpufft.
      if (!hatErgebnis && !ctrl.signal.aborted) {
        if (gesammelt.trim()) {
          setVerlauf((v) => [...v, { rolle: 'ki', text: gesammelt }]);
        }
        if (!hatServerFehler) {
          setFehler('Die Verbindung ist mitten in der Antwort abgerissen — die Aufgabe wurde nicht fertig gebaut. Versuchen Sie es noch einmal, am besten mit einem kleineren Auftrag.');
        }
        setFehlgeschlagen(text);
      }
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
      setFortschritt(null);
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
    fortschritt,
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