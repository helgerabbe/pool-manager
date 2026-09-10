/**
 * lib/brianFelder.js
 *
 * Single Source of Truth für die vier Brian.study-Übergabefelder.
 *
 * Hintergrund: Für Brian.study gibt es KEINE API — alle Brian-Dialoge werden
 * vom MBK-Team händisch angelegt. Grundlage dafür sind ausschließlich diese
 * vier Felder, die im Export-Payload (Payload 3, `brian_dialog`) mitgeliefert
 * werden. Eine KI kann sie NICHT nachträglich erfinden, deshalb gilt:
 * Eine Aufgabe mit Brian-Dialog ist erst vollständig, wenn alle vier
 * Felder gefüllt sind.
 *
 * Reine Funktionen, keine I/O.
 */

/**
 * Abstufung (2026-09-10, MBK-Rückmeldung): Nur zwei der vier Felder halten die
 * Aufgabe auf. Dialogname und Anweisung für Lernende kann niemand außer der
 * Lehrkraft schreiben — ohne sie steht der Dialog nicht. Interne Anweisung und
 * Abbruchbedingung ergänzt der Bau notfalls selbst, deshalb sind sie nur noch
 * ein Hinweis und blockieren die Vollständigkeit nicht mehr.
 */
export const BRIAN_FELDER = [
  { key: 'brian_dialog_name', schritt_key: 'dialog_name', label: 'Dialogname', blockiert: true },
  { key: 'brian_learner_instruction', schritt_key: 'learner_instruction', label: 'Anweisung für Lernende', blockiert: true },
  { key: 'brian_system_instruction', schritt_key: 'system_instruction', label: 'Interne Anweisung für den Chatbot', blockiert: false },
  { key: 'brian_completion_rule', schritt_key: 'completion_rule', label: 'Abbruchbedingung', blockiert: false },
];

/**
 * Die Brian-Schritte einer Aufgabensequenz. Bei Aufgaben im Modus 'sequenz'
 * liegen die Übergabefelder NICHT an der Aufgabe, sondern an jedem
 * Brian-Schritt (Brian arbeitet pro Dialog) — genau daran ging die Prüfung
 * bisher vorbei: Sie las die leeren brian_*-Felder der Aufgabe und meldete
 * gefüllte Sequenzen als unvollständig.
 */
function brianSchritte(aufgabe) {
  if (aufgabe?.aufgaben_modus !== 'sequenz') return [];
  return (aufgabe.sequenz_schritte || []).filter((s) => s?.typ === 'brian');
}

/**
 * Aufgaben-Typen, die KEINEN eigenen Brian-Dialog haben: reine Container,
 * die nur auf andere Inhalte verweisen bzw. externe HTML-Seiten einbetten.
 */
const CONTAINER_TYPEN = new Set([
  'buendel',
  'auswahl_buendel',
  'projekt_anker',
  'externe_html_seite',
  // Handlungsaufgaben (2026-09-09): Sie werden an echtem Material bearbeitet
  // (Arbeitsheft, Buch) und schülerseitig nur bestätigt — es gibt kein
  // KI-Gespräch. Vorher meldete die Prüfung hier vier fehlende Brian-Felder.
  'handlung',
]);

/**
 * True, wenn diese AllgemeineAufgabe (Ebene 2 oder 3) einen Brian-Dialog braucht.
 *
 * Regel (2026-09-10, nach MBK-Rückmeldung „Prüfliste schrumpfen"): Brian ist
 * nur dort vorgesehen, wo er tatsächlich angelegt ist — bei Sequenzen ein
 * Brian-Schritt, bei Einzelaufgaben mindestens ein gefülltes Brian-Feld.
 * Vorher galt jede Einzelaufgabe vom Typ 'inhalt' pauschal als Brian-Aufgabe
 * und meldete vier fehlende Felder, obwohl nie ein Dialog geplant war (84
 * Fehlmeldungen über alle Kurse). Einzelaufgaben sind Altbestand — Neues
 * entsteht nur noch als Sequenz. Dieselbe Regel gilt im Export-Payload
 * (`brian_dialog` in src/lib/mbkAirGapPayloads.js), damit Prüfung und
 * Kursbau dieselben Aufgaben als Brian-Aufgaben sehen.
 */
export function istBrianAufgabe(aufgabe) {
  if (!aufgabe) return false;
  if (CONTAINER_TYPEN.has(aufgabe.aufgaben_typ || 'inhalt')) return false;
  if (aufgabe.aufgaben_modus === 'sequenz') return brianSchritte(aufgabe).length > 0;
  return BRIAN_FELDER.some((f) => String(aufgabe[f.key] || '').trim() !== '')
    || String(aufgabe.brian_dialog_id || '').trim() !== ''
    || String(aufgabe.brian_url || '').trim() !== '';
}

/**
 * Liste der noch leeren Brian-Felder (jeweils { key, label, blockiert }).
 * `blockiert: true` = hält die Aufgabe auf, `false` = reiner Hinweis.
 */
export function fehlendeBrianFelder(aufgabe) {
  const schritte = brianSchritte(aufgabe);
  if (schritte.length > 0) {
    // Ein Gespräch ohne Feld genügt für die Meldung; das Label nennt dann den
    // Schritt, damit die Lehrkraft weiß, welches Gespräch gemeint ist.
    const fehlend = [];
    schritte.forEach((schritt, index) => {
      const name = schritt.titel || `Gespräch ${index + 1}`;
      BRIAN_FELDER.forEach((f) => {
        if (String(schritt.brian?.[f.schritt_key] || '').trim() === '') {
          fehlend.push({
            key: `${schritt.id || index}:${f.schritt_key}`,
            label: `${name}: ${f.label}`,
            blockiert: f.blockiert,
          });
        }
      });
    });
    return fehlend;
  }
  if (aufgabe?.aufgaben_modus === 'sequenz') return [];
  return BRIAN_FELDER.filter((f) => String(aufgabe?.[f.key] || '').trim() === '');
}

/** True, wenn kein BLOCKIERENDES Brian-Feld fehlt (bzw. keins gebraucht wird). */
export function hatVollstaendigeBrianFelder(aufgabe) {
  if (!istBrianAufgabe(aufgabe)) return true;
  return fehlendeBrianFelder(aufgabe).every((f) => f.blockiert !== true);
}