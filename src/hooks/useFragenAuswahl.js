/**
 * useFragenAuswahl
 *
 * Auswahl-Verwaltung für generierte Onboarding-Fragen (Fragenblock und
 * Einstiegsdiagnose). Die KI liefert einen Vorrat, die Lehrkraft behält die
 * guten Fragen, verwirft die unpassenden und kann so oft nachgenerieren, wie
 * sie will — bereits ausgewählte Fragen bleiben dabei erhalten.
 *
 * Jede Frage trägt intern das Feld `_gewaehlt`; `gewaehlteFragen` gibt die
 * Auswahl ohne dieses Hilfsfeld zurück (das ist, was übernommen wird).
 */
import { useState, useCallback, useMemo } from 'react';

export default function useFragenAuswahl() {
  const [fragen, setFragen] = useState([]);

  const setzeFragen = useCallback((liste) => {
    setFragen((liste || []).map((f) => ({ ...f, _gewaehlt: true })));
  }, []);

  const ergaenze = useCallback((liste) => {
    setFragen((prev) => [
      ...prev.filter((f) => f._gewaehlt),
      ...(liste || []).map((f) => ({ ...f, _gewaehlt: true })),
    ]);
  }, []);

  const toggle = useCallback((index) => {
    setFragen((prev) => prev.map((f, i) => (i === index ? { ...f, _gewaehlt: !f._gewaehlt } : f)));
  }, []);

  const loesche = useCallback((index) => {
    setFragen((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const gewaehlteFragen = useMemo(
    () => fragen.filter((f) => f._gewaehlt).map(({ _gewaehlt, ...rest }) => rest),
    [fragen],
  );

  const fragenTexte = useMemo(() => fragen.map((f) => f.frage).filter(Boolean), [fragen]);

  return { fragen, setzeFragen, ergaenze, toggle, loesche, gewaehlteFragen, fragenTexte };
}