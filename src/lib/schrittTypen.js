/**
 * lib/schrittTypen.js — Single Source of Truth für die Schritttypen einer
 * allgemeinen Aufgabe.
 *
 * Konzept (2026-08-29): Eine allgemeine Aufgabe ist keine Aufgabe mit einem
 * Typ, sondern eine geordnete Folge von Schritten. Der TYP sitzt am Schritt.
 * Die Aufgabenkategorie (siehe lib/missionen.js) bleibt dagegen an der
 * Aufgabe.
 *
 * Nutzdaten: Je nach Typ ist genau EIN Block im Schritt gefüllt — der unter
 * `datenfeld` genannte. Bei 'katalog' sind es zwei Felder (`aktivitaet_id`
 * und `field_values`), weil dieser Typ die vorhandenen Aktivitäts-Editoren
 * und Schüler-Renderer unverändert mitbenutzt.
 *
 * Altbestand: 'material' und 'aufgabe' sind die ursprünglichen Typen der
 * Aufgabensequenz. Sie bleiben unverändert gültig — die Bestandssequenzen
 * laufen ohne Migration weiter. Insbesondere ist 'aufgabe' NICHT dasselbe
 * wie 'offen': 'aufgabe' ist eine Freitextfrage mit Musterlösung, 'offen'
 * ein in der Werkstatt erzeugtes HTML-Fragment.
 *
 * Tailwind-Klassen als VOLLSTÄNDIGE Literale ausschreiben, damit der Purger
 * sie zur Build-Zeit findet.
 */

export const SCHRITT_TYPEN = Object.freeze({
  MATERIAL: 'material',
  AUFGABE: 'aufgabe',
  KATALOG: 'katalog',
  OFFEN: 'offen',
  BRIAN: 'brian',
  HANDLUNG: 'handlung',
  EXTERN: 'extern',
});

/** Baustand eines Schritts. Fehlender Wert = Altbestand = 'uebernommen'. */
export const SCHRITT_STATUS = Object.freeze({
  GEPLANT: 'geplant',
  GEBAUT: 'gebaut',
  UEBERNOMMEN: 'uebernommen',
});

export const SCHRITT_STATUS_LABELS = Object.freeze({
  geplant: 'geplant',
  gebaut: 'gebaut',
  uebernommen: 'übernommen',
});

/**
 * Konfiguration jedes Schritttyps.
 *
 *   - id           : Slug (= DB-Wert, identisch zum Enum in AllgemeineAufgabe)
 *   - label        : UI-Bezeichnung
 *   - kurz         : Sehr kurzes Label für die Schrittleiste
 *   - beschreibung : Was dieser Schritt schülerseitig tut
 *   - datenfeld    : Name des Nutzdaten-Blocks im Schritt (null bei 'katalog')
 *   - legacy       : true = Alt-Typ, wird in der Werkstatt nicht mehr neu
 *                    angeboten, aber weiterhin angezeigt und bearbeitet
 *   - eingabe      : Erwartet der Schritt eine Schülereingabe?
 */
