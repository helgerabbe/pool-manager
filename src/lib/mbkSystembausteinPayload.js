/**
 * mbkSystembausteinPayload.js
 *
 * Payload 5: Briefings für Systembausteine (pro Baustein × Lerntyp-Pfad).
 * Ausgelagert aus mbkAirGapPayloads.js (airgap-1.20.0).
 *
 * NEU in airgap-1.20.0 — die LERNLANDKARTE:
 * Bis 1.19.0 bekamen die Karten-Bausteine (sys_map_full, sys_map_reduced) nur
 * eine flache Lernpaket-Liste mit den Fachsprache-Formulierungen der Lernziele.
 * Das ist NICHT die Karte, die in der App steht: dort sind die Knoten die
 * Leitfrage des Themenfelds und die Schülerübersetzung des Lernziels, die
 * Aufgaben hängen als EIN Sammelknoten am Themenfeld, und das Vorwissen liegt
 * als eigener Zweig an der Wurzel. Die MBK konnte die Karte aus der alten
 * Datenlage gar nicht nachbauen. Jetzt geht der Graph so hinaus, wie er in der
 * App entsteht (vgl. src/lib/lernlandkarteGraph.js); der Aufbau- und
 * Verhaltensvertrag dazu steht in Payload 1 (`lernlandkarte_contract`).
 */
import { getSektorTypLabel } from '@/lib/sektorTypen';
import {
  LERNTYP_KEYS,
  nullable,
  makeMeta,
  isPlatzhalterItem,
  isTombstone,
  fnSystemBaustein,
  fnDashboard,
  makeSystembausteinReferenceId,
} from '@/lib/mbkPayloadBasis';

/**
 * Kompakte Item-Liste eines Lerntyp-Pfads, damit die MBK den Kontext rund um
 * einen Baustein findet (welcher Sektor, welche Geschwister, welches Themenfeld).
 */
function summarizeLerntypPfad(sektoren, themenfelderById) {
  return (sektoren || []).map((sektor) => {
    const themenfeldTitel = sektor?.themenfeld_id
      ? nullable(sektor?.titel_snapshot)
        || nullable(themenfelderById.get(sektor.themenfeld_id)?.titel)
      : null;
    return {
      sektor_id: sektor?.sektor_id || null,
      sektor_typ: sektor?.sektor_typ || null,
      sektor_typ_label: getSektorTypLabel(sektor?.sektor_typ),
      titel: nullable(sektor?.titel),
      themenfeld_id: sektor?.themenfeld_id || null,
      themenfeld_titel: themenfeldTitel,
      // airgap-1.21.0: Verhalten des Abschnitts — auch die Karten- und
      // Einführungs-Bausteine müssen wissen, ob hier der Reihe nach gearbeitet
      // wird und wann der Abschnitt überhaupt zugänglich ist.
      modus:
        sektor?.modus === 'frei' || sektor?.modus === 'sequenziell'
          ? sektor.modus
          : (sektor?.bearbeitungsmodus === 'frei' ? 'frei' : 'sequenziell'),
      freischalt_bedingung:
        sektor?.freischalt_bedingung?.modus === 'nach_sektor'
        && sektor?.freischalt_bedingung?.voraussetzung_sektor_id
          ? {
            modus: 'nach_sektor',
            voraussetzung_sektor_id: sektor.freischalt_bedingung.voraussetzung_sektor_id,
          }
          : { modus: 'sofort', voraussetzung_sektor_id: null },
      items: (sektor?.items || []).map((it) => ({
        instance_id: it?.instance_id || null,
        type: it?.type || null,
        ref_id: it?.ref_id || null,
        parent_instance_id: it?.parent_instance_id || null,
        // 2026-09-06: Von der Lehrkraft festgelegter Arbeitsauftrag DIESER
        // Stelle (z. B. was beim Lehrer-Check konkret zu tun ist).
        arbeitsauftrag: nullable(it?.arbeitsauftrag),
      })),
    };
  });
}

/**
 * Sammelt die fertigen SchuelerInhaltSnapshots eines Bausteins in einem
 * Lerntyp-Pfad (airgap-1.17.0). Ein Baustein kann im Pfad MEHRFACH vorkommen —
 * pro Vorkommen (instance_id) gibt es einen eigenen Snapshot.
 */
