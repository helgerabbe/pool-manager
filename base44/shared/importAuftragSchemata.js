/**
 * shared/importAuftragSchemata.js
 *
 * DER VERTRAG des Import-Centers: Pro Auftragsart ein JSON Schema, das genau
 * sagt, wie ein gültiger Auftrag aussehen muss.
 *
 * Warum JSON Schema und nicht XML: Die ganze App spricht JSON (field_values,
 * MBK-Payload, Validatoren, SDK). JSON Schema liefert dieselbe Strenge, die man
 * von XSD kennt — Pflichtfelder, Typen, Enums — ohne Übersetzungsschicht, und
 * dieselben Schemata lassen sich später unverändert als Werkzeug-Beschreibung
 * für KI-Clients weiterverwenden.
 *
 * EIN Schema, ZWEI Verbraucher: das interne Formular im Import-Center (rendert
 * die Felder daraus) und die Empfangsprüfung `pruefeImportAuftrag`. Damit kann
 * kein Auftrag entstehen, den die Prüfung anders liest als das Formular.
 *
 * Reine Daten + reine Funktionen, keine I/O.
 */

/** Menschenlesbare Beschriftung je Auftragsart (für Posteingang und Formular). */
export const ART_LABELS = {
  einheit_anlegen: 'Einheit anlegen',
  themenfeld_anlegen: 'Themenfeld anlegen',
  lernpaket_anlegen: 'Lernpaket anlegen',
  aktivitaet_einfuegen: 'Aktivität einfügen',
  aktivitaet_aendern: 'Aktivität ändern',
  aktivitaet_loeschen: 'Aktivität löschen',
  status_setzen: 'Freigabe-Status setzen',
  allgemeine_aufgabe_anlegen: 'Sequenzaufgabe anlegen',
  allgemeine_aufgabe_aendern: 'Sequenzaufgabe ändern',
  allgemeine_aufgabe_loeschen: 'Sequenzaufgabe löschen',
  offene_aufgabe_anlegen: 'Offene Aufgabe anlegen (HTML)',
  offene_aufgabe_html_ersetzen: 'HTML einer offenen Aufgabe ersetzen',
  schritt_einfuegen: 'Schritt einfügen',
  schritt_verschieben: 'Schritt verschieben',
  schritt_aendern: 'Schritt ändern',
  schritt_entfernen: 'Schritt entfernen',
};

/**
 * DIE SCHRITT-ARTEN einer Aufgabensequenz — Spiegel des `sequenz_schritte`-
 * Schemas der AllgemeineAufgabe-Entity. `block` sagt, in welchem Unterobjekt
 * die Nutzdaten des Schritts liegen (bei 'katalog' liegen sie direkt am Schritt:
 * aktivitaet_id + field_values).
 *
 * Der Typ 'brian' ist in v1 BEWUSST nicht dabei: Ein Brian-Gespräch bringt einen
 * eigenen vollständigen Durchlauf (Lernzielanalyse, Erwartungshorizont, vier
 * Übergabefelder) mit — das ist eine eigene Etappe, kein Nebeneffekt hier.
 */
