/**
 * mbkOnboardingPayload.js
 *
 * Onboarding-/Orientierungsphase für die Air-Gap-Übergabe an die MBK
 * (ausgelagert aus mbkAirGapPayloads.js, airgap-1.18.0).
 *
 *  - `ONBOARDING_CONTRACT` wandert in Payload 1 (System-Kontext) und erklärt
 *    der MBK die allen Intensitätsstufen vorgeschaltete Orientierungsphase,
 *    ihre Reihenfolge und wie der Schüler durch die Schritte geführt wird.
 *  - `buildOnboardingForStructure()` liefert für Payload 2 die konkreten,
 *    von der Lehrkraft übernommenen Inhalte. Primärquelle sind die
 *    SchuelerInhaltSnapshots (geltungsbereich='einheit',
 *    baustein_id='onboarding_<key>'), Fallback ist das ältere Feld
 *    Einheiten.onboarding_konfiguration.
 */

export const ONBOARDING_CONTRACT = {
  was_ist_das:
    'Jede Einheit hat eine einheits-GLOBALE Orientierungs-/Onboarding-Phase, '
    + 'die dem Schüler VOR der Wahl einer der vier Intensitätsstufen '
    + '(minimalist/pragmatiker/ehrgeizig/passioniert) angezeigt wird. Sie ist '
    + 'bewusst NICHT Teil der Dashboards/Lernpfade, sondern eine eigene, allen '
    + 'vier Dashboards vorgeschaltete Einstiegsseite der Einheit — sie '
    + 'existiert genau einmal pro Einheit.',
  ablauf:
    'Reihenfolge der Schüleransicht: 1) Vorstellung der Einheit (Titel, Fach, '
    + 'Jahrgang, Gesamtziele). 2) Die vier Onboarding-Elemente in genau der '
    + 'Reihenfolge von `elemente` (einfuehrung → fragenblock → '
    + 'einstiegsdiagnose → lerntyp_diagnose). 3) ERST DANACH wählt der Schüler '
    + 'seine Intensitätsstufe (= eines der vier Dashboards) und startet den '
    + 'eigentlichen Lernpfad. Die Onboarding-Inhalte werden EINMAL beim Bauen '
    + 'festgelegt (Snapshot) und NICHT bei jedem Schülerklick neu generiert.',
  schueler_fuehrung:
    'WICHTIG für den Bau: Das Onboarding ist das ERSTE, was der Schüler sieht, '
    + 'wenn er die Einheit öffnet — noch VOR der Wahl der Intensitätsstufe. '
    + 'Der Schüler wird Schritt für Schritt mitgenommen und muss vor JEDEM '
    + 'Element in schülergerechter Sprache (kurz, „du"-Ansprache) erklärt '
    + 'bekommen, WAS jetzt passiert und WOZU es dient: '
    + '(a) Start: Titel der Einheit + „Du entscheidest gleich selbst, wie '
    + 'intensiv du diese Einheit bearbeitest — ich helfe dir dabei." '
    + '(b) Vor der Einführung: „Zuerst zeige ich dir, worum es hier überhaupt '
    + 'geht." '
    + '(c) Vor dem Fragenblock: erklären, dass eine Selbsteinschätzung bei der '
    + 'Wahl hilft, und dem Schüler die WAHL lassen: entweder sich selbst per '
    + 'Schieberegler einschätzen („Wie sicher fühlst du dich?") ODER die Fragen '
    + 'beantworten. Dieser Schritt ist FREIWILLIG und überspringbar. '
    + '(d) Vor der Einstiegsdiagnose: erklären, dass dieses kurze Quiz PFLICHT '
    + 'ist, keine Note gibt und nur zeigt, was er schon weiß. '
    + '(e) Vor der KI-Intensitätsstufen-Diagnose: erklären, dass er bei '
    + 'Unsicherheit mit Brian sprechen kann und Brian ihm eine Stufe empfiehlt '
    + '— die Entscheidung bleibt beim Schüler. '
    + '(f) Abschluss: Auswahl der Intensitätsstufe (vier Dashboards).',
  elemente: [
    {
      key: 'einfuehrung',
      titel: 'Kurze Einführung in die Einheit',
      zweck:
        'Motivierender, schülergerechter Einstieg: worum geht es in dieser '
        + 'Einheit, warum ist das relevant. Struktur (titel, intro, '
        + 'abschnitte[], optional bild). Reine Information, keine Bewertung.',
    },
    {
      key: 'fragenblock',
      titel: 'Freiwilliger Selbsteinschätzungs-Fragenblock',
      zweck:
        'FREIWILLIGE Selbsteinschätzung des Schülers (kein Test, keine '
        + 'Wertung). Hilft dem Schüler, seinen eigenen Stand/seine Motivation '
        + 'einzuordnen. Struktur (titel, intro, fragen[], hinweis). Der Schüler '
        + 'darf ihn überspringen oder sich stattdessen per Schieberegler selbst '
        + 'einschätzen.',
    },
    {
      key: 'einstiegsdiagnose',
      titel: 'Einstiegsdiagnose (Wissens-Quiz)',
      zweck:
        'Multiple-Choice-Wissensquiz zum Vorwissen für diese Einheit. Dient '
        + 'der Standortbestimmung vor dem Start und speist die Empfehlung für '
        + 'die Intensitätsstufe. Keine Note, aber verbindlich.',
    },
    {
      key: 'lerntyp_diagnose',
      titel: 'KI-Intensitätsstufen-Diagnose (Brian-Gespräch)',
      zweck:
        'IMMER das LETZTE Element der Orientierungsphase. Wenn der Schüler '
        + 'nach den vorherigen Elementen weiterhin unsicher ist, welche '
        + 'Intensitätsstufe zu ihm passt, spricht er mit dem KI-Lernbegleiter '
        + 'Brian. Struktur (titel, intro, gespraechs_leitfaden[], hinweis) PLUS '
        + '`brian_uebergabe` mit den vier Brian.study-Übergabefeldern '
        + '(dialog_name, learner_instruction, system_instruction, '
        + 'completion_rule). Dieses Element ist eine BRIAN-AUFGABE: baue hier '
        + 'den Einstieg in den Brian-Dialog und verwende die vier '
        + 'Übergabefelder unverändert — erfinde keine eigenen.',
    },
  ],
  hinweis_fuer_mbk:
    'Baue die Orientierungsphase als EINE, allen vier Dashboards '
    + 'vorgeschaltete Einstiegsseite der Einheit (nicht pro Dashboard '
    + 'wiederholen). Die konkreten Inhalte der vier Elemente stehen in '
    + 'Payload 2 unter `einheit.onboarding`. Fehlt dort ein Element (null), '
    + 'wurde es von der Lehrkraft noch nicht erzeugt und darf NICHT erfunden '
    + 'werden.',
};

export function buildOnboardingForStructure(konfig, inhaltSnapshots = []) {
  const k = konfig && typeof konfig === 'object' ? konfig : {};
  const obj = (v) => (v && typeof v === 'object' ? v : null);

  const snapByBaustein = new Map(
    (inhaltSnapshots || [])
      .filter((s) => s?.geltungsbereich === 'einheit' && typeof s?.baustein_id === 'string')
      .map((s) => [s.baustein_id, s])
  );
  const pick = (key) => obj(snapByBaustein.get(`onboarding_${key}`)?.inhalt) || obj(k[key]);

  const letzterSnapshot = [...snapByBaustein.values()]
    .filter((s) => s.baustein_id.startsWith('onboarding_'))
    .map((s) => s.generiert_am)
    .filter(Boolean)
    .sort()
    .pop();

  return {
    einfuehrung: pick('einfuehrung'),
    fragenblock: pick('fragenblock'),
    einstiegsdiagnose: pick('einstiegsdiagnose'),
    lerntyp_diagnose: pick('lerntyp_diagnose'),
    generiert_am: letzterSnapshot || k.generiert_am || null,
  };
}