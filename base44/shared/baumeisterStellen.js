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

const istProjekt = (a) => a.anforderungsebene === '3 - Projekt';
const istFreigegeben = (d) => d?.content_status === 'approved' && !!d?.released_at;
// Bearbeitungssperre eines Kollegen: gilt 30 Minuten ab dem letzten Setzen.
const SPERR_DAUER_MS = 30 * 60 * 1000;
export const sperreVon = (wer, wann) =>
  wer && wann && Date.now() - new Date(wann).getTime() < SPERR_DAUER_MS ? wer : null;

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
  const pakete = (lernpakete || []).filter((lp) => lp.sync_status !== 'to_delete');

  const aktListen = await Promise.all(
    pakete.map((lp) => sr.LernpaketPhaseAktivitaet.filter({ lernpaket_id: lp.id }))
  );

  const stellen = [];
  pakete.forEach((lp, i) => {
    const aktive = (aktListen[i] || [])
      .filter((a) => a.sync_status !== 'to_delete')
      .sort((x, y) => (x.reihenfolge || 0) - (y.reihenfolge || 0));
    aktive.forEach((a) => {
        const k = katalogById.get(a.aktivitaet_id);
        stellen.push({
          ref: `akt:${a.id}`,
          art: 'aktivitaet',
          ziel_id: a.id,
          lernpaket_id: lp.id,
          freigegeben: istFreigegeben(lp) || istFreigegeben(a),
          gesperrt_von: lp.is_locked ? sperreVon(lp.locked_by_email, lp.locked_at) : null,
          titel: k?.name || 'Aktivität',
          ort: [
            tfTitel.get(lp.themenfeld_id) && `Themenfeld „${tfTitel.get(lp.themenfeld_id)}"`,
            `Lernpaket „${lp.titel_des_pakets}"`,
            `Phase ${PHASEN_LABEL[a.phase] || a.phase}`,
            `${aktive.filter((x) => x.phase === a.phase).indexOf(a) + 1}. Aktivität „${k?.name || 'Aktivität'}"`,
          ]
            .filter(Boolean)
            .join(' · '),
          text: textAus(a.field_values || {}),
          roh: {
            field_values: a.field_values || {},
            form_schema: k?.form_schema || [],
            phase: a.phase,
            position: aktive.filter((x) => x.phase === a.phase).indexOf(a),
          },
        });
      });
  });

  (aufgaben || [])
    .filter((a) => a.aufgaben_modus === 'sequenz' && a.sync_status !== 'to_delete')
    .forEach((a) => {
      (Array.isArray(a.sequenz_schritte) ? a.sequenz_schritte : [])
        .filter((s) => s?.typ === 'offen' && s?.offen?.fragment)
        .forEach((s) => {
          stellen.push({
            ref: `off:${a.id}:${s.id}`,
            art: 'offen',
            ziel_id: a.id,
            schritt_id: s.id,
            freigegeben: istFreigegeben(a),
            gesperrt_von: sperreVon(a.locked_by, a.locked_at),
            titel: s.titel || a.titel || 'Offene Aufgabe',
            projekt: istProjekt(a),
            ort: [tfTitel.get(a.themenfeld_id), `Aufgabe „${a.titel || 'ohne Titel'}"`, `Schritt „${s.titel || 'offene Aufgabe'}"`].filter(Boolean).join(' · '),
            text: htmlZuText(s.offen.fragment),
            roh: { fragment: s.offen.fragment },
          });
        });
    });

  // Allgemeine Aufgaben und Projektaufgaben: die Textfelder an der Aufgabe selbst.
  (aufgaben || [])
    .filter((a) => a.sync_status !== 'to_delete')
    .forEach((a) => {
      const felder = Object.fromEntries(AUFGABE_FELDER.map((f) => [f.field_name, a[f.field_name] || '']));
      stellen.push({
        ref: `auf:${a.id}`,
        art: 'aufgabe',
        ziel_id: a.id,
        freigegeben: istFreigegeben(a),
        gesperrt_von: sperreVon(a.locked_by, a.locked_at),
        titel: a.titel || 'Aufgabe ohne Titel',
        projekt: istProjekt(a),
        ort: [
          tfTitel.get(a.themenfeld_id) && `Themenfeld „${tfTitel.get(a.themenfeld_id)}"`,
          a.anforderungsebene === '3 - Projekt' || a.aufgabentyp_projekt ? 'Projektaufgaben' : 'Allgemeine Aufgaben',
        ].filter(Boolean).join(' · '),
        text: textAus(felder),
        roh: { field_values: felder, form_schema: AUFGABE_FELDER },
      });
    });

  // Schrittfolgen als Ganzes: hier kann ein Schritt ENTFERNT werden (schritt_entfernen).
  (aufgaben || [])
    .filter((a) => a.aufgaben_modus === 'sequenz' && a.sync_status !== 'to_delete')
    .forEach((a) => {
      const schritte = [...(Array.isArray(a.sequenz_schritte) ? a.sequenz_schritte : [])]
        .sort((x, y) => (x.reihenfolge ?? 0) - (y.reihenfolge ?? 0))
        .map((s, i) => ({
          id: s.id,
          nr: i + 1,
          titel: s.titel || s.typ,
          text: (s.typ === 'offen' ? htmlZuText(s.offen?.fragment) : textAus(s[s.typ] || s.field_values || {})).slice(0, 400),
        }));
      if (schritte.length < 2) return;
      stellen.push({
        ref: `seq:${a.id}`,
        art: 'sequenz',
        ziel_id: a.id,
        freigegeben: istFreigegeben(a),
        gesperrt_von: sperreVon(a.locked_by, a.locked_at),
        titel: `Schrittfolge „${a.titel || 'ohne Titel'}" (Schritt entfernen)`,
        projekt: istProjekt(a),
        ort: [tfTitel.get(a.themenfeld_id), `Aufgabe „${a.titel || 'ohne Titel'}"`].filter(Boolean).join(' · '),
        text: schritte.map((s) => `Schritt ${s.nr}: ${s.titel} – ${s.text}`).join('\n'),
        roh: { schritte },
      });
    });

  // Platzhalter für eine GANZ NEUE offene Aufgabe in der Einheit (offene_aufgabe_anlegen).
  stellen.push({
    ref: `neu:${einheitId}`,
    art: 'neu',
    ziel_id: einheitId,
    freigegeben: false,
    gesperrt_von: null,
    titel: 'Neue Aufgabe anlegen',
    ort: 'Einheit · Allgemeine Aufgaben',
    text: 'Nur wählen, wenn eine Aufgabe komplett NEU entstehen soll, die es noch nicht gibt.',
    roh: {},
  });

  return stellen;
}

