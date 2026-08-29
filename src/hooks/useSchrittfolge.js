import { useCallback, useEffect, useState } from 'react';
import {
  leererSchritt, neuNummerieren, schritteAusAufgabe, SCHRITT_STATUS,
} from '@/lib/schrittTypen';

/**
 * useSchrittfolge
 * ───────────────
 * Hält die Schrittfolge einer Aufgabe im Editor: anlegen, ändern, löschen,
 * umsortieren, auswählen.
 *
 * Bewusst ohne KI und ohne Netzwerk — reine Zustandslogik. Dadurch bleibt die
 * Werkstatt bedienbar, wenn der Assistent gerade nicht erreichbar ist, und
 * die Logik lässt sich ohne gerendertes Modal prüfen.
 *
 * Die Reihenfolge wird nach jeder Änderung neu durchnummeriert; die Auswahl
 * folgt dem verschobenen Schritt, damit die Lehrkraft den Faden nicht
 * verliert.
 */
export default function useSchrittfolge(initialAufgabe) {
  const [schritte, setSchritte] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dirty, setDirty] = useState(false);

  // Beim Öffnen (oder Wechsel der Aufgabe) aus dem Datensatz laden.
  useEffect(() => {
    const geladen = schritteAusAufgabe(initialAufgabe);
    setSchritte(geladen);
    setSelectedIndex(geladen.length > 0 ? 0 : -1);
    setDirty(false);
  }, [initialAufgabe]);

  /* Alle Änderungen rechnen mit dem aktuellen `schritte` und setzen den
     neuen Zustand direkt. Bewusst KEINE Updater-Funktionen mit einem
     setSelectedIndex darin: Updater müssen frei von Nebenwirkungen sein,
     React ruft sie unter Umständen mehrfach auf. Alle Aufrufer hier sind
     Ereignisbehandler, dort ist der Wert aus der Closure aktuell. */

  const hinzufuegen = useCallback((typ) => {
    const neu = neuNummerieren([...schritte, leererSchritt(typ, schritte.length)]);
    setSchritte(neu);
    setSelectedIndex(neu.length - 1);
    setDirty(true);
  }, [schritte]);

  /** Ersetzt einen Schritt vollständig. */
  const aendern = useCallback((index, neuerSchritt) => {
    setSchritte(schritte.map((s, i) => (i === index ? neuerSchritt : s)));
    setDirty(true);
  }, [schritte]);

  /** Ändert nur den gerade ausgewählten Schritt. */
  const aktuellenAendern = useCallback((neuerSchritt) => {
    setSchritte(schritte.map((s, i) => (i === selectedIndex ? neuerSchritt : s)));
    setDirty(true);
  }, [schritte, selectedIndex]);

  const loeschen = useCallback((index) => {
    const neu = neuNummerieren(schritte.filter((_, i) => i !== index));
    setSchritte(neu);
    if (neu.length === 0) setSelectedIndex(-1);
    else if (selectedIndex > index) setSelectedIndex(selectedIndex - 1);
    else setSelectedIndex(Math.min(selectedIndex, neu.length - 1));
    setDirty(true);
  }, [schritte, selectedIndex]);

  const verschieben = useCallback((von, nach) => {
    if (von === nach || von < 0 || nach < 0 || von >= schritte.length || nach >= schritte.length) return;
    const neu = [...schritte];
    const [bewegt] = neu.splice(von, 1);
    neu.splice(nach, 0, bewegt);
    setSchritte(neuNummerieren(neu));
    setSelectedIndex(nach);
    setDirty(true);
  }, [schritte]);

  const nachOben = useCallback((i) => verschieben(i, i - 1), [verschieben]);
  const nachUnten = useCallback((i) => verschieben(i, i + 1), [verschieben]);

  /**
   * Übernimmt einen im Gespräch gebauten Stand in den ausgewählten Schritt.
   * Setzt den Status auf 'uebernommen' — das ist die bewusste Bestätigung
   * der Lehrkraft, nicht ein Nebeneffekt des Bauens.
   */
  const fragmentUebernehmen = useCallback((index, fragment, snapshotHtml) => {
    setSchritte(schritte.map((s, i) => (i === index
      ? {
        ...s,
        status: SCHRITT_STATUS.UEBERNOMMEN,
        offen: {
          ...(s.offen || {}),
          fragment,
          snapshot_html: snapshotHtml,
          uebernommen_am: new Date().toISOString(),
        },
      }
      : s)));
    setDirty(true);
  }, [schritte]);

  /**
   * Ersetzt die ganze Folge — für den Strukturvorschlag des Assistenten.
   * Vorhandene Schritte bleiben erhalten, wenn `anhaengen` gesetzt ist.
   */
  const folgeSetzen = useCallback((neueSchritte, { anhaengen = false } = {}) => {
    const kombiniert = anhaengen ? [...schritte, ...neueSchritte] : neueSchritte;
    const nummeriert = neuNummerieren(kombiniert);
    setSchritte(nummeriert);
    setSelectedIndex(nummeriert.length > 0 ? (anhaengen ? schritte.length : 0) : -1);
    setDirty(true);
  }, [schritte]);

  return {
    schritte,
    selectedIndex,
    aktuellerSchritt: selectedIndex >= 0 ? schritte[selectedIndex] || null : null,
    dirty,
    setSelectedIndex,
    hinzufuegen,
    aendern,
    aktuellenAendern,
    loeschen,
    nachOben,
    nachUnten,
    verschieben,
    fragmentUebernehmen,
    folgeSetzen,
    alsGespeichertMarkieren: () => setDirty(false),
  };
}
