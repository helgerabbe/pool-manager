import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

const fehlerText = (e) => e?.response?.data?.error || e?.message || 'Unbekannter Fehler';

/**
 * Ablauf des Baumeisters (Etappe 1). Die Orchestrierung ist bewusst
 * deterministisch: Stelle finden → bestätigen → bauen → vergleichen →
 * über das Freigabe-Tor des Import-Centers ausführen.
 */
export function useBaumeister(einheitId) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState('eingabe');
  const [hinweis, setHinweis] = useState('');
  const [suche, setSuche] = useState(null);
  const [stelle, setStelle] = useState(null);
  const [vorschlag, setVorschlag] = useState(null);
  const [fehler, setFehler] = useState('');

  const lauf = async (ladePhase, fn, fallback) => {
    setFehler('');
    setPhase(ladePhase);
    try { await fn(); } catch (e) { setFehler(fehlerText(e)); setPhase(fallback); }
  };

  const suchen = () => lauf('suchen', async () => {
    const res = await base44.functions.invoke('baumeisterStelleFinden', { einheit_id: einheitId, hinweis });
    setSuche(res.data);
    setPhase('auswahl');
  }, 'eingabe');

  const bauen = (ziel, zusatz) => lauf('bauen', async () => {
    const res = await base44.functions.invoke('baumeisterAenderungBauen', {
      einheit_id: einheitId, ref: ziel.ref, hinweis, zusatz: zusatz || undefined,
      basis: zusatz ? vorschlag?.neu : undefined,
    });
    setStelle(ziel);
    setVorschlag((alt) => ({ ...res.data, alt: zusatz && alt ? alt.alt : res.data.alt }));
    setPhase('vergleich');
  }, vorschlag ? 'vergleich' : 'auswahl');

  const uebernehmen = () => lauf('ausfuehren', async () => {
    const offen = stelle.art === 'offen';
    const eingang = await base44.functions.invoke('pruefeImportAuftrag', {
      auftrags_art: offen ? 'offene_aufgabe_html_ersetzen' : 'aktivitaet_aendern',
      titel: `Baumeister: ${stelle.titel}`,
      ziel_id: stelle.ziel_id,
      parameter: offen
        ? { fragment: vorschlag.neu, schritt_id: stelle.schritt_id, begruendung: vorschlag.aenderung }
        : { field_values: vorschlag.neu },
    });
    if (!eingang.data?.ausfuehrbar) {
      const gruende = (eingang.data?.pruefergebnis || []).map((b) => `${b.label}: ${b.reason}`).join(' · ');
      throw new Error(`Der Vorschlag ist noch nicht vollständig — ${gruende}`);
    }
    await base44.functions.invoke('fuehreImportAuftragAus', { auftrag_id: eingang.data.auftrag.id });
    await queryClient.invalidateQueries({ queryKey: ['workspace-data', einheitId] });
    setPhase('fertig');
  }, 'vergleich');

  const neuStarten = () => {
    setPhase('eingabe'); setHinweis(''); setSuche(null); setStelle(null); setVorschlag(null); setFehler('');
  };

  return { phase, setPhase, hinweis, setHinweis, suche, stelle, vorschlag, fehler, suchen, bauen, uebernehmen, neuStarten };
}