export const SCHRITT_TYPEN = {
  material: {
    label: 'Material (nur Inhalt, keine Aufgabe)',
    block: 'material',
    felder: [
      {
        name: 'material_typ',
        label: 'Art des Materials',
        typ: 'select',
        optionen: ['text', 'video', 'audio', 'bild', 'pdf', 'link'],
        pflicht: true,
      },
      { name: 'inhalt', label: 'Text / Inhalt', typ: 'textarea' },
      { name: 'url', label: 'Link (Video, Seite)', typ: 'text' },
      { name: 'datei_url', label: 'Datei-URL', typ: 'text' },
      { name: 'beschreibung', label: 'Hinweis für Schüler', typ: 'textarea' },
      { name: 'transkript', label: 'Transkript', typ: 'textarea' },
    ],
  },
  aufgabe: {
    label: 'Freitext-Aufgabe mit Musterlösung',
    block: 'aufgabe',
    felder: [
      { name: 'aufgabenstellung', label: 'Aufgabenstellung', typ: 'textarea', pflicht: true },
      { name: 'musterloesung', label: 'Musterlösung', typ: 'textarea' },
      {
        name: 'feedback_modus',
        label: 'Rückmeldeweg',
        typ: 'select',
        optionen: ['musterloesung', 'ki'],
      },
    ],
  },
  katalog: {
    label: 'Aufgabe aus dem Aktivitätenkatalog',
    block: null,
    felder: [
      { name: 'aktivitaet_id', label: 'Aufgabenart (Katalog-ID)', typ: 'aufgabenart', pflicht: true },
      { name: 'field_values', label: 'Inhalte der Aufgabenart', typ: 'json', pflicht: true },
    ],
  },
  offen: {
    label: 'Offene Aufgabe (HTML-Fragment)',
    block: 'offen',
    felder: [{ name: 'fragment', label: 'HTML-Fragment (div.aufgabe)', typ: 'textarea', pflicht: true }],
  },
  handlung: {
    label: 'Handlungsaufgabe (reales Material)',
    block: 'handlung',
    felder: [
      { name: 'arbeitsauftrag', label: 'Arbeitsauftrag', typ: 'textarea', pflicht: true },
      { name: 'material_hinweis', label: 'Materialhinweis', typ: 'textarea' },
      { name: 'datei_url', label: 'Datei-URL', typ: 'text' },
      { name: 'bestaetigungstext', label: 'Text des Bestätigen-Knopfes', typ: 'text' },
    ],
  },
  extern: {
    label: 'Externe Seite (z. B. GeoGebra)',
    block: 'extern',
    felder: [
      { name: 'url', label: 'Adresse der Seite', typ: 'text', pflicht: true },
      { name: 'titel', label: 'Titel', typ: 'text' },
      { name: 'hinweis', label: 'Hinweis für Schüler', typ: 'textarea' },
      { name: 'hoehe', label: 'Höhe (Pixel)', typ: 'number' },
    ],
  },
  abgabe: {
    label: 'Abgabe (was abgegeben werden soll)',
    block: 'abgabe',
    felder: [
      { name: 'formate', label: 'Abgabeformate', typ: 'array', pflicht: true },
      { name: 'custom_format', label: 'Eigenes Format', typ: 'text' },
      { name: 'dateiformat', label: 'Dateiformat (z. B. PDF)', typ: 'text' },
      { name: 'hinweis', label: 'Hinweis für Schüler', typ: 'textarea' },
    ],
  },
};

/** Die Schritt-Arten als Liste — für Formular und Schema-Bibliothek. */
export function listSchrittTypen() {
  return Object.entries(SCHRITT_TYPEN).map(([typ, def]) => ({
    typ,
    label: def.label,
    block: def.block,
    felder: def.felder,
  }));
}

const SCHRITT_FELD = {
  type: 'object',
  label: 'Schritt',
  hinweis:
    'Ein Schritt der Sequenz: { id?, typ, titel?, <Nutzdaten-Block> }. Erlaubte Typen und ihre Felder liefert getAuftragsSchemata unter schritt_typen.',
};

const feld = (typ, label, extra = {}) => ({ type: typ, label, ...extra });

/**
 * AUFGABEN-VARIANTEN (2026-09-13): Die häufigsten Übungsformate des
 * Pool-Managers — Lückentext, Begriffe zuordnen, Reihenfolge, Miniquiz, Test —
 * tragen ihren Inhalt NICHT in den field_values der Aktivität, sondern in
 * MasterAufgabe-Datensätzen; genau die lesen die Schüler-Seiten. Ohne dieses
 * Feld könnte das Import-Center diese Formate zwar anlegen, aber nie mit
 * Inhalt füllen — die Schüler sähen eine leere Seite.
 *
 * Das Format je Aufgabenart liegt in base44/shared/aktivitaetInhaltSpecs.js
 * (MASTER_TYP_SPEZIFIKATIONEN) — eine Wahrheit für Erzeugung UND Prüfung.
 */
