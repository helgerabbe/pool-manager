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

/** Versionskennung der Gating-Engine (siehe Spec-Doc).
 *  gating-1.1.0: Sektor-Freischaltung (sektor_freischaltung-Regel +
 *  freischalt_bedingung pro Sektor).
 *  gating-1.2.0: Verbindliche Darstellungsregeln (darstellung) — gesperrte
 *  Elemente werden ausgegraut, nur das aktuelle Element ist farbig.
 *  gating-1.3.0: Bündel-Modus ist standardmäßig das GEGENTEIL des Sektor-Modus
 *  (ein Bündel ermöglicht im Sektor bewusst die jeweils andere
 *  Bearbeitungsart) + Exit-Regel für "X von Y" in sequenziellen Bündeln.
 *  gating-1.4.0: Innen-Modus eines Lernpakets (`lernpaket_innen_modus`) wird
 *  pro Lernpaket-Item ausgeliefert und im Vertrag erklärt — die MBK hatte
 *  `bundle_config.lernpaket_modus` bisher als Reihenfolge der Lernpaket-KINDER
 *  gelesen; gemeint ist die Reihenfolge der Aktivitäten INNERHALB jedes
 *  Lernpakets. */
export const GATING_ENGINE_VERSION = 'gating-1.4.0';

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
 * Effektiver Bündel-Modus (gating-1.3.0).
 *
 * Ein Bündel hat nur dann didaktischen Sinn, wenn es INNERHALB des Sektors die
 * jeweils andere Bearbeitungsart ermöglicht (sequenzieller Sektor → freie
 * Auswahl im Bündel und umgekehrt). Ist am Bündel nichts explizit gesetzt,
 * gilt daher automatisch das Gegenteil des Sektor-Modus. Projekt-Bündel sind
 * immer frei.
 */
export function resolveBundleModus(bundleModus, sektorModus, { istProjektBuendel = false } = {}) {
  if (istProjektBuendel) return 'frei';
  if (bundleModus === 'sequenziell' || bundleModus === 'frei') return bundleModus;
  return normalizeSektorModus(sektorModus) === 'sequenziell' ? 'frei' : 'sequenziell';
}

/**
 * Innen-Modus eines Lernpakets (gating-1.4.0).
 *
 * Gilt für die AKTIVITÄTEN INNERHALB eines einzelnen Lernpakets — nicht für
 * die Reihenfolge mehrerer Lernpakete untereinander (das ist Sektor- bzw.
 * Bündel-Modus). Gepflegt am Lernpaketebündel (`bundle_config.lernpaket_modus`),
 * Default 'sequenziell': von oben nach unten, wie es die Minimalisten brauchen.
 */