function collectFertigeInhalte({ snapshots = [], lerntyp, bausteinId, lerntypPfad = [] }) {
  const themenfeldByInstance = new Map();
  for (const sektor of lerntypPfad || []) {
    for (const item of sektor?.items || []) {
      if (item?.instance_id) {
        themenfeldByInstance.set(item.instance_id, sektor?.themenfeld_id || null);
      }
    }
  }

  return (snapshots || [])
    .filter(
      (s) =>
        s?.baustein_id === bausteinId
        && s?.lerntyp === lerntyp
        && s?.inhalt
        && typeof s.inhalt === 'object'
    )
    .map((s) => ({
      instance_id: nullable(s.instance_id),
      themenfeld_id: nullable(s.themenfeld_id) || themenfeldByInstance.get(s.instance_id) || null,
      generiert_am: nullable(s.generiert_am),
      inhalt: s.inhalt,
    }));
}

/**
 * Baut den Lernlandkarten-Graphen für die Karten-Bausteine (airgap-1.20.0).
 *
 * Struktur wie in der App: Wurzel = Einheit, darunter je Themenfeld ein Knoten
 * mit seiner LEITFRAGE, darunter je Lernziel ein Knoten mit der
 * SCHÜLERÜBERSETZUNG (mit Sprung in den Wissensspeicher des Lernpakets),
 * dazu EIN Aufgaben-Sammelknoten pro Themenfeld und — falls vorhanden — der
 * Vorwissen-Zweig mit den verknüpften Basispaketen.
 */
function buildLernlandkarteFuerExport({
  einheit,
  themenfelder = [],
  lernpakete = [],
  lernziele = [],
  allgemeineAufgaben = [],
  vorwissenPakete = [],
}) {
  const pakete = (lernpakete || [])
    .filter((p) => !isTombstone(p))
    .slice()
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  const zieleByPaket = new Map();
  for (const lz of lernziele || []) {
    if (!zieleByPaket.has(lz.lernpaket_id)) zieleByPaket.set(lz.lernpaket_id, []);
    zieleByPaket.get(lz.lernpaket_id).push(lz);
  }

  const aufgaben = (allgemeineAufgaben || []).filter((aa) => !isTombstone(aa));

  const zielKnoten = (paket) =>
    (zieleByPaket.get(paket.id) || []).map((lz) => ({
      knoten_typ: 'lernziel',
      lernziel_id: lz.id || null,
      // Beschriftung auf der Karte: Schülerübersetzung, sonst Fachsprache.
      titel: nullable(lz.schueler_uebersetzung) || nullable(lz.formulierung_fachsprache),
      schueler_uebersetzung: nullable(lz.schueler_uebersetzung),
      formulierung_fachsprache: nullable(lz.formulierung_fachsprache),
      lernpaket_id: paket.id,
      lernpaket_titel: nullable(paket.titel_des_pakets),
      wissensspeicher_ziel: `task-${paket.id}.html`,
    }));

  const felder = (themenfelder || [])
    .slice()
    .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));

  const themenfeldKnoten = felder.map((tf) => {
    const tfPakete = pakete.filter((p) => p.themenfeld_id === tf.id);
    const tfAufgaben = aufgaben.filter((aa) => aa.themenfeld_id === tf.id);
    return {
      knoten_typ: 'themenfeld',
      themenfeld_id: tf.id,
      // Beschriftung auf der Karte: Leitfrage, sonst der Titel.
      titel: nullable(tf.leitfrage) || nullable(tf.titel),
      leitfrage: nullable(tf.leitfrage),
      themenfeld_titel: nullable(tf.titel),
      kurzbeschreibung: nullable(tf.beschreibung),
      lernziele: tfPakete.flatMap(zielKnoten),
      // EIN Sammelknoten pro Themenfeld — Aufgaben hängen bewusst dort, weil
      // sie mehrere Lernziele gleichzeitig betreffen können.
      aufgaben_knoten: tfAufgaben.length > 0
        ? {
          knoten_typ: 'aufgaben',
          titel: 'Zu den Aufgaben',
          anzahl: tfAufgaben.length,
          aufgabe_ids: tfAufgaben.map((aa) => aa.id),
        }
        : null,
    };
  });

  const ohneFeld = pakete.filter((p) => !felder.some((tf) => tf.id === p.themenfeld_id));
  if (ohneFeld.length > 0) {
    themenfeldKnoten.push({
      knoten_typ: 'themenfeld',
      themenfeld_id: null,
      titel: 'Weitere Themen',
      leitfrage: null,
      themenfeld_titel: 'Weitere Themen',
      kurzbeschreibung: null,
      lernziele: ohneFeld.flatMap(zielKnoten),
      aufgaben_knoten: null,
    });
  }

  return {
    wurzel: {
      knoten_typ: 'einheit',
      titel: nullable(einheit?.titel_der_einheit) || 'Deine Einheit',
    },
    themenfelder: themenfeldKnoten,
    vorwissen: (vorwissenPakete || []).length > 0
      ? {
        knoten_typ: 'vorwissen',
        titel: 'Vorwissen',
        kurzbeschreibung: 'Das solltest du schon können. Wenn dir etwas fehlt, schau hier nach.',
        basispakete: (vorwissenPakete || []).map((p) => ({
          knoten_typ: 'basispaket',
          lernpaket_id: p.id,
          titel: nullable(p.titel_des_pakets) || nullable(p.titel),
          wissensspeicher_ziel: `task-${p.id}.html`,
        })),
      }
      : null,
  };
}

