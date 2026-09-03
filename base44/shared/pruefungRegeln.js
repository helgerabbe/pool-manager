/**
 * shared/pruefungRegeln.js
 *
 * Mechanische Prüfregeln der Export-Vorprüfung (Prüfbereich Tab 8, Stufe A).
 * Reine Funktionen ohne Datenbank-Zugriff — dieselben Regeln werden von
 * pruefungSchritt (Stufe „regel") verwendet und können später auch von einer
 * externen KI-Stufe als Vorfilter genutzt werden.
 *
 * Abgedeckt sind die Fehler, die man OHNE Sprachverständnis sicher erkennt:
 *   Kategorie 1 — Leer oder Platzhalter:
 *     · Pflichtfeld einer Aktivität leer (auf Basis des Katalog-Schemas)
 *     · Platzhaltertext („Lorem ipsum", „TODO", „Text folgt" …)
 *     · Antwortoption ohne Text
 *     · Bestehensgrenze höher als die erreichbare Punktzahl
 *     · Master-Variante ohne Inhalt
 *     · Aufgabenstellung einer Allgemeinen Aufgabe leer
 *   Kategorie 5 — Material (nur der mechanische Teil):
 *     · Materialverweis ohne hochgeladene Datei
 *     · Material zeigt nur auf eine fremde Seite
 *
 * Jede Regel liefert { kategorie, schwere, befund, vorschlag }.
 */

const PLATZHALTER_MUSTER = [
  /lorem ipsum/i,
  /\btodo\b/i,
  /\btbd\b/i,
  /platzhalter/i,
  /text folgt/i,
  /folgt noch/i,
  /wird noch (ergänzt|ergaenzt|eingefügt|eingefuegt)/i,
  /\bxxx+\b/i,
  /^\s*(\.{3}|-{3,})\s*$/,
];

function leer(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

function befund(kategorie, schwere, text, vorschlag) {
  return { kategorie, schwere, befund: text, vorschlag };
}

function kurz(text, max = 120) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** Sammelt alle Textwerte eines verschachtelten Objekts (für Platzhalter-Suche). */
function alleTexte(value, out = [], tiefe = 0) {
  if (tiefe > 6) return out;
  if (typeof value === 'string') {
    if (value.trim()) out.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((v) => alleTexte(v, out, tiefe + 1));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => alleTexte(v, out, tiefe + 1));
  }
  return out;
}

function findePlatzhalter(texte) {
  for (const t of texte) {
    for (const muster of PLATZHALTER_MUSTER) {
      if (muster.test(t)) return t;
    }
  }
  return null;
}

/** Fremde Datei-Quelle: nicht in der App hochgeladen, sondern nur verlinkt. */
function istFremdeQuelle(url) {
  const u = String(url || '').trim();
  if (!u) return false;
  if (u.startsWith('/')) return false;
  return !/base44|supabase|githubusercontent/i.test(u);
}

// ---------------------------------------------------------------------------
// Aktivität (LernpaketPhaseAktivitaet)
// ---------------------------------------------------------------------------

/**
 * @param {object} aktivitaet   LernpaketPhaseAktivitaet
 * @param {object} katalog      AktivitaetenKatalog-Eintrag (mit form_schema)
 * @returns {Array} Befund-Kandidaten
 */
