/**
 * lernpaketTestKontext.js
 * ───────────────────────
 * Sammelt den Inhalt eines Lernpakets als Klartext, damit die KI daraus einen
 * Fragen-Entwurf für den Abschlusstest schreiben kann: Titel, Kernbegriffe,
 * Lernziele und die Texte der enthaltenen Aktivitäten.
 */

import { base44 } from '@/api/base44Client';

/** Textliche Felder einer Aktivität, die inhaltlich etwas hergeben. */
const TEXT_FELDER = ['instruction', 'text', 'description', 'einleitung', 'aufgabenstellung'];

function aktivitaetText(fv = {}) {
  const teile = TEXT_FELDER.map((k) => fv[k]).filter((v) => typeof v === 'string' && v.trim());
  if (Array.isArray(fv.slides)) {
    fv.slides.forEach((s) => {
      Object.values(s?.slots || {}).forEach((v) => {
        if (typeof v === 'string' && v.trim()) teile.push(v.replace(/<[^>]+>/g, ' '));
      });
    });
  }
  return teile.join('\n').replace(/\s+/g, ' ').trim().slice(0, 900);
}

/** Gibt den Kontext als Klartext zurück — oder null, wenn keine ID vorliegt. */
export async function ladeLernpaketKontext(lernpaketId) {
  if (!lernpaketId) return null;

  const [paket, lernziele, aktivitaeten] = await Promise.all([
    base44.entities.Lernpakete.get(lernpaketId),
    base44.entities.Lernziele.filter({ lernpaket_id: lernpaketId }),
    base44.entities.LernpaketPhaseAktivitaet.filter({ lernpaket_id: lernpaketId }),
  ]);

  const zeilen = [`Titel: ${paket?.titel_des_pakets || '(ohne Titel)'}`];
  if (paket?.kernbegriffe?.length) zeilen.push(`Kernbegriffe: ${paket.kernbegriffe.join(', ')}`);

  if (lernziele?.length) {
    zeilen.push('', 'Lernziele:');
    lernziele.forEach((z) => {
      zeilen.push(`- ${z.schueler_uebersetzung || z.formulierung_fachsprache || ''}`.trim());
    });
  }

  const inhalte = (aktivitaeten || [])
    .map((a) => aktivitaetText(a.field_values))
    .filter(Boolean);
  if (inhalte.length) {
    zeilen.push('', 'Inhalte der Aktivitäten:');
    inhalte.forEach((t) => zeilen.push(`- ${t}`));
  }

  return zeilen.join('\n');
}