const MASTER_VARIANTE_FELD = {
  type: 'object',
  label: 'Aufgaben-Variante',
  hinweis:
    'Eine Variante derselben Aufgabe (gleiches Lernziel, andere Beispiele). Felder je Aufgabenart: Lückentext → { instruction, lueckentext (Lücken als [Wort]), distraktoren[] }; Begriffe zuordnen → { instruction, pairs[{left,right}] }; Reihenfolge/Sortierung → { instruction, orderedItems[] }; Miniquiz → { instruction, questions[{question, answers[{text,isCorrect}]}] }; Test → { instruction, passFeedback, failFeedback, questions[{type,question,points,…}] }.',
};

const MASTER_VARIANTE_HINWEIS =
  'Nur bei Aufgabenarten, die mit Varianten arbeiten (supports_master). Sind Varianten angegeben, werden die json-Pflichtfelder der Aufgabenart nicht mehr verlangt — der Inhalt steckt dann in den Varianten.';

/**
 * Die Verträge. `ziel_typ` sagt, worauf sich der Auftrag bezieht;
 * `position_erlaubt` steuert, ob eine Einfüge-Position sinnvoll ist;
 * `parameter` ist das JSON Schema der Nutzdaten.
 */
export const ART_SCHEMATA = {
  einheit_anlegen: {
    beschreibung:
      'Legt eine neue Einheit an. Die Einheit entsteht als Entwurf mit den Standard-Lernpfaden; Themenfelder und Lernpakete folgen über eigene Aufträge.',
    ziel_typ: 'keines',
    position_erlaubt: false,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['titel_der_einheit', 'fach', 'jahrgangsstufe'],
      properties: {
        titel_der_einheit: feld('string', 'Titel der Einheit', { minLength: 3, maxLength: 200 }),
        fach: feld('string', 'Fach', { hinweis: 'Muss ein aktives Fach der Fächerverwaltung sein.' }),
        jahrgangsstufe: feld('string', 'Jahrgangsstufe', {
          enum: ['5', '6', '7', '8', '9', '10', '11', '12', '13'],
        }),
        sichtbarkeit: feld('string', 'Sichtbarkeit', { enum: ['oeffentlich', 'privat'] }),
      },
    },
  },

  themenfeld_anlegen: {
    beschreibung: 'Legt ein Themenfeld innerhalb einer bestehenden Einheit an.',
    ziel_typ: 'einheit',
    position_erlaubt: true,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['titel'],
      properties: {
        titel: feld('string', 'Titel des Themenfelds', { minLength: 2, maxLength: 200 }),
        beschreibung: feld('string', 'Kurzbeschreibung'),
        leitfrage: feld('string', 'Leitfrage für die Lernlandkarte'),
        bearbeitungsmodus: feld('string', 'Bearbeitungsmodus', { enum: ['sequenziell', 'offen'] }),
      },
    },
  },

  lernpaket_anlegen: {
    beschreibung: 'Legt ein Lernpaket innerhalb eines bestehenden Themenfelds an.',
    ziel_typ: 'themenfeld',
    position_erlaubt: true,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['titel'],
      properties: {
        titel: feld('string', 'Titel des Lernpakets', { minLength: 2, maxLength: 200 }),
        geschaetzte_dauer_minuten: feld('number', 'Geschätzte Dauer (Minuten)'),
        kernbegriffe: feld('array', 'Kernbegriffe', { items: { type: 'string' } }),
      },
    },
  },

  aktivitaet_einfuegen: {
    beschreibung:
      'Fügt in ein bestehendes Lernpaket eine Aktivität ein — an einer bestimmten Phase und Position. Die Inhalte kommen als field_values mit und werden gegen das Katalog-Schema geprüft.',
    ziel_typ: 'lernpaket',
    position_erlaubt: true,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['aktivitaet_id', 'phase'],
      properties: {
        aktivitaet_id: feld('string', 'Aufgabenart (Katalog-ID)', {
          hinweis: 'ID eines Eintrags aus dem Aktivitätenkatalog — abrufbar über getAuftragsSchemata.',
        }),
        phase: feld('string', 'Phase', { enum: ['Input', 'Übung', 'Abschluss'] }),
        field_values: feld('object', 'Inhalte der Aktivität', {
          hinweis: 'Formatgleich zu den Feldwerten der Aktivität; Pflichtfelder aus dem form_schema der Aufgabenart.',
        }),
        master_varianten: feld('array', 'Aufgaben-Varianten', {
          items: MASTER_VARIANTE_FELD,
          hinweis: MASTER_VARIANTE_HINWEIS,
        }),
      },
    },
  },

  aktivitaet_aendern: {
    beschreibung: 'Ersetzt die Inhalte einer bestehenden Aktivität durch die mitgelieferten field_values.',
    ziel_typ: 'aktivitaet',
    position_erlaubt: false,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['field_values'],
      properties: {
        field_values: feld('object', 'Neue Inhalte der Aktivität'),
        master_varianten: feld('array', 'Aufgaben-Varianten', {
          items: MASTER_VARIANTE_FELD,
          hinweis: `${MASTER_VARIANTE_HINWEIS} Mitgelieferte Varianten ERSETZEN die bestehenden Varianten der Aktivität.`,
        }),
      },
    },
  },

  aktivitaet_loeschen: {
    beschreibung:
      'Nimmt eine Aktivität aus dem Lernpaket. Gelöscht wird mit Grabstein (sync_status="to_delete"), damit der Kursbau die Entfernung mitbekommt.',
    ziel_typ: 'aktivitaet',
    position_erlaubt: false,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['grund'],
      properties: {
        grund: feld('string', 'Grund der Entfernung', { minLength: 3 }),
      },
    },
  },

  status_setzen: {
    beschreibung:
      'Setzt den Freigabe-Status eines Lernpakets (Entwurf oder freigegeben). Aktivitäten haben keine eigene Freigabe.',
    ziel_typ: 'lernpaket',
    position_erlaubt: false,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['content_status'],
      properties: {
        content_status: feld('string', 'Freigabe-Status', { enum: ['draft', 'approved'] }),
      },
    },
  },

  allgemeine_aufgabe_anlegen: {
    beschreibung:
      'Legt in einer Einheit eine allgemeine Aufgabe als AUFGABENSEQUENZ an — mit ihren Schritten in Reihenfolge. Die Aufgabe entsteht als Entwurf.',
    ziel_typ: 'einheit',
    position_erlaubt: false,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['titel', 'sequenz_schritte'],
      properties: {
        titel: feld('string', 'Titel der Aufgabe', { minLength: 3, maxLength: 200 }),
        aufgabenstellung: feld('string', 'Übergreifende Aufgabenstellung'),
        themenfeld_id: feld('string', 'Themenfeld (optional)', {
          hinweis: 'Leer = die Aufgabe hängt an der Einheit, ohne Themenfeld.',
        }),
        anforderungsebene: feld('string', 'Anforderungsebene', {
          enum: ['1 - Basis', '2 - Transfer'],
          hinweis: 'Ebene 3 (Projekt) ist eine spätere Etappe des Import-Centers.',
        }),
        mission_type: feld('string', 'Aufgabenkategorie', {
          enum: ['erstbegegnung', 'erarbeitung', 'sicherung', 'anwendung'],
        }),
        schwierigkeitsgrad: feld('number', 'Schwierigkeitsgrad', { enum: [1, 2, 3] }),
        sequenz_schritte: feld('array', 'Schritte der Sequenz', { items: SCHRITT_FELD }),
      },
    },
  },

  allgemeine_aufgabe_aendern: {
    beschreibung:
      'Ersetzt Angaben und die GESAMTE Schrittfolge einer bestehenden Sequenzaufgabe. Für einzelne Schritte gibt es die schrittgenauen Auftragsarten.',
    ziel_typ: 'allgemeine_aufgabe',
    position_erlaubt: false,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['sequenz_schritte'],
      properties: {
        titel: feld('string', 'Titel der Aufgabe', { maxLength: 200 }),
        aufgabenstellung: feld('string', 'Übergreifende Aufgabenstellung'),
        mission_type: feld('string', 'Aufgabenkategorie', {
          enum: ['erstbegegnung', 'erarbeitung', 'sicherung', 'anwendung'],
        }),
        schwierigkeitsgrad: feld('number', 'Schwierigkeitsgrad', { enum: [1, 2, 3] }),
        sequenz_schritte: feld('array', 'Schritte der Sequenz', { items: SCHRITT_FELD }),
      },
    },
  },

  allgemeine_aufgabe_loeschen: {
    beschreibung:
      'Nimmt eine allgemeine Aufgabe aus der Einheit. Gelöscht wird mit Grabstein (sync_status="to_delete"), damit der Kursbau die Entfernung mitbekommt.',
    ziel_typ: 'allgemeine_aufgabe',
    position_erlaubt: false,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['grund'],
      properties: {
        grund: feld('string', 'Grund der Entfernung', { minLength: 3 }),
      },
    },
  },

  /**
   * DIE OFFENE AUFGABE, eigenständig (2026-09-23).
   *
   * Warum eine eigene Auftragsart und nicht allgemeine_aufgabe_anlegen mit einem
   * Schritt: Eine offene Aufgabe besteht aus genau einem HTML-Fragment. Wer sie
   * über die Sequenz-Art anlegen müsste, müsste die ganze Schritt-Mechanik
   * mitschicken, obwohl es nur um ein Feld geht — und jeder Absender würde das
   * anders verpacken. Angelegt wird intern trotzdem eine Sequenz mit einem
   * Schritt vom Typ 'offen': So läuft die Aufgabe durch dieselbe Vorschau,
   * dieselbe Prüfung und denselben Payload-Weg wie eine in der Werkstatt gebaute.
   */
  offene_aufgabe_anlegen: {
    beschreibung:
      'Legt in einer Einheit eine neue OFFENE Aufgabe an — eine interaktive Aufgabe, deren Inhalt als HTML-Fragment mitkommt. Intern entsteht eine Aufgabe mit genau einem Schritt vom Typ "offen"; weitere Schritte lassen sich danach über schritt_einfuegen ergänzen.',
    ziel_typ: 'einheit',
    position_erlaubt: false,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['titel', 'fragment'],
      properties: {
        titel: feld('string', 'Titel der Aufgabe', { minLength: 3, maxLength: 200 }),
        fragment: feld('string', 'HTML-Fragment der Aufgabe', {
          hinweis:
            'Ein <div class="aufgabe"> mit eigenem <style> und <script> — OHNE <html>, <head> oder <body>. Genau die Form, in der der Pool-Manager offene Aufgaben im Payload übergibt.',
        }),
        aufgabenstellung: feld('string', 'Aufgabenstellung (Begleittext, optional)'),
        themenfeld_id: feld('string', 'Themenfeld (optional)', {
          hinweis: 'Leer = die Aufgabe hängt an der Einheit, ohne Themenfeld.',
        }),
        anforderungsebene: feld('string', 'Anforderungsebene', {
          enum: ['1 - Basis', '2 - Transfer'],
        }),
        mission_type: feld('string', 'Aufgabenkategorie', {
          enum: ['erstbegegnung', 'erarbeitung', 'sicherung', 'anwendung'],
        }),
        schwierigkeitsgrad: feld('number', 'Schwierigkeitsgrad', { enum: [1, 2, 3] }),
      },
    },
  },

  /**
   * Der häufigste Fall überhaupt: Der Kursbau hat das HTML einer bestehenden
   * offenen Aufgabe verbessert und schickt die neue Fassung zurück.
   *
   * BEWUSST NICHT über schritt_aendern: Das ersetzt den GANZEN Schritt und würde
   * Titel, Planung, Baustand und die grafische Variante mitnehmen — bei einer
   * reinen HTML-Verbesserung wäre das ein stiller Datenverlust. Hier wandert
   * ausschliesslich das Fragment.
   */
  offene_aufgabe_html_ersetzen: {
    beschreibung:
      'Ersetzt NUR das HTML-Fragment einer bestehenden offenen Aufgabe — für überarbeitete, korrigierte oder gestalterisch verbesserte Fassungen. Titel, Planung und Einordnung der Aufgabe bleiben unberührt. Der veraltete Vorschau-Schnappschuss wird verworfen.',
    ziel_typ: 'allgemeine_aufgabe',
    position_erlaubt: false,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['fragment'],
      properties: {
        fragment: feld('string', 'Neues HTML-Fragment', {
          hinweis: 'Ein <div class="aufgabe"> ohne Dokumentgerüst — ersetzt das bisherige Fragment vollständig.',
        }),
        schritt_id: feld('string', 'ID des Schritts (optional)', {
          hinweis:
            'Nur nötig, wenn die Aufgabe MEHRERE offene Schritte hat. Bei genau einem offenen Schritt wird dieser genommen. IDs liefert getEinheitStrukturLesend.',
        }),
        begruendung: feld('string', 'Was wurde verbessert?', {
          hinweis: 'Erscheint im Posteingang, damit die Fachgruppe die Änderung einordnen kann.',
        }),
      },
    },
  },

  schritt_einfuegen: {
    beschreibung:
      'Fügt in eine bestehende Sequenzaufgabe einen Schritt an einer Position ein. Nachrückende Schritte verschieben sich.',
    ziel_typ: 'allgemeine_aufgabe',
    position_erlaubt: true,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['schritt'],
      properties: { schritt: SCHRITT_FELD },
    },
  },

  schritt_verschieben: {
    beschreibung: 'Verschiebt einen Schritt innerhalb der Sequenz an eine andere Position.',
    ziel_typ: 'allgemeine_aufgabe',
    position_erlaubt: true,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['schritt_id'],
      properties: {
        schritt_id: feld('string', 'ID des Schritts', {
          hinweis: 'Die stabile id des Schritts — abrufbar über getEinheitStrukturLesend.',
        }),
      },
    },
  },

  schritt_aendern: {
    beschreibung: 'Ersetzt genau einen Schritt der Sequenz durch die mitgelieferte Fassung.',
    ziel_typ: 'allgemeine_aufgabe',
    position_erlaubt: false,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['schritt_id', 'schritt'],
      properties: {
        schritt_id: feld('string', 'ID des Schritts'),
        schritt: SCHRITT_FELD,
      },
    },
  },

  schritt_entfernen: {
    beschreibung: 'Entfernt einen Schritt aus der Sequenz; die Reihenfolge der übrigen Schritte wird korrigiert.',
    ziel_typ: 'allgemeine_aufgabe',
    position_erlaubt: false,
    parameter: {
      type: 'object',
      additionalProperties: false,
      required: ['schritt_id', 'grund'],
      properties: {
        schritt_id: feld('string', 'ID des Schritts'),
        grund: feld('string', 'Grund der Entfernung', { minLength: 3 }),
      },
    },
  },
};