export function pruefeAktivitaetMechanisch(aktivitaet, katalog) {
  const treffer = [];
  const fv = aktivitaet?.field_values && typeof aktivitaet.field_values === 'object'
    ? aktivitaet.field_values
    : {};

  // KI-Aktivitäten haben bewusst leere Inhaltsfelder — nur das Briefing zählt.
  if (aktivitaet?.erstellungs_modus === 'ki') {
    const b = aktivitaet.ki_briefing || {};
    const hatBriefing = !leer(b.variant)
      && (!leer(b?.offen?.funktionsweise) || !leer(b?.standard?.schwerpunkt) || !leer(b?.offen?.lernziel));
    if (!hatBriefing) {
      treffer.push(befund(
        1, 'blockiert',
        'Die Aufgabe soll beim Bau erzeugt werden, aber es ist kein Briefing hinterlegt – es steht nirgends, was entstehen soll.',
        'Briefing ausfüllen (Lernziel und Funktionsweise) oder die Aufgabe selbst ausarbeiten.'
      ));
    }
    return treffer;
  }

  // Der Vollständigkeits-Merker der Aktivität ist die verlässliche Quelle
  // (er wird beim Speichern serverseitig berechnet und kennt die Sonderfälle
  // der einzelnen Editoren). Nur wenn er NICHT gesetzt ist, benennen wir die
  // fehlenden Angaben zusätzlich über das Katalog-Schema.
  if (aktivitaet?.is_complete !== true) {
    if (leer(fv)) {
      treffer.push(befund(
        1, 'blockiert',
        'Die Aufgabe ist vollständig leer – es sind keine Inhalte hinterlegt.',
        'Aufgabe ausarbeiten oder aus dem Lernpaket entfernen.'
      ));
      return treffer;
    }
    const fehlend = fehlendePflichtangaben(fv, katalog);
    treffer.push(befund(
      1, 'blockiert',
      fehlend.length > 0
        ? `Pflichtangaben fehlen: ${fehlend.join(', ')}.`
        : 'Die Aufgabe ist noch nicht vollständig ausgearbeitet.',
      'Fehlende Felder ausfüllen.'
    ));
  }

  // Platzhaltertext.
  const platzhalter = findePlatzhalter(alleTexte(fv));
  if (platzhalter) {
    treffer.push(befund(
      1, 'stoert',
      `Es steht noch Platzhaltertext in der Aufgabe: „${kurz(platzhalter)}".`,
      'Platzhalter durch den endgültigen Text ersetzen.'
    ));
  }

  treffer.push(...pruefeAntwortoptionen(fv));
  treffer.push(...pruefeBestehensgrenze(fv));
  treffer.push(...pruefeMaterialQuellen(fv));

  return treffer;
}

/**
 * Benennt die fehlenden Pflichtangaben anhand des Katalog-Schemas.
 * Sonderfall Bildbeschriftung: Der Editor speichert unter eigenen Schlüsseln
 * (backgroundImage / dropZones) statt unter den Schema-Feldnamen — ohne diese
 * Ausnahme würde die Prüfung dort immer „drei Pflichtfelder fehlen" melden.
 */
function fehlendePflichtangaben(fv, katalog) {
  const schema = Array.isArray(katalog?.form_schema) ? katalog.form_schema : [];
  const istBildbeschriftung = String(katalog?.name || '').toLowerCase().includes('bildbeschriftung')
    || schema.some((f) => f && f.field_name === 'marker_data');
  if (istBildbeschriftung) {
    const fehlt = [];
    if (leer(fv.backgroundImage) && leer(fv.image_url)) fehlt.push('Hintergrundbild');
    const zonen = Array.isArray(fv.dropZones) ? fv.dropZones : [];
    if (zonen.filter((z) => z && !leer(z.label)).length < 2) fehlt.push('mindestens zwei beschriftete Begriffe');
    return fehlt;
  }
  return schema
    .filter((f) => f && f.field_name && f.required && f.type !== 'info')
    .filter((f) => leer(fv[f.field_name]))
    .map((f) => f.label || f.field_name);
}

/** Antwortoptionen ohne Text (Quiz, Multiple Choice, Test, Zuordnung). */
function pruefeAntwortoptionen(fv) {
  const treffer = [];
  const container = [fv.mc_data, fv.test_data, fv.answer_data].filter(Boolean);
  for (const c of container) {
    const fragen = Array.isArray(c?.questions) ? c.questions : (Array.isArray(c?.fragen) ? c.fragen : []);
    fragen.forEach((q, i) => {
      const optionen = Array.isArray(q?.answers) ? q.answers : (Array.isArray(q?.options) ? q.options : []);
      const leere = optionen.filter((a) => a && leer(a.text)).length;
      if (leere > 0) {
        treffer.push(befund(
          1, 'blockiert',
          `Frage ${i + 1}: ${leere} Antwortmöglichkeit(en) ohne Text – Schüler sehen leere Auswahlfelder.`,
          'Leere Antwortmöglichkeiten ausfüllen oder löschen.'
        ));
      }
    });
  }
  // Begriffspaare mit einer leeren Seite.
  const paare = Array.isArray(fv.match_data?.pairs) ? fv.match_data.pairs : [];
  const halbePaare = paare.filter((p) => p && (leer(p.left) !== leer(p.right))).length;
  if (halbePaare > 0) {
    treffer.push(befund(
      1, 'blockiert',
      `${halbePaare} Begriffspaar(e) sind nur zur Hälfte gefüllt – die Zuordnung lässt sich nicht lösen.`,
      'Fehlende Seite ergänzen oder das Paar löschen.'
    ));
  }
  return treffer;
}

