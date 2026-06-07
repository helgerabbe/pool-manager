/**
 * dashboardGating.js
 *
 * Reine Ableitungs-Logik für die Dashboard-Gating-Engine (siehe
 * docs/dashboard-gating-engine.md). Berechnet aus Sektor-Modus + Bündel-
 * Override den `initial_status` jedes Items sowie dessen
 * `abschluss_bedingung`.
 *
 * Keine I/O, keine Side-Effects — testbar. Wird vom Air-Gap-Strukturpayload
 * (lib/mbkAirGapPayloads.js) genutzt, um jedem Item die beiden Felder
 * beizugeben, damit die MBK das Gating + den Weiter-Button identisch
 * implementiert.
 */

import { getBundleKindByAcceptedTypes } from '@/lib/sektorTypen';

/** Versionskennung der Gating-Engine (siehe Spec-Doc). */
export const GATING_ENGINE_VERSION = 'gating-1.0.0';

export const INITIAL_STATUS = Object.freeze({
  OFFEN: 'offen',
  ERLEDIGT: 'erledigt',
});

export const ABSCHLUSS_BEDINGUNG = Object.freeze({
  WEITER_BUTTON: 'weiter_button',
  INTERAKTION: 'interaktion',
  ABSOLVIERT: 'absolviert',
  ALLE_KINDER: 'alle_kinder',
  X_VON_Y: 'x_von_y',
});

/**
 * Normalisiert einen Sektor-Modus auf 'sequenziell' | 'frei'.
 * Default (auch bei Legacy/null) = 'sequenziell'.
 */
export function normalizeSektorModus(modus) {
  return modus === 'frei' ? 'frei' : 'sequenziell';
}

/**
 * Normalisiert einen Bündel-Modus auf 'sequenziell' | 'frei'.
 * Default = 'frei' (offenes Verhalten, wenn nichts gesetzt).
 */
export function normalizeBundleModus(modus) {
  return modus === 'sequenziell' ? 'sequenziell' : 'frei';
}

/**
 * Leitet den Initial-Status für ein WURZEL-Element ab (folgt dem Sektor).
 *   - Sektor sequenziell → 'offen'
 *   - Sektor frei        → 'erledigt'
 */
export function deriveRootInitialStatus(sektorModus) {
  return normalizeSektorModus(sektorModus) === 'frei'
    ? INITIAL_STATUS.ERLEDIGT
    : INITIAL_STATUS.OFFEN;
}

/**
 * Leitet den Initial-Status für ein BÜNDEL-KIND ab (folgt dem Bündel,
 * überschreibt den Sektor).
 *   - Bündel sequenziell → 'offen'
 *   - Bündel frei        → 'erledigt'
 */
export function deriveChildInitialStatus(bundleModus) {
  return normalizeBundleModus(bundleModus) === 'sequenziell'
    ? INITIAL_STATUS.OFFEN
    : INITIAL_STATUS.ERLEDIGT;
}

/**
 * Erkennt anhand eines Bausteins (SystemBausteine-Record), ob ein Item ein
 * Bündel-Container ist (`baustein_modus='bundle_1ton'`).
 */
export function isBundleContainer(baustein) {
  return baustein?.baustein_modus === 'bundle_1ton';
}

/**
 * Leitet die `abschluss_bedingung` eines Items ab (siehe Spec §5).
 *
 * @param {object} args
 * @param {object} args.item           — Lernpfad-Item ({ type, ref_id, bundle_config })
 * @param {object} [args.baustein]     — SystemBausteine-Record (nur bei type='system')
 * @param {boolean} [args.istTest]     — true, wenn das Item ein Test/Diagnose ist
 * @returns {string} ABSCHLUSS_BEDINGUNG-Wert
 */
export function deriveAbschlussBedingung({ item, baustein = null, istTest = false }) {
  // Bündel-Container.
  if (item?.type === 'system' && isBundleContainer(baustein)) {
    const bundleModus = normalizeBundleModus(item?.bundle_config?.modus);
    if (bundleModus === 'sequenziell') return ABSCHLUSS_BEDINGUNG.ALLE_KINDER;
    // Freies Bündel: X-von-Y nur, wenn eine Schwelle gesetzt ist.
    const erforderlich = item?.bundle_config?.erforderliche_anzahl;
    if (typeof erforderlich === 'number' && erforderlich > 0) {
      return ABSCHLUSS_BEDINGUNG.X_VON_Y;
    }
    return ABSCHLUSS_BEDINGUNG.WEITER_BUTTON;
  }

  // Reine Info-/Standard-Bausteine (kein Bündel) → manuelle Bestätigung.
  if (item?.type === 'system') {
    return ABSCHLUSS_BEDINGUNG.WEITER_BUTTON;
  }

  // Tests/Diagnosen.
  if (istTest) return ABSCHLUSS_BEDINGUNG.ABSOLVIERT;

  // Aufgaben / Lernpakete / Projekte → Interaktion (bearbeitet/abgegeben).
  return ABSCHLUSS_BEDINGUNG.INTERAKTION;
}

/**
 * Reichert die Items eines Sektors mit `initial_status` + `abschluss_bedingung`
 * an. Erwartet eine FLACHE, hierarchisch sortierte Item-Liste (Wurzel-Item
 * direkt gefolgt von seinen Kindern), wie sie summarizeSektor erzeugt.
 *
 * Für die Kind-Ableitung wird pro Wurzel-Bündel der Bündel-Modus gemerkt
 * und auf alle nachfolgenden Items mit passender parent_instance_id
 * angewendet.
 *
 * @param {object} args
 * @param {Array}  args.items          — flache Item-Liste (root → children)
 * @param {string} args.sektorModus    — 'sequenziell' | 'frei'
 * @param {Map}    [args.bausteinById] — Map<ref_id, SystemBausteine>
 * @param {Function} [args.istTestItem]— (item) => boolean, optionaler Test-Marker
 * @returns {Array} neue Item-Liste mit initial_status + abschluss_bedingung
 */