export const SCHRITT_TYP_LISTE = Object.freeze([
  {
    id: SCHRITT_TYPEN.KATALOG,
    label: 'Format aus dem Katalog',
    kurz: 'Katalog',
    beschreibung:
      'Ein fertiges, deterministisches Aufgabenformat aus dem Aktivitätenkatalog (Lückentext, Zuordnung, Lehrwerk/Quelle …). Abgefragt werden nur die Attribute, die das Format braucht.',
    datenfeld: null,
    legacy: false,
    eingabe: true,
    classes: { stripe: 'bg-sky-500', badge: 'bg-sky-50 text-sky-800 border-sky-200' },
  },
  {
    id: SCHRITT_TYPEN.OFFEN,
    label: 'Offene Aufgabe',
    kurz: 'Offen',
    beschreibung:
      'Eine interaktive Aufgabe, die in der Werkstatt im Gespräch gebaut wird. Ergebnis ist ein HTML-Fragment, das die MBK später in ihre eigene Hülle einsetzt.',
    datenfeld: 'offen',
    legacy: false,
    eingabe: true,
    classes: { stripe: 'bg-violet-500', badge: 'bg-violet-50 text-violet-800 border-violet-200' },
  },
  {
    id: SCHRITT_TYPEN.BRIAN,
    label: 'Gespräch mit Brian',
    kurz: 'Brian',
    beschreibung:
      'Die Schüler bearbeiten den Schritt im Dialog mit dem KI-Tutor. Gepflegt werden Dialogname, Lernenden-Anweisung, interne Anweisung und Abschlussregel.',
    datenfeld: 'brian',
    legacy: false,
    eingabe: true,
    classes: { stripe: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  },
  {
    id: SCHRITT_TYPEN.HANDLUNG,
    label: 'Handlungsaufgabe',
    kurz: 'Handlung',
    beschreibung:
      'Arbeit an realem Material außerhalb des Bildschirms. Schülerseitig gibt es nur einen Bestätigen-Knopf, keine Eingabe.',
    datenfeld: 'handlung',
    legacy: false,
    eingabe: false,
    classes: { stripe: 'bg-amber-500', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  },
  {
    id: SCHRITT_TYPEN.EXTERN,
    label: 'Externe Seite',
    kurz: 'Extern',
    beschreibung:
      'Eine eingebettete fremde Seite, typischerweise GeoGebra. Der Schritt zeigt nur den Rahmen und einen Hinweis.',
    datenfeld: 'extern',
    legacy: false,
    eingabe: false,
    classes: { stripe: 'bg-rose-500', badge: 'bg-rose-50 text-rose-800 border-rose-200' },
  },
  {
    id: SCHRITT_TYPEN.MATERIAL,
    label: 'Material',
    kurz: 'Material',
    beschreibung:
      'Reiner Inhalt ohne Aufgabenstellung: Text, Bild, PDF, Video, Audio oder Link.',
    datenfeld: 'material',
    legacy: false,
    eingabe: false,
    classes: { stripe: 'bg-slate-400', badge: 'bg-slate-50 text-slate-700 border-slate-200' },
  },
  {
    id: SCHRITT_TYPEN.AUFGABE,
    label: 'Freitextfrage',
    kurz: 'Freitext',
    beschreibung:
      'Ursprünglicher Aufgabenschritt der Aufgabensequenz: eine Frage mit Musterlösung oder KI-Feedback. Für neue Schritte besser die offene Aufgabe oder ein Katalogformat wählen.',
    datenfeld: 'aufgabe',
    legacy: true,
    eingabe: true,
    classes: { stripe: 'bg-slate-400', badge: 'bg-slate-50 text-slate-700 border-slate-200' },
  },
]);

const TYP_BY_ID = Object.freeze(
  Object.fromEntries(SCHRITT_TYP_LISTE.map((t) => [t.id, t]))
);

/** Konfiguration zu einem Slug, oder null. Wirft nie. */
export function getSchrittTyp(id) {
  if (!id) return null;
  return TYP_BY_ID[id] || null;
}

/** Typen, die in der Werkstatt für NEUE Schritte angeboten werden. */
export const SCHRITT_TYPEN_NEU = Object.freeze(
  SCHRITT_TYP_LISTE.filter((t) => !t.legacy)
);

/**
 * Baustand eines Schritts. Altbestand ohne `status` gilt als übernommen —
 * diese Schritte wurden vor Einführung der Werkstatt fertig gespeichert.
 */
export function schrittStatus(schritt) {
  return schritt?.status || SCHRITT_STATUS.UEBERNOMMEN;
}

/**
 * Ist der Schritt inhaltlich fertig? Bewusst großzügig: die Prüfung soll der
 * Lehrkraft helfen, nicht sie aufhalten.
 */
export function istSchrittVollstaendig(schritt) {
  if (!schritt) return false;
  switch (schritt.typ) {
    case SCHRITT_TYPEN.MATERIAL: {
      const m = schritt.material || {};
      if (m.material_typ === 'text') return !!(m.inhalt?.trim() || m.datei_url?.trim());
      if (m.material_typ === 'link') return !!m.url?.trim();
      if (m.material_typ === 'video' || m.material_typ === 'audio') {
        return !!(m.url?.trim() || m.datei_url?.trim());
      }
      if (m.material_typ === 'bild' || m.material_typ === 'pdf') return !!m.datei_url?.trim();
      return false;
    }
    case SCHRITT_TYPEN.AUFGABE:
      return !!schritt.aufgabe?.aufgabenstellung?.trim();
    case SCHRITT_TYPEN.KATALOG:
      return !!schritt.aktivitaet_id && Object.keys(schritt.field_values || {}).length > 0;
    case SCHRITT_TYPEN.OFFEN:
      return !!(schritt.offen?.fragment?.trim() || schritt.offen?.snapshot_html?.trim());
    case SCHRITT_TYPEN.BRIAN:
      return !!schritt.brian?.learner_instruction?.trim();
    case SCHRITT_TYPEN.HANDLUNG:
      return !!schritt.handlung?.arbeitsauftrag?.trim();
    case SCHRITT_TYPEN.EXTERN:
      return !!schritt.extern?.url?.trim();
    default:
      return false;
  }
}

/** Erzeugt eine stabile Schritt-UID. Niemals den Array-Index verwenden. */
export function neueSchrittId() {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

/** Leerer Schritt eines gegebenen Typs, ans Ende einer Folge gehängt. */
export function leererSchritt(typ, reihenfolge = 0) {
  const basis = {
    id: neueSchrittId(),
    typ,
    reihenfolge,
    titel: '',
    status: SCHRITT_STATUS.GEPLANT,
    plan: { kurzbeschreibung: '', lernziel: '', dauer_minuten: null },
  };
  switch (typ) {
    case SCHRITT_TYPEN.MATERIAL:
      return { ...basis, material: { material_typ: 'text', inhalt: '', url: '', datei_url: '', beschreibung: '', transkript: '' } };
    case SCHRITT_TYPEN.AUFGABE:
      return { ...basis, aufgabe: { aufgabenstellung: '', input_erforderlich: true, musterloesung: '', feedback_modus: 'musterloesung' } };
    case SCHRITT_TYPEN.KATALOG:
      return { ...basis, aktivitaet_id: null, field_values: {}, herkunft: { quelle: 'katalog' } };
    case SCHRITT_TYPEN.OFFEN:
      return { ...basis, offen: { fragment: '', snapshot_html: '' }, herkunft: { quelle: 'neu' } };
    case SCHRITT_TYPEN.BRIAN:
      return { ...basis, brian: { dialog_name: '', learner_instruction: '', system_instruction: '', completion_rule: '', tutor_persona: 'standard', tutor_persona_zusatz: '', aufgabenstellung: '', erwartungshorizont: '' } };
    case SCHRITT_TYPEN.HANDLUNG:
      return { ...basis, handlung: { arbeitsauftrag: '', material_hinweis: '', datei_url: '', datei_name: '', bestaetigungstext: '' } };
    case SCHRITT_TYPEN.EXTERN:
      return { ...basis, extern: { url: '', titel: '', hoehe: null, hinweis: '' } };
    default:
      return basis;
  }
}

/**
 * Liest die Schrittfolge einer Aufgabe — normalisiert und sortiert.
 *
 * Deckt beide Speicherorte ab: die AllgemeineAufgabe selbst und die
 * `field_values` der Katalog-Aktivität „Aufgabensequenz". Aufgaben im Modus
 * 'einzeln' liefern eine leere Folge; ob daraus später eine implizite
 * Ein-Schritt-Folge wird, entscheidet der Aufrufer.
 */
export function schritteAusAufgabe(quelle) {
  const roh = Array.isArray(quelle?.sequenz_schritte)
    ? quelle.sequenz_schritte
    : Array.isArray(quelle?.field_values?.sequenz_schritte)
      ? quelle.field_values.sequenz_schritte
      : [];
  return [...roh]
    .map((s, i) => ({ ...s, reihenfolge: Number.isFinite(s?.reihenfolge) ? s.reihenfolge : i }))
    .sort((a, b) => a.reihenfolge - b.reihenfolge)
    .map((s, i) => ({ ...s, reihenfolge: i }));
}

/**
 * Wandelt den Strukturvorschlag des Assistenten in echte Schritte um.
 *
 * Der Assistent nennt Katalogformate beim NAMEN (er kennt keine IDs). Hier
 * wird der Name gegen den Katalog aufgelöst. Findet sich kein Eintrag, wird
 * der Schritt als offene Aufgabe angelegt statt mit einer toten Referenz —
 * die Absicht bleibt sichtbar, die Lehrkraft wählt selbst ein Format.
 *
 * Alle erzeugten Schritte stehen auf 'geplant': Ein Vorschlag ist noch keine
 * Entscheidung, und der Baustand soll nicht behaupten, es sei schon etwas
 * gebaut.
 *
 * @param {Array} vorschlag     Liste aus useStrukturVorschlag
 * @param {Array} katalogListe  Aktivitätenkatalog (für die Namensauflösung)
 * @returns {{ schritte: Array, hinweise: string[] }}
 */
export function vorschlagZuSchritten(vorschlag = [], katalogListe = []) {
  const nachName = {};
  (katalogListe || []).forEach((k) => {
    if (!k?.name) return;
    // Bei Phasen-Dubletten gewinnt "Übung" — siehe useAktivitaetenKatalog.
    if (!nachName[k.name] || (k.phase === 'Übung' && nachName[k.name].phase !== 'Übung')) {
      nachName[k.name] = k;
    }
  });

  const hinweise = [];
  const schritte = (vorschlag || []).map((v, i) => {
    let typ = v?.typ;
    let aktivitaet = null;

    if (typ === SCHRITT_TYPEN.KATALOG) {
      aktivitaet = nachName[v?.aktivitaet_name];
      if (!aktivitaet) {
        hinweise.push(`Für „${v?.titel || `Schritt ${i + 1}`}“ gibt es das Format „${v?.aktivitaet_name || '—'}“ nicht. Der Schritt steht jetzt als offene Aufgabe da.`);
        typ = SCHRITT_TYPEN.OFFEN;
      }
    }

    const schritt = leererSchritt(typ, i);
    schritt.titel = String(v?.titel || '').trim();
    schritt.plan = {
      kurzbeschreibung: String(v?.kurzbeschreibung || '').trim(),
      lernziel: '',
      dauer_minuten: Number.isFinite(v?.dauer_minuten) ? v.dauer_minuten : null,
    };
    if (aktivitaet) schritt.aktivitaet_id = aktivitaet.id;
    return schritt;
  });

  return { schritte: neuNummerieren(schritte), hinweise };
}

/** Nummeriert eine Folge nach dem Umsortieren neu durch. */
export function neuNummerieren(schritte) {
  return (schritte || []).map((s, i) => ({ ...s, reihenfolge: i }));
}
