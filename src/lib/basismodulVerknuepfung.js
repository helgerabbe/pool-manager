/**
 * basismodulVerknuepfung.js
 *
 * Zentrale Logik für Basismodul-Verknüpfungen (Basis-Vorwissen):
 * Lernziele eines Basismoduls (= Einheit mit ist_basismodul=true) werden
 * über AllgemeineAufgabeBasisLernzielMapping als Vorwissen in Aufgaben
 * anderer Einheiten verlinkt.
 *
 * Wird verwendet von:
 * - Lösch-Wächter (BasismodulCard, EinheitUebersichtTab, LernzielService)
 * - Verwendungs-Übersicht in Tab 1 der Basismodul-Ansicht
 */
import { base44 } from '@/api/base44Client';

/**
 * Alle Lernziel-IDs eines Basismoduls (über dessen Lernpakete).
 */
export async function getBasismodulLernzielIds(einheitId) {
  const pakete = await base44.entities.Lernpakete.filter({ einheit_id: einheitId });
  if (pakete.length === 0) return [];
  const zielePages = await Promise.all(
    pakete.map((p) => base44.entities.Lernziele.filter({ lernpaket_id: p.id }))
  );
  return zielePages.flat().map((z) => z.id);
}

/**
 * Löst für gegebene Lernziel-IDs alle Basis-Vorwissen-Verknüpfungen auf und
 * gruppiert sie nach Einheit:
 * [{ einheitId, einheitTitel, aufgaben: [{ id, titel, lernziele: [text] }] }]
 *
 * Verknüpfungen, deren Aufgabe nicht mehr existiert (verwaiste Mappings),
 * werden still ignoriert.
 */
export async function getVerwendungenFuerLernziele(lernzielIds) {
  if (!lernzielIds || lernzielIds.length === 0) return [];

  const mappings = (
    await Promise.all(
      lernzielIds.map((id) =>
        base44.entities.AllgemeineAufgabeBasisLernzielMapping.filter({ basislernziel_id: id })
      )
    )
  ).flat();
  if (mappings.length === 0) return [];

  const lernzielIdSet = [...new Set(mappings.map((m) => m.basislernziel_id))];
  const aufgabeIdSet = [...new Set(mappings.map((m) => m.aufgabe_id))];

  const [lernziele, aufgaben] = await Promise.all([
    Promise.all(lernzielIdSet.map((id) => base44.entities.Lernziele.filter({ id }))).then((p) => p.flat()),
    Promise.all(aufgabeIdSet.map((id) => base44.entities.AllgemeineAufgabe.filter({ id }))).then((p) => p.flat()),
  ]);

  const einheitIdSet = [...new Set(aufgaben.map((a) => a.einheit_id).filter(Boolean))];
  const einheiten = (
    await Promise.all(einheitIdSet.map((id) => base44.entities.Einheiten.filter({ id })))
  ).flat();

  const byEinheit = new Map();
  for (const m of mappings) {
    const aufgabe = aufgaben.find((a) => a.id === m.aufgabe_id);
    if (!aufgabe) continue; // verwaistes Mapping → ignorieren
    const einheit = einheiten.find((e) => e.id === aufgabe.einheit_id);
    const key = einheit?.id || 'unbekannt';
    if (!byEinheit.has(key)) {
      byEinheit.set(key, {
        einheitId: einheit?.id || null,
        einheitTitel: einheit?.titel_der_einheit || 'Unbekannte Einheit',
        aufgaben: [],
      });
    }
    const gruppe = byEinheit.get(key);
    let aufgabeEintrag = gruppe.aufgaben.find((x) => x.id === aufgabe.id);
    if (!aufgabeEintrag) {
      aufgabeEintrag = { id: aufgabe.id, titel: aufgabe.titel || 'Aufgabe ohne Titel', lernziele: [] };
      gruppe.aufgaben.push(aufgabeEintrag);
    }
    const lz = lernziele.find((l) => l.id === m.basislernziel_id);
    const text = lz?.formulierung_fachsprache || lz?.text;
    if (text && !aufgabeEintrag.lernziele.includes(text)) {
      aufgabeEintrag.lernziele.push(text);
    }
  }
  return [...byEinheit.values()];
}

/**
 * Komplette Verwendungs-Übersicht eines Basismoduls (gruppiert nach Einheit).
 * Leeres Array = nirgends verlinkt → Basismodul darf gelöscht werden.
 */
export async function getBasismodulVerwendung(einheitId) {
  const lernzielIds = await getBasismodulLernzielIds(einheitId);
  return getVerwendungenFuerLernziele(lernzielIds);
}