/** Bestehensgrenze höher als die erreichbare Punktzahl. */
function pruefeBestehensgrenze(fv) {
  const treffer = [];
  const t = fv.test_data;
  if (!t || typeof t !== 'object') return treffer;
  const grenze = Number(t.bestehensgrenze ?? t.passing_score ?? t.bestehen_ab);
  if (!Number.isFinite(grenze) || grenze <= 0) return treffer;
  const fragen = Array.isArray(t.questions) ? t.questions : (Array.isArray(t.fragen) ? t.fragen : []);
  const max = fragen.reduce((s, q) => s + (Number(q?.punkte ?? q?.points ?? 1) || 0), 0);
  if (max > 0 && grenze > max) {
    treffer.push(befund(
      1, 'blockiert',
      `Die Bestehensgrenze liegt bei ${grenze} Punkten, erreichbar sind aber nur ${max} – der Test ist nicht bestehbar.`,
      'Bestehensgrenze senken oder weitere Fragen ergänzen.'
    ));
  }
  return treffer;
}

/** Materialverweise: fehlende Datei bzw. nur fremde Quelle. */
function pruefeMaterialQuellen(fv) {
  const treffer = [];
  const m = fv.material;
  if (m && typeof m === 'object') {
    const hatDatei = !leer(m.datei_url);
    const hatInhalt = !leer(m.inhalt) || !leer(m.transkript);
    const hatLink = !leer(m.url);
    if (!hatDatei && !hatInhalt && !hatLink) {
      treffer.push(befund(
        1, 'blockiert',
        'Es ist ein Material vorgesehen, aber weder Text noch Datei noch Link hinterlegt.',
        'Material hochladen, Text einfügen oder den Materialschritt entfernen.'
      ));
    } else if (!hatDatei && !hatInhalt && istFremdeQuelle(m.url)) {
      treffer.push(befund(
        5, 'stoert',
        `Das Material liegt nur als fremder Link vor (${kurz(m.url, 60)}) – beim Bau steht die Datei nicht zur Verfügung.`,
        'Datei in der App hochladen oder den Inhalt als Text hinterlegen.'
      ));
    }
  }
  // Alle *_url-Felder auf fremde Quellen prüfen (Bild, Audio, Video).
  const fremde = Object.entries(fv)
    .filter(([k, v]) => /_(url)$/i.test(k) && typeof v === 'string' && istFremdeQuelle(v))
    .map(([k]) => k);
  if (fremde.length > 0) {
    treffer.push(befund(
      5, 'hinweis',
      `Verweis auf eine fremde Quelle (${fremde.join(', ')}) – die Datei ist nicht in der App hinterlegt.`,
      'Datei hochladen, damit sie beim Bau sicher verfügbar ist.'
    ));
  }
  return treffer;
}

// ---------------------------------------------------------------------------
// Master-Variante
// ---------------------------------------------------------------------------

export function pruefeMasterMechanisch(master, katalog) {
  const treffer = [];
  const fv = master?.field_values && typeof master.field_values === 'object' ? master.field_values : {};
  if (leer(fv)) {
    treffer.push(befund(
      1, 'blockiert',
      'Diese Master-Variante ist leer – sie würde den Schülern als leere Aufgabe erscheinen.',
      'Variante ausarbeiten oder löschen.'
    ));
    return treffer;
  }
  if (master?.is_complete === false) {
    treffer.push(befund(
      1, 'stoert',
      'Diese Master-Variante ist noch nicht vollständig ausgearbeitet.',
      'Fehlende Angaben der Variante ergänzen.'
    ));
  }
  const platzhalter = findePlatzhalter(alleTexte(fv));
  if (platzhalter) {
    treffer.push(befund(
      1, 'stoert',
      `Platzhaltertext in der Variante: „${kurz(platzhalter)}".`,
      'Platzhalter durch den endgültigen Text ersetzen.'
    ));
  }
  treffer.push(...pruefeAntwortoptionen(fv));
  treffer.push(...pruefeBestehensgrenze(fv));
  return treffer;
}

// ---------------------------------------------------------------------------
// Allgemeine Aufgabe (Ebene 2 / 3)
// ---------------------------------------------------------------------------