/**
 * Payload 5 (Single Item): Briefing für EINEN Baustein × Lerntyp.
 *
 * Enthält GPS (Einheit-Meta), den vollständigen Lernpfad dieses Lerntyps, die
 * Baustein-Definition, den Lernlandkarten-Graphen und die bereits von der
 * Lehrkraft erzeugten Inhalte. Ergebnis ist eine HTML-Datei
 * `system-<lerntyp>-<baustein_id>.html`.
 */
export function buildSystembausteinPayloadItem({
  einheit,
  lerntyp,
  bausteinId,
  systemBaustein,
  lerntypPfad = [],
  themenfelderById = new Map(),
  lernpakete = [],
  lernziele = [],
  // airgap-1.20.0: für den Aufgaben-Sammelknoten der Lernlandkarte.
  allgemeineAufgaben = [],
  vorwissenPakete = [],
  navigationContext = [],
  snapshots = [],
  systemContextHash = null,
  uiConfigHash = null,
  nowIso = null,
}) {
  if (!bausteinId || !lerntyp) return null;

  const lernlandkarte = buildLernlandkarteFuerExport({
    einheit,
    themenfelder: Array.from(themenfelderById.values()),
    lernpakete,
    lernziele,
    allgemeineAufgaben,
    vorwissenPakete,
  });

  return {
    meta: makeMeta({
      payloadType: 'mbk_systembaustein_payload',
      einheitId: einheit?.id || null,
      systemContextHash,
      uiConfigHash,
      nowIso,
    }),
    target: {
      kind: 'systembaustein',
      reference_id: makeSystembausteinReferenceId(lerntyp, bausteinId),
      lerntyp,
      baustein_id: bausteinId,
    },
    gps: {
      fach: nullable(einheit?.fach),
      jahrgangsstufe: nullable(einheit?.jahrgangsstufe),
      titel_einheit: nullable(einheit?.titel_der_einheit),
      gesamtziele: Array.isArray(einheit?.gesamtziele) ? einheit.gesamtziele : [],
    },
    baustein: {
      baustein_id: bausteinId,
      titel: nullable(systemBaustein?.titel),
      icon: nullable(systemBaustein?.icon),
      admin_beschreibung: nullable(systemBaustein?.admin_beschreibung),
      export_instruktion: nullable(systemBaustein?.export_instruktion),
    },
    lerntyp_pfad: summarizeLerntypPfad(lerntypPfad, themenfelderById),
    // Arbeitsaufträge dieses Bausteins in diesem Pfad (pro Vorkommen). Sie
    // sagen, was an der Stelle konkret getan werden soll — 1:1 übernehmen.
    arbeitsauftraege: (lerntypPfad || []).flatMap((sektor) =>
      (sektor?.items || [])
        .filter((it) => it?.type === 'system' && it?.ref_id === bausteinId && nullable(it?.arbeitsauftrag))
        .map((it) => ({
          instance_id: it.instance_id || null,
          sektor_id: sektor?.sektor_id || null,
          sektor_titel: nullable(sektor?.titel),
          arbeitsauftrag: it.arbeitsauftrag,
        }))
    ),
    // airgap-1.20.0: Der Graph der Lernlandkarte. Aufbau und Verhalten der
    // Karte stehen in Payload 1 (`lernlandkarte_contract`).
    lernlandkarte,
    fertige_inhalte: collectFertigeInhalte({ snapshots, lerntyp, bausteinId, lerntypPfad }),
    inhalt_regel:
      'Enthält `fertige_inhalte` Einträge, sind das fertige, von der Lehrkraft '
      + 'geprüfte Inhalte: übernimm sie 1:1 (nicht umformulieren, nicht kürzen, '
      + 'nicht "verbessern") und baue pro Eintrag den zugehörigen Abschnitt. '
      + 'Ist `fertige_inhalte` leer, erzeuge den Inhalt selbst aus '
      + '`baustein.export_instruktion` und dem Pfad-Kontext. Bei den '
      + 'Steht in `arbeitsauftraege` ein Text, ist das die Vorgabe der Lehrkraft, '
      + 'was an dieser Stelle konkret zu tun ist (z. B. Lehrer-Check): 1:1 '
      + 'schülersichtbar ausgeben, nicht umformulieren. Bei den '
      + 'Karten-Bausteinen (sys_map_*) ist `lernlandkarte` die Quelle — halte '
      + 'dich an den `lernlandkarte_contract` aus Payload 1.',
    output_contract: {
      format: 'full_html',
      filename: fnSystemBaustein(bausteinId, lerntyp),
    },
    injection_points: {
      title: nullable(systemBaustein?.titel) || bausteinId,
      back_targets: Array.isArray(navigationContext) && navigationContext.length > 0
        ? [...navigationContext].sort()
        : [fnDashboard(lerntyp)],
    },
  };
}