/** Alt/Neu-Ansicht einer Schrittfolge: ein Feld je Schritt. */
export function schritteAlsFelder(schritte, ohneId) {
  return Object.fromEntries(
    schritte.filter((s) => s.id !== ohneId).map((s) => [`Schritt ${s.nr}: ${s.titel}`, s.text])
  );
}

/** Bearbeitbare Textfelder einer allgemeinen Aufgabe / Projektaufgabe. */
export const AUFGABE_FELDER = [
  { field_name: 'aufgabenstellung', type: 'textarea', label: 'Aufgabenstellung' },
  { field_name: 'musterloesung', type: 'textarea', label: 'Musterlösung' },
  { field_name: 'erwartungshorizont', type: 'textarea', label: 'Erwartungshorizont' },
  { field_name: 'projekt_ablauf_beschreibung', type: 'textarea', label: 'Geplanter Projektablauf (für die KI)' },
  { field_name: 'brian_learner_instruction', type: 'textarea', label: 'Tutor: Anweisung für Lernende' },
  { field_name: 'brian_system_instruction', type: 'textarea', label: 'Tutor: interne Anleitung (Rolle, Aufgabe, Grenzen)' },
  { field_name: 'brian_completion_rule', type: 'textarea', label: 'Tutor: Abschlussregel' },
];

/** Öffentliche Sicht einer Stelle — ohne den vollen Inhalt. */
export function stelleOhneRoh(s) {
  const { roh: _roh, text: _text, ...rest } = s;
  return rest;
}