export function resolveLernpaketInnenModus(lernpaketModus) {
  return lernpaketModus === 'frei' ? 'frei' : 'sequenziell';
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
export function deriveAbschlussBedingung({
  item,
  baustein = null,
  istTest = false,
  sektorModus = 'sequenziell',
}) {
  // Bündel-Container.
  if (item?.type === 'system' && isBundleContainer(baustein)) {
    const bundleModus = resolveBundleModus(item?.bundle_config?.modus, sektorModus, {
      istProjektBuendel:
        getBundleKindByAcceptedTypes(baustein?.accepted_types) === 'projekte',
    });
    // Eine gesetzte Schwelle hat Vorrang — sie gilt AUCH im sequenziellen
    // Bündel (die Kinder jenseits der Schwelle sind dort freiwillig, müssen
    // aber weiterhin in der Reihenfolge angeboten werden).
    const erforderlich = item?.bundle_config?.erforderliche_anzahl;
    if (typeof erforderlich === 'number' && erforderlich > 0) {
      return ABSCHLUSS_BEDINGUNG.X_VON_Y;
    }
    if (bundleModus === 'sequenziell') return ABSCHLUSS_BEDINGUNG.ALLE_KINDER;
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
        bundleModusByInstance.set(
          it.instance_id,
          resolveBundleModus(it?.bundle_config?.modus, sektorModus, {
            istProjektBuendel:
              getBundleKindByAcceptedTypes(baustein?.accepted_types) === 'projekte',
          })
        );
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
      sektorModus,
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
      + 'Container selbst folgt dem Sektor-Modus. Zweck des Bündels ist genau '
      + 'dieser Bruch: In einem sequenziellen Sektor öffnet ein freies Bündel an '
      + 'einer Stelle die Wahl ("wähle selbst, welches der drei Lernpakete du '
      + 'zuerst machst"); in einem freien Sektor erzwingt ein sequenzielles '
      + 'Bündel eine feste Teil-Reihenfolge. Ist am Bündel kein Modus gesetzt, '
      + 'gilt daher das GEGENTEIL des Sektor-Modus (Projekt-Bündel immer frei). '
      + 'Ausnahme: AUFGABEN-Bündel dürfen bewusst denselben Modus wie ihr Sektor '
      + 'tragen — ein sequenzielles Aufgaben-Bündel im sequenziellen Sektor ist die '
      + 'einzige Möglichkeit, "X von Y" mit fester Reihenfolge zu bauen (erste X '
      + 'Pflicht, restliche freiwillig). Nur bei Lernpaket-Bündeln ist derselbe '
      + 'Modus wie im Sektor wirkungslos.',
  },
  lernpaket_innen_modus: {
    feld: 'lernpaket_innen_modus (an jedem Lernpaket-Item des Pfades)',
    bedeutung:
      'Reihenfolge der AKTIVITÄTEN INNERHALB dieses einen Lernpakets: '
      + '"sequenziell" = die Aktivitäten werden von oben nach unten abgearbeitet, '
      + 'die jeweils nächste ist bis dahin ausgegraut; "frei" = alle Aktivitäten '
      + 'des Lernpakets sind sofort anklickbar (Wissensspeicher). Default ist '
      + '"sequenziell".',
    abgrenzung:
      'NICHT verwechseln mit der Reihenfolge MEHRERER Lernpakete untereinander — '
      + 'die regeln Sektor-Modus bzw. bundle_config.modus. Das Rohfeld '
      + 'bundle_config.lernpaket_modus am Lernpaketebündel meint ebenfalls diesen '
      + 'Innen-Modus und gilt für alle Lernpaket-Kinder des Bündels; der '
      + 'aufgelöste Wert steht bereits an jedem Lernpaket-Item.',
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
    x_von_y:
      'Bündel mit Schwelle (erforderliche_anzahl): aktiv, sobald erforderliche_anzahl '
      + 'Kinder "erledigt" sind. Gilt in freien UND in sequenziellen Bündeln.',
  },
  x_von_y_in_sequenziellem_buendel: {
    description:
      'Sonderfall (gating-1.3.0): sequenzielles Bündel MIT Schwelle, z. B. 3 von 5 '
      + 'Aufgaben. Die Reihenfolge bleibt fest — die ersten erforderliche_anzahl '
      + 'Kinder sind PFLICHT, alle weiteren sind FREIWILLIG, werden aber weiterhin '
      + 'nur nacheinander freigeschaltet (kein freies Herausgreifen).',
    darstellung:
      'Freiwillige Kinder tragen sichtbar die Kennzeichnung "freiwillig" und sind '
      + 'bis zu ihrer Freischaltung wie üblich ausgegraut.',
    exit:
      'Sobald die Pflichtmenge erfüllt ist, MUSS das Bündel einen Ausgang anbieten: '
      + 'Am Übergang zum ersten freiwilligen Kind erscheint eine Abschlussfrage mit '
      + 'zwei gleichwertigen Optionen — "Freiwillige Aufgabe bearbeiten" oder '
      + '"Bündel abschließen". Wählt der Schüler den Abschluss, gilt das Bündel als '
      + '"erledigt" und der Sektor läuft weiter; die freiwilligen Kinder bleiben '
      + 'sichtbar und können später jederzeit nachgeholt werden. Diese Frage '
      + 'wiederholt sich nach jedem bearbeiteten freiwilligen Kind, bis keine mehr '
      + 'übrig sind. Ohne diesen Exit gäbe es im sequenziellen Bündel keinen Weg '
      + 'heraus — er ist deshalb verbindlich.',
  },
  darstellung: {
    description:
      'Verbindliche visuelle Umsetzung des Gatings (gating-1.2.0). Ziel: Der '
      + 'Unterschied zwischen sequenzieller und freier Bearbeitung muss auf den '
      + 'ersten Blick sichtbar sein. In einem sequenziellen Kontext darf NICHT '
      + 'der gesamte Inhalt gleichwertig-farbig erscheinen, sonst wirkt das '
      + 'Dashboard überfordernd ("was soll ich zuerst tun?").',
    gilt_fuer:
      'Jeden sequenziellen Kontext: Sektor mit modus="sequenziell", Bündel mit '
      + 'bundle_config.modus="sequenziell" (dort für die Kinder) und die '
      + 'Aktivitäten innerhalb eines Lernpakets mit lernpaket_modus="sequenziell".',
    zustaende: {
      aktiv:
        'Das erste nicht-erledigte Element: volle Farbigkeit, Icon/Thumbnail in '
        + 'Originalfarben, deutlich hervorgehoben (z. B. farbiger Rahmen), '
        + 'anklickbar. Es ist das einzige farbig hervorgehobene offene Element.',
      erledigt:
        'Sichtbar und weiterhin anklickbar, aber ruhig dargestellt: gedeckte '
        + 'Farben plus Häkchen-Symbol. Erledigtes soll den Blick nicht mit dem '
        + 'aktuellen Element konkurrieren.',
      gesperrt:
        'Sichtbar, aber ausgegraut (entsättigt, reduzierte Deckkraft), mit '
        + 'Schloss-Symbol und NICHT anklickbar. Der Titel bleibt lesbar, damit '
        + 'die Länge des Weges einschätzbar ist. Ein Klickversuch führt zu keiner '
        + 'Navigation; optional erscheint der Hinweis "Wird freigeschaltet, wenn '
        + 'du den vorherigen Schritt abgeschlossen hast".',
    },
    uebergang:
      'Sobald ein Element auf "erledigt" wechselt, wird das nächste Element von '
      + 'ausgegraut auf farbig-aktiv umgestellt — sichtbar als kleiner '
      + 'Fortschritts-Moment (kurze Einblend-/Farbanimation erlaubt).',
    freier_kontext:
      'Bei modus="frei" gilt diese Ausgrau-Regel NICHT: alle Elemente sind '
      + 'gleichwertig farbig und jederzeit anklickbar (gewollte Freiheit, z. B. '
      + 'Lerntyp "Passioniert").',
    gesperrter_sektor:
      'Ein per freischalt_bedingung gesperrter Sektor wird als Ganzes ausgegraut '
      + 'und zugeklappt dargestellt (Schloss + Hinweistext); seine Elemente '
      + 'werden nicht einzeln aufgelistet.',
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