export function annotateSektorItems({
  items = [],
  sektorModus = 'sequenziell',
  bausteinById = new Map(),
  istTestItem = () => false,
}) {
  // Bündel-Modus pro Bündel-instance_id vormerken (für Kind-Ableitung).
  const bundleModusByInstance = new Map();
  for (const it of items) {
    if (it?.type === 'system') {
      const baustein = bausteinById.get?.(it.ref_id);
      if (isBundleContainer(baustein) && it.instance_id) {
        bundleModusByInstance.set(it.instance_id, normalizeBundleModus(it?.bundle_config?.modus));
      }
    }
  }

  return items.map((it) => {
    const baustein = it?.type === 'system' ? bausteinById.get?.(it.ref_id) || null : null;
    const istKind = !!it?.parent_instance_id;

    const initial_status = istKind
      ? deriveChildInitialStatus(bundleModusByInstance.get(it.parent_instance_id))
      : deriveRootInitialStatus(sektorModus);

    const abschluss_bedingung = deriveAbschlussBedingung({
      item: it,
      baustein,
      istTest: !!istTestItem(it),
    });

    return { ...it, initial_status, abschluss_bedingung };
  });
}

/**
 * Kompakte, inhalts-UNABHÄNGIGE Spezifikation der Gating-Engine für Payload 1
 * (System-Kontext). Beschreibt die Regeln aus der Spec, damit die MBK die
 * Engine + den Weiter-Button in jeder Einheit identisch implementiert.
 *
 * WICHTIG: Enthält niemals konkrete IDs/Inhalte — sonst kippt der
 * system_context_hash bei Aufgaben-Änderungen.
 */
export const DASHBOARD_GATING_ENGINE = Object.freeze({
  version: GATING_ENGINE_VERSION,
  status_field: { name: 'status', values: ['offen', 'erledigt'] },
  gating_rules: {
    sektor_sequenziell:
      'Es ist immer das erste nicht-erledigte Element freigeschaltet. Erledigte '
      + 'Elemente bleiben sichtbar und erneut anklickbar; spätere Elemente sind '
      + 'sichtbar, aber gesperrt.',
    sektor_frei: 'Alle Elemente des Sektors sind jederzeit anklickbar.',
    buendel_override:
      'Ein Bündel-Container trägt einen eigenen Modus (sequenziell|frei), der NUR '
      + 'für seine Kinder gilt und den Sektor-Modus dort überschreibt. Der '
      + 'Container selbst folgt dem Sektor-Modus.',
  },
  initial_status_rules: {
    description:
      'Der Initial-Status wird beim Build abgeleitet, NICHT pro Schüler. Sektor '
      + 'sequenziell → Wurzel-Items "offen"; Sektor frei → Wurzel-Items "erledigt". '
      + 'Bündel-Kinder folgen dem Bündel-Modus: sequenziell → "offen", frei → '
      + '"erledigt". So entsteht Lerntyp-Differenzierung allein über den '
      + 'Startzustand (z. B. Passioniert = freier Sektor = alles "erledigt").',
  },
  weiter_button: {
    rolle: 'universelle Abschluss-Bestätigung',
    setzt_status_auf: 'erledigt',
    aktivierung:
      'Nur klickbar, wenn die abschluss_bedingung des Elements erfüllt ist; sonst '
      + 'deaktiviert. Bei bereits erledigten Elementen bleibt er aktiv (navigiert '
      + 'nur weiter, ändert den Status nicht).',
    optik: 'Einheitlicher grüner Button am unteren Rand jedes Elements.',
  },
  abschluss_bedingungen: {
    weiter_button: 'Sofort aktiv (Info-Element, freies/Wissensspeicher-Bündel).',
    interaktion: 'Aktiv, sobald die Aufgabe/das Lernpaket bearbeitet/abgegeben wurde.',
    absolviert: 'Aktiv, sobald ein Test/eine Diagnose absolviert wurde.',
    alle_kinder: 'Bündel sequenziell: aktiv, sobald alle Kinder "erledigt" sind.',
    x_von_y: 'Bündel frei mit Schwelle: aktiv, sobald erforderliche_anzahl Kinder "erledigt" sind.',
  },
  sektor_freischaltung: {
    description:
      'Jeder Sektor trägt eine freischalt_bedingung, die regelt, WANN der Sektor '
      + 'im Dashboard zugänglich ist (unabhängig vom Item-Gating innerhalb des '
      + 'Sektors). modus="sofort": Sektor ist von Anfang an sichtbar und '
      + 'zugänglich. modus="nach_sektor": Sektor ist sichtbar, aber GESPERRT, bis '
      + 'der Sektor mit der id voraussetzung_sektor_id vollständig erledigt ist '
      + '(alle seine Wurzel-Elemente "erledigt"). Ein gesperrter Sektor wird im '
      + 'Menü mit Schloss-Symbol und Hinweis "Erst verfügbar, wenn <Titel> '
      + 'abgeschlossen ist" angezeigt; seine Inhalte sind nicht anklickbar. Es '
      + 'gibt genau EINEN Voraussetzungs-Sektor (keine UND/ODER-Verknüpfung) — '
      + 'Ketten ergeben sich kaskadisch.',
  },
});