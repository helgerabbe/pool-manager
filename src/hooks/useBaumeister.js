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
  const [luecken, setLuecken] = useState('');

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

  // Prüfung meldet leere Pflichtfelder: den Bauer gezielt nachfüllen lassen.
  const lueckenFuellen = () => {
    const zusatz = `Die Übernahme scheitert, weil diese Pflichtfelder leer oder ungültig sind: ${luecken}. Fülle sie passend zum Inhalt der Aufgabe sinnvoll aus. Alles andere bleibt unverändert.`;
    setLuecken('');
    bauen(stelle, zusatz);
  };

  const bauen = (ziel, zusatz, text = hinweis) => lauf('bauen', async () => {
    const res = await base44.functions.invoke('baumeisterAenderungBauen', {
      einheit_id: einheitId, ref: ziel.ref, hinweis: text, zusatz: zusatz || undefined,
      basis: zusatz ? vorschlag?.neu : undefined,
    });
    setStelle(res.data.stelle || ziel);
    setVorschlag((alt) => ({ ...res.data, alt: zusatz && alt ? alt.alt : res.data.alt }));
    setPhase('vergleich');
  }, vorschlag ? 'vergleich' : suche ? 'auswahl' : 'eingabe');

  // Aus einem Prüfbefund mit bekannter Stelle: Suche überspringen.
  const direktBauen = (ref, text) => { setHinweis(text); bauen({ ref }, undefined, text); };

  // Sperre JETZT prüfen (nicht nur beim Bauen): Ein Kollege könnte die
  // Stelle inzwischen geöffnet haben — seine Arbeit darf nicht überschrieben werden.
  const pruefeSperre = async () => {
    if (stelle.art === 'neu') return;
    const ich = (await base44.auth.me())?.email;
    const frisch = stelle.art === 'aktivitaet'
      ? await base44.entities.Lernpakete.get(stelle.lernpaket_id)
      : await base44.entities.AllgemeineAufgabe.get(stelle.ziel_id);
    const wer = stelle.art === 'aktivitaet'
      ? (frisch?.is_locked ? frisch.locked_by_email : null)
      : frisch?.locked_by;
    const wann = frisch?.locked_at;
    const aktiv = wer && wann && Date.now() - new Date(wann).getTime() < 30 * 60 * 1000;
    if (aktiv && wer !== ich) {
      throw new Error(`Achtung: ${wer} bearbeitet diese Stelle gerade. Ich ändere nichts, damit die Arbeit nicht überschrieben wird. Versuch es später noch einmal.`);
    }
  };

  const uebernehmen = () => lauf('ausfuehren', async () => {
    await pruefeSperre();
    if (stelle.art === 'aufgabe') {
      // Freigabe bleibt bestehen; die Änderung muss aber neu gebaut werden.
      await base44.entities.AllgemeineAufgabe.update(stelle.ziel_id, {
        ...vorschlag.neu,
        ...(stelle.freigegeben ? { sync_status: 'modified' } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ['workspace-data', einheitId] });
      setPhase('fertig');
      return;
    }
    const offen = stelle.art === 'offen';
    const auftrag = stelle.art === 'sequenz'
      ? { auftrags_art: 'schritt_entfernen', parameter: vorschlag.entfernen }
      : stelle.art === 'neu'
        ? { auftrags_art: 'offene_aufgabe_anlegen', parameter: { titel: vorschlag.titel, fragment: vorschlag.neu } }
        : offen
          ? { auftrags_art: 'offene_aufgabe_html_ersetzen', parameter: { fragment: vorschlag.neu, schritt_id: stelle.schritt_id, begruendung: vorschlag.aenderung } }
          : { auftrags_art: 'aktivitaet_aendern', parameter: { field_values: vorschlag.neu } };
    const eingang = await base44.functions.invoke('pruefeImportAuftrag', {
      ...auftrag,
      titel: `Baumeister: ${stelle.art === 'neu' ? vorschlag.titel : stelle.titel}`,
      ziel_id: stelle.ziel_id,
    });
    if (!eingang.data?.ausfuehrbar) {
      const gruende = (eingang.data?.pruefergebnis || []).map((b) => `${b.label}: ${b.reason}`).join(' · ');
      setLuecken(gruende);
      throw new Error(`Der Vorschlag ist noch nicht vollständig — ${gruende}`);
    }
    await base44.functions.invoke('fuehreImportAuftragAus', { auftrag_id: eingang.data.auftrag.id });
    await queryClient.invalidateQueries({ queryKey: ['workspace-data', einheitId] });
    setPhase('fertig');
  }, 'vergleich');

  const neuStarten = () => {
    setLuecken(''); setPhase('eingabe'); setHinweis(''); setSuche(null); setStelle(null); setVorschlag(null); setFehler('');
  };

  return { phase, setPhase, hinweis, setHinweis, suche, stelle, vorschlag, fehler, luecken, lueckenFuellen, suchen, bauen, direktBauen, uebernehmen, neuStarten };
}