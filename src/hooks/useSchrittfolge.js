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

  const hinzufuegen = useCallback((typ) => {
    setSchritte((alt) => {
      const neu = [...alt, leererSchritt(typ, alt.length)];
      setSelectedIndex(neu.length - 1);
      return neuNummerieren(neu);
    });
    setDirty(true);
  }, []);

  /** Ersetzt einen Schritt vollständig. */
  const aendern = useCallback((index, neuerSchritt) => {
    setSchritte((alt) => alt.map((s, i) => (i === index ? neuerSchritt : s)));
    setDirty(true);
  }, []);

  /** Ändert nur den gerade ausgewählten Schritt. */
  const aktuellenAendern = useCallback((neuerSchritt) => {
    setSchritte((alt) => alt.map((s, i) => (i === selectedIndex ? neuerSchritt : s)));
    setDirty(true);
  }, [selectedIndex]);

  const loeschen = useCallback((index) => {
    setSchritte((alt) => {
      const neu = neuNummerieren(alt.filter((_, i) => i !== index));
      setSelectedIndex((sel) => {
        if (neu.length === 0) return -1;
        if (sel > index) return sel - 1;
        return Math.min(sel, neu.length - 1);
      });
      return neu;
    });
    setDirty(true);
  }, []);

  const verschieben = useCallback((von, nach) => {
    setSchritte((alt) => {
      if (von === nach || von < 0 || nach < 0 || von >= alt.length || nach >= alt.length) return alt;
      const neu = [...alt];
      const [bewegt] = neu.splice(von, 1);
      neu.splice(nach, 0, bewegt);
      setSelectedIndex(nach);
      return neuNummerieren(neu);
    });
    setDirty(true);
  }, []);

  const nachOben = useCallback((i) => verschieben(i, i - 1), [verschieben]);
  const nachUnten = useCallback((i) => verschieben(i, i + 1), [verschieben]);

  /**
   * Übernimmt einen im Gespräch gebauten Stand in den ausgewählten Schritt.
   * Setzt den Status auf 'uebernommen' — das ist die bewusste Bestätigung
   * der Lehrkraft, nicht ein Nebeneffekt des Bauens.
   */
  const fragmentUebernehmen = useCallback((index, fragment, snapshotHtml) => {
    setSchritte((alt) => alt.map((s, i) => (i === index
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
  }, []);

  /**
   * Ersetzt die ganze Folge — für den Strukturvorschlag des Assistenten.
   * Vorhandene Schritte bleiben erhalten, wenn `anhaengen` gesetzt ist.
   */
  const folgeSetzen = useCallback((neueSchritte, { anhaengen = false } = {}) => {
    setSchritte((alt) => {
      const kombiniert = anhaengen ? [...alt, ...neueSchritte] : neueSchritte;
      const nummeriert = neuNummerieren(kombiniert);
      setSelectedIndex(nummeriert.length > 0 ? (anhaengen ? alt.length : 0) : -1);
      return nummeriert;
    });
    setDirty(true);
  }, []);

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