export function pruefeAllgemeineAufgabeMechanisch(aufgabe) {
  const treffer = [];
  const typ = aufgabe?.aufgaben_typ || 'inhalt';
  const istBuendel = typ === 'buendel' || typ === 'auswahl_buendel' || typ === 'projekt_anker';

  if (aufgabe?.erstellungs_modus === 'ki') {
    const b = aufgabe.ki_briefing || {};
    const hatBriefing = !leer(b.variant)
      && (!leer(b?.offen?.funktionsweise) || !leer(b?.standard?.schwerpunkt) || !leer(b?.offen?.lernziel));
    if (!hatBriefing) {
      treffer.push(befund(
        1, 'blockiert',
        'Die Aufgabe soll beim Bau erzeugt werden, aber es ist kein Briefing hinterlegt.',
        'Briefing ausfüllen oder die Aufgabe selbst ausarbeiten.'
      ));
    }
    return treffer;
  }

  // Bündel: es zählen die Verknüpfungen, nicht der Aufgabentext.
  if (istBuendel) {
    const ids = [
      ...(Array.isArray(aufgabe.verlinkte_lernpaket_ids) ? aufgabe.verlinkte_lernpaket_ids : []),
      ...(Array.isArray(aufgabe.verlinkte_aufgaben_ids) ? aufgabe.verlinkte_aufgaben_ids : []),
      ...(Array.isArray(aufgabe.verlinkte_projekt_ids) ? aufgabe.verlinkte_projekt_ids : []),
    ];
    if (ids.length === 0) {
      treffer.push(befund(
        1, 'blockiert',
        'Dieses Bündel enthält keine verknüpften Inhalte – Schüler finden dort nichts vor.',
        'Inhalte verknüpfen oder das Bündel entfernen.'
      ));
    }
    return treffer;
  }

  const sequenz = aufgabe?.aufgaben_modus === 'sequenz';
  const schritte = Array.isArray(aufgabe?.sequenz_schritte) ? aufgabe.sequenz_schritte : [];

  if (sequenz) {
    if (schritte.length === 0) {
      treffer.push(befund(
        1, 'blockiert',
        'Die Aufgabe ist als Schrittfolge angelegt, enthält aber keinen einzigen Schritt.',
        'Schritte anlegen oder die Aufgabe auf „einzeln" umstellen.'
      ));
    } else {
      const leereSchritte = schritte
        .map((s, i) => ({ s, nr: i + 1 }))
        .filter(({ s }) => leer(s?.material) && leer(s?.aufgabe) && leer(s?.offen) && leer(s?.brian)
          && leer(s?.handlung) && leer(s?.extern) && leer(s?.abgabe) && leer(s?.field_values));
      if (leereSchritte.length > 0) {
        treffer.push(befund(
          1, 'blockiert',
          `Schritt(e) ${leereSchritte.map((x) => x.nr).join(', ')} sind leer – dort steht für die Schüler nichts.`,
          'Schritte ausarbeiten oder löschen.'
        ));
      }
    }
  } else if (leer(aufgabe?.aufgabenstellung) && leer(aufgabe?.aufgabenstellung_datei_url)) {
    treffer.push(befund(
      1, 'blockiert',
      'Es ist keine Aufgabenstellung hinterlegt – die Schüler erfahren nicht, was sie tun sollen.',
      'Aufgabenstellung schreiben oder als Datei hochladen.'
    ));
  }

  const platzhalter = findePlatzhalter(alleTexte({
    titel: aufgabe?.titel,
    aufgabenstellung: aufgabe?.aufgabenstellung,
    erwartungshorizont: aufgabe?.erwartungshorizont,
    hinweise_zum_material: aufgabe?.hinweise_zum_material,
    sequenz_schritte: schritte,
  }));
  if (platzhalter) {
    treffer.push(befund(
      1, 'stoert',
      `Es steht noch Platzhaltertext in der Aufgabe: „${kurz(platzhalter)}".`,
      'Platzhalter durch den endgültigen Text ersetzen.'
    ));
  }

  // Materialverweise ohne Datei.
  const materialien = Array.isArray(aufgabe?.materialien) ? aufgabe.materialien : [];
  const ohneInhalt = materialien.filter((m) => m && leer(m.content) && leer(m.url)).length;
  if (ohneInhalt > 0) {
    treffer.push(befund(
      1, 'blockiert',
      `${ohneInhalt} Materialeintrag/-einträge ohne Inhalt und ohne Datei.`,
      'Material hochladen, Text einfügen oder Eintrag löschen.'
    ));
  }
  const fremde = materialien.filter((m) => m && istFremdeQuelle(m.url)).length;
  if (fremde > 0) {
    treffer.push(befund(
      5, 'hinweis',
      `${fremde} Material(ien) liegen nur als fremder Link vor – die Datei ist nicht in der App hinterlegt.`,
      'Datei hochladen, damit sie beim Bau sicher verfügbar ist.'
    ));
  }
  if (typ === 'handlung' && leer(aufgabe?.hinweise_zum_material) && leer(aufgabe?.aufgabenstellung_datei_url)) {
    treffer.push(befund(
      5, 'stoert',
      'Handlungsaufgabe ohne Materialhinweis – es ist unklar, welches reale Material gebraucht wird.',
      'Materialhinweis ergänzen.'
    ));
  }

  return treffer;
}