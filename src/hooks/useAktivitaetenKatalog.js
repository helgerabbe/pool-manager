import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAktivitaetenKatalog } from '@/services/schueler/SchuelerDataService';

/**
 * useAktivitaetenKatalog
 * ──────────────────────
 * Lädt den Aktivitätenkatalog einmal und liefert ihn in drei Formen:
 *
 *   katalogMap    id → Record. Für Stellen, die zu einer gespeicherten
 *                 `aktivitaet_id` den Namen brauchen (z. B. um über
 *                 lib/aktivitaetSeitenMap die Schüler-Seite zu finden).
 *   katalogListe  alle aktiven Einträge, unverändert.
 *   auswahlListe  nach NAME dedupliziert, alphabetisch — für Auswahlfelder.
 *
 * Zur Deduplizierung: Der Katalog führt jede Aktivität einmal pro Lernpaket-
 * Phase (Input/Übung/Abschluss). Ein Schritt einer allgemeinen Aufgabe hat
 * aber keine Phase. Geprüft am 2026-08-29: Die Dubletten unterscheiden sich
 * ausschließlich im Feld `phase`, ihr `form_schema` ist identisch — die
 * Auswahl nach Namen ist deshalb verlustfrei. Bevorzugt wird die Variante
 * der Phase „Übung", sonst die erste gefundene.
 *
 * Der Katalog ändert sich selten, deshalb großzügig gecacht.
 *
 * ZUGRIFFSWEG (2026-09-17): Der Katalog wird über den SchuelerDataService
 * geladen, nicht direkt über die Entity. Grund: Schüler, die aus Moodle
 * kommen (LTI-Sitzung, kein Base44-Konto), dürfen die Entity nicht lesen —
 * der Aufruf lief leer, die Katalog-Schritte einer Aufgabensequenz fanden
 * keinen Namen und zeigten „kein Aufgabenformat ausgewählt". Der Service
 * wählt je Betrieb (Base44 / LTI / Supabase) den passenden Weg.
 */
export default function useAktivitaetenKatalog({ enabled = true } = {}) {
  const { data, isLoading } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => getAktivitaetenKatalog(),
    enabled,
    staleTime: 15 * 60 * 1000,
  });

  const katalogListe = useMemo(
    () => (data || []).filter((k) => k?.is_active !== false),
    [data],
  );

  const katalogMap = useMemo(() => {
    const map = {};
    (data || []).forEach((k) => { if (k?.id) map[k.id] = k; });
    return map;
  }, [data]);

  const auswahlListe = useMemo(() => {
    const beste = {};
    katalogListe.forEach((k) => {
      const vorhanden = beste[k.name];
      if (!vorhanden || (k.phase === 'Übung' && vorhanden.phase !== 'Übung')) {
        beste[k.name] = k;
      }
    });
    return Object.values(beste).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }, [katalogListe]);

  return { katalogMap, katalogListe, auswahlListe, isLoading };
}