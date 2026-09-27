/**
 * shared/baumeisterStellen.js
 *
 * Baumeister, Etappe 1: Die bearbeitbaren STELLEN einer Einheit als flache
 * Liste. Eine Stelle ist genau das, was ein Auftrag des Import-Centers
 * verändern kann:
 *   - 'aktivitaet' → LernpaketPhaseAktivitaet (Auftrag aktivitaet_aendern)
 *   - 'offen'      → offener Schritt einer Sequenzaufgabe (offene_aufgabe_html_ersetzen)
 *
 * Freigegebene Lernpakete/Aufgaben und Grabsteine werden bewusst ausgelassen:
 * Der Baumeister soll nicht an geschützten Inhalten vorbeiarbeiten.
 * `roh` enthält den vollen Inhalt und verlässt den Server nur beim Builder.
 */

const PHASEN_LABEL = { Input: 'Erarbeiten', 'Übung': 'Üben', Abschluss: 'Abschluss' };

function textAus(wert) {
  if (wert === null || wert === undefined) return '';
  if (typeof wert === 'string') return wert;
  if (typeof wert === 'number' || typeof wert === 'boolean') return String(wert);
  if (Array.isArray(wert)) return wert.map(textAus).filter(Boolean).join(' | ');
  if (typeof wert === 'object') return Object.values(wert).map(textAus).filter(Boolean).join(' | ');
  return '';
}

export function htmlZuText(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const istFreigegeben = (d) => d?.content_status === 'approved' && !!d?.released_at;

export async function ladeStellen(base44, einheitId) {
  const sr = base44.asServiceRole.entities;
  const [themenfelder, lernpakete, katalog, aufgaben] = await Promise.all([
    sr.Themenfeld.filter({ einheit_id: einheitId }),
    sr.Lernpakete.filter({ einheit_id: einheitId }),
    sr.AktivitaetenKatalog.list(),
    sr.AllgemeineAufgabe.filter({ einheit_id: einheitId }),
  ]);
  const tfTitel = new Map((themenfelder || []).map((t) => [t.id, t.titel]));
  const katalogById = new Map((katalog || []).map((k) => [k.id, k]));
  const pakete = (lernpakete || []).filter((lp) => lp.sync_status !== 'to_delete' && !istFreigegeben(lp));

  const aktListen = await Promise.all(
    pakete.map((lp) => sr.LernpaketPhaseAktivitaet.filter({ lernpaket_id: lp.id }))
  );

  const stellen = [];
  pakete.forEach((lp, i) => {
    (aktListen[i] || [])
      .filter((a) => a.sync_status !== 'to_delete')
      .forEach((a) => {
        const k = katalogById.get(a.aktivitaet_id);
        stellen.push({
          ref: `akt:${a.id}`,
          art: 'aktivitaet',
          ziel_id: a.id,
          titel: k?.name || 'Aktivität',
          ort: [tfTitel.get(lp.themenfeld_id), `Lernpaket „${lp.titel_des_pakets}"`, PHASEN_LABEL[a.phase] || a.phase]
            .filter(Boolean)
            .join(' · '),
          text: textAus(a.field_values || {}),
          roh: { field_values: a.field_values || {}, form_schema: k?.form_schema || [] },
        });
      });
  });

  (aufgaben || [])
    .filter((a) => a.aufgaben_modus === 'sequenz' && a.sync_status !== 'to_delete' && !istFreigegeben(a))
    .forEach((a) => {
      (Array.isArray(a.sequenz_schritte) ? a.sequenz_schritte : [])
        .filter((s) => s?.typ === 'offen' && s?.offen?.fragment)
        .forEach((s) => {
          stellen.push({
            ref: `off:${a.id}:${s.id}`,
            art: 'offen',
            ziel_id: a.id,
            schritt_id: s.id,
            titel: s.titel || a.titel || 'Offene Aufgabe',
            ort: [tfTitel.get(a.themenfeld_id), `Aufgabe „${a.titel || 'ohne Titel'}"`].filter(Boolean).join(' · '),
            text: htmlZuText(s.offen.fragment),
            roh: { fragment: s.offen.fragment },
          });
        });
    });

  return stellen;
}

/** Öffentliche Sicht einer Stelle — ohne den vollen Inhalt. */
export function stelleOhneRoh(s) {
  const { roh: _roh, text: _text, ...rest } = s;
  return rest;
}