export function getSchemaFuerArt(art) {
  return ART_SCHEMATA[art] || null;
}

/** Liste aller Arten mit Label und Beschreibung — für Formular und Bibliothek. */
export function listArten() {
  return Object.keys(ART_SCHEMATA).map((art) => ({
    art,
    label: ART_LABELS[art] || art,
    beschreibung: ART_SCHEMATA[art].beschreibung,
    ziel_typ: ART_SCHEMATA[art].ziel_typ,
    position_erlaubt: ART_SCHEMATA[art].position_erlaubt,
    parameter: ART_SCHEMATA[art].parameter,
  }));
}

function istLeer(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function typPasst(typ, wert) {
  if (typ === 'string') return typeof wert === 'string';
  if (typ === 'number') return typeof wert === 'number' && Number.isFinite(wert);
  if (typ === 'boolean') return typeof wert === 'boolean';
  if (typ === 'array') return Array.isArray(wert);
  if (typ === 'object') return !!wert && typeof wert === 'object' && !Array.isArray(wert);
  return true;
}

/**
 * Strukturprüfung eines Auftrags gegen den Vertrag seiner Art.
 * Liefert { valide, fehler: [{ fieldName, label, reason }] }.
 */
export function validiereAuftragStruktur(auftrag) {
  const fehler = [];
  const art = auftrag?.auftrags_art;
  const schema = getSchemaFuerArt(art);
  if (!schema) {
    return {
      valide: false,
      fehler: [{ fieldName: 'auftrags_art', label: 'Auftragsart', reason: 'Unbekannte Auftragsart' }],
    };
  }

  // Ziel
  if (schema.ziel_typ !== 'keines') {
    if (auftrag.ziel_typ !== schema.ziel_typ) {
      fehler.push({
        fieldName: 'ziel_typ',
        label: 'Ziel-Typ',
        reason: `Diese Auftragsart wirkt auf ein Ziel vom Typ "${schema.ziel_typ}"`,
      });
    }
    if (istLeer(auftrag.ziel_id)) {
      fehler.push({ fieldName: 'ziel_id', label: 'Ziel-ID', reason: 'Pflichtfeld leer' });
    }
  }

  // Position
  if (!schema.position_erlaubt && auftrag.position !== undefined && auftrag.position !== null) {
    fehler.push({
      fieldName: 'position',
      label: 'Position',
      reason: 'Diese Auftragsart kennt keine Einfüge-Position',
    });
  }

  // Parameter
  const parameter = auftrag.parameter || {};
  const pSchema = schema.parameter || { properties: {}, required: [] };
  const erlaubt = Object.keys(pSchema.properties || {});

  for (const pflicht of pSchema.required || []) {
    const wert = parameter[pflicht];
    if (istLeer(wert)) {
      fehler.push({
        fieldName: `parameter.${pflicht}`,
        label: pSchema.properties?.[pflicht]?.label || pflicht,
        reason: 'Pflichtfeld leer',
      });
    }
  }

  for (const key of Object.keys(parameter)) {
    if (pSchema.additionalProperties === false && !erlaubt.includes(key)) {
      fehler.push({
        fieldName: `parameter.${key}`,
        label: key,
        reason: 'Feld ist in diesem Vertrag nicht vorgesehen',
      });
      continue;
    }
    const def = pSchema.properties?.[key];
    if (!def) continue;
    const wert = parameter[key];
    if (istLeer(wert)) continue;
    if (!typPasst(def.type, wert)) {
      fehler.push({
        fieldName: `parameter.${key}`,
        label: def.label || key,
        reason: `Erwartet wird der Typ "${def.type}"`,
      });
      continue;
    }
    if (def.enum && !def.enum.includes(wert)) {
      fehler.push({
        fieldName: `parameter.${key}`,
        label: def.label || key,
        reason: `Erlaubt sind: ${def.enum.join(', ')}`,
      });
    }
    if (def.minLength && String(wert).trim().length < def.minLength) {
      fehler.push({
        fieldName: `parameter.${key}`,
        label: def.label || key,
        reason: `Mindestens ${def.minLength} Zeichen`,
      });
    }
    if (def.maxLength && String(wert).length > def.maxLength) {
      fehler.push({
        fieldName: `parameter.${key}`,
        label: def.label || key,
        reason: `Höchstens ${def.maxLength} Zeichen`,
      });
    }
  }

  return { valide: fehler.length === 0, fehler };
}

/** True, wenn diese Auftragsart eine Schüler-Vorschau erlaubt (Inhalte im Auftrag). */
export function hatVorschau(art) {
  return (
    art === 'aktivitaet_einfuegen' ||
    art === 'aktivitaet_aendern' ||
    art === 'schritt_einfuegen' ||
    art === 'schritt_aendern' ||
    art === 'allgemeine_aufgabe_anlegen' ||
    art === 'allgemeine_aufgabe_aendern' ||
    art === 'offene_aufgabe_anlegen' ||
    art === 'offene_aufgabe_html_ersetzen'
  );
}