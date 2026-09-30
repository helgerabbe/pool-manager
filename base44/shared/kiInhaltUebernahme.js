/**
 * shared/kiInhaltUebernahme.js
 *
 * KI-Inhalte aus der MBK-Revision übernehmen (2026-09-30).
 *
 * Überarbeitet der Bau einen KI-Schülerinhalt (Sektoreinführung, Kompaktwissen,
 * Onboarding), legt er die neue Fassung in
 *   kurse/<slug>/ki-inhalte/<YYYY-MM-DD>.json   (Format 'ki-inhalte-1')
 * ab. Der gebaute Kurs selbst (build/) ist nicht eingecheckt — deshalb diese
 * eigene Datei. Format: src/docs/mbk-ki-inhalte-format.md
 *
 * Aus jedem Eintrag entsteht beim Abholen ein ImportAuftrag
 * 'ki_inhalt_uebernehmen'. Erst die Freigabe im Import-Center liest die Datei
 * erneut und überschreibt den Inhalt (wendeKiInhaltAn).
 */

export const KI_INHALTE_FORMAT = 'ki-inhalte-1';

/** Welche Bausteine übernommen werden dürfen — und wohin sie geschrieben werden. */
export const KI_BAUSTEINE = {
  sys_themenfeld_intro: { label: 'Einführung in den Sektor', ablage: 'pfad_instanz' },
  kompaktwissen: { label: 'Kompaktwissen', ablage: 'aktivitaet' },
  onboarding_einfuehrung: { label: 'Onboarding: Einführung', ablage: 'onboarding', key: 'einfuehrung' },
  onboarding_fragenblock: { label: 'Onboarding: Fragenblock', ablage: 'onboarding', key: 'fragenblock' },
  onboarding_einstiegsdiagnose: { label: 'Onboarding: Einstiegsdiagnose', ablage: 'onboarding', key: 'einstiegsdiagnose' },
  onboarding_lerntyp_diagnose: { label: 'Onboarding: Lerntyp-Diagnose', ablage: 'onboarding', key: 'lerntyp_diagnose' },
};

export const getKiInhalteOrdner = (slug) => `kurse/${slug}/ki-inhalte`;

/** Liest eine ki-inhalte-Datei. Einträge ohne bekannten Baustein oder ohne Inhalt fallen raus. */
export function parseKiInhalte(rohText) {
  const daten = JSON.parse(rohText);
  const eintraege = (Array.isArray(daten?.inhalte) ? daten.inhalte : [])
    .filter((e) => e && KI_BAUSTEINE[e.baustein_id] && e.inhalt && typeof e.inhalt === 'object')
    .map((e, i) => ({
      id: String(e.id || `${e.baustein_id}:${e.lerntyp || ''}:${e.instance_id || e.aktivitaet_id || ''}:${i}`),
      baustein_id: e.baustein_id,
      lerntyp: e.lerntyp || '',
      instance_id: e.instance_id || '',
      themenfeld_id: e.themenfeld_id || '',
      aktivitaet_id: e.aktivitaet_id || '',
      hinweis: String(e.hinweis || '').slice(0, 900),
      inhalt: e.inhalt,
    }));
  return { erzeugt_am: daten?.erzeugt_am || null, eintraege };
}

/** Schreibt den übernommenen Inhalt an seine Ablage. Liefert einen Protokolleintrag. */
export async function wendeKiInhaltAn(base44, einheit, eintrag, userEmail) {
  const db = base44.asServiceRole.entities;
  const jetzt = new Date().toISOString();
  const def = KI_BAUSTEINE[eintrag.baustein_id];
  const quelle = `mbk_uebernahme:${userEmail}`;

  if (def.ablage === 'pfad_instanz') {
    if (!eintrag.lerntyp || !eintrag.instance_id) throw new Error('Lerntyp und instance_id fehlen im MBK-Eintrag.');
    const daten = {
      einheit_id: einheit.id,
      geltungsbereich: 'pfad_instanz',
      lerntyp: eintrag.lerntyp,
      instance_id: eintrag.instance_id,
      baustein_id: eintrag.baustein_id,
      themenfeld_id: eintrag.themenfeld_id || undefined,
      inhalt: eintrag.inhalt,
      generiert_am: jetzt,
      generiert_von: quelle,
      gesichtet_am: null,
      gesichtet_von: '',
    };
    const alt = await db.SchuelerInhaltSnapshot.filter({
      einheit_id: einheit.id, lerntyp: eintrag.lerntyp, instance_id: eintrag.instance_id, baustein_id: eintrag.baustein_id,
    });
    const rec = alt?.[0] ? await db.SchuelerInhaltSnapshot.update(alt[0].id, daten) : await db.SchuelerInhaltSnapshot.create(daten);
    return { schritt: `${def.label} überschrieben`, entity: 'SchuelerInhaltSnapshot', record_id: rec.id, hinweis: eintrag.instance_id };
  }

  if (def.ablage === 'onboarding') {
    const konf = { ...(einheit.onboarding_konfiguration || {}), [def.key]: eintrag.inhalt };
    await db.Einheiten.update(einheit.id, { onboarding_konfiguration: konf });
    // Falls ein einheits-globaler Snapshot existiert, zieht er mit.
    const alt = await db.SchuelerInhaltSnapshot.filter({ einheit_id: einheit.id, baustein_id: eintrag.baustein_id, geltungsbereich: 'einheit' });
    if (alt?.[0]) {
      await db.SchuelerInhaltSnapshot.update(alt[0].id, {
        inhalt: eintrag.inhalt, generiert_am: jetzt, generiert_von: quelle, gesichtet_am: null, gesichtet_von: '',
      });
    }
    return { schritt: `${def.label} überschrieben`, entity: 'Einheiten', record_id: einheit.id, hinweis: `onboarding_konfiguration.${def.key}` };
  }

  // Kompaktwissen: Inhalt liegt in den field_values der Aktivität.
  const akt = eintrag.aktivitaet_id ? await db.LernpaketPhaseAktivitaet.get(eintrag.aktivitaet_id).catch(() => null) : null;
  if (!akt) throw new Error('Die Kompaktwissen-Aktivität aus dem MBK-Eintrag wurde nicht gefunden.');
  await db.LernpaketPhaseAktivitaet.update(akt.id, {
    field_values: { ...(akt.field_values || {}), ...eintrag.inhalt },
    sync_status: akt.sync_status === 'synced' ? 'modified' : akt.sync_status || 'new',
  });
  return { schritt: `${def.label} überschrieben`, entity: 'LernpaketPhaseAktivitaet', record_id: akt.id, hinweis: '' };
}