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
};

const feld = (typ, label, extra = {}) => ({ type: typ, label, ...extra });

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

/** True, wenn diese Auftragsart eine Schüler-Vorschau erlaubt (Aktivitäts-Inhalte). */
export function hatVorschau(art) {
  return art === 'aktivitaet_einfuegen' || art === 'aktivitaet_aendern';
}