/**
 * Payload 5 als BUNDLE: alle Baustein × Lerntyp-Briefings einer Einheit.
 *
 * Strikte Regel: Pro Lerntyp entsteht nur dann ein Briefing, wenn der Baustein
 * im jeweiligen Lernpfad tatsächlich referenziert ist (1:1-Zuordnung
 * Pfad ↔ Briefing ↔ SCORM-Datei).
 */
export function buildSystembausteinPayloadBundle({
  einheit,
  themenfelder = [],
  lernpakete = [],
  lernziele = [],
  allgemeineAufgaben = [],
  vorwissenPakete = [],
  systemBausteine = [],
  navigationContextByRefId = new Map(),
  snapshots = [],
  systemContextHash = null,
  uiConfigHash = null,
  nowIso = null,
}) {
  const themenfelderById = new Map((themenfelder || []).map((tf) => [tf.id, tf]));
  const bausteinByKey = new Map((systemBausteine || []).map((b) => [b.baustein_id, b]));
  const items = [];

  const navFor = (refId) => {
    const v = navigationContextByRefId?.get ? navigationContextByRefId.get(refId) : null;
    return Array.isArray(v) ? v : [];
  };

  for (const lt of LERNTYP_KEYS) {
    const sektoren = einheit?.lernpfade_konfiguration?.[lt] || [];
    const seenInLerntyp = new Set();
    for (const sektor of sektoren) {
      for (const item of sektor?.items || []) {
        if (item?.type !== 'system' || !item?.ref_id) continue;
        // Platzhalter sind Arbeitshilfen im Architekt — niemals ein Briefing.
        if (isPlatzhalterItem(item)) continue;
        if (seenInLerntyp.has(item.ref_id)) continue;
        seenInLerntyp.add(item.ref_id);
        const refId = makeSystembausteinReferenceId(lt, item.ref_id);
        const briefing = buildSystembausteinPayloadItem({
          einheit,
          lerntyp: lt,
          bausteinId: item.ref_id,
          systemBaustein: bausteinByKey.get(item.ref_id) || null,
          lerntypPfad: sektoren,
          themenfelderById,
          lernpakete,
          lernziele,
          allgemeineAufgaben,
          vorwissenPakete,
          navigationContext: navFor(refId),
          snapshots,
          systemContextHash,
          uiConfigHash,
          nowIso,
        });
        if (briefing) items.push(briefing);
      }
    }
  }

  return {
    meta: makeMeta({
      payloadType: 'mbk_systembaustein_payload',
      einheitId: einheit?.id || null,
      systemContextHash,
      uiConfigHash,
      itemCount: items.length,
      nowIso,
    }),
    items,
  };
}