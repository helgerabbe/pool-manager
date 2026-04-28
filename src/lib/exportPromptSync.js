/**
 * exportPromptSync.js
 *
 * Frontend-Logik für den Out-of-Sync-Vergleich und Workflow-Blocker
 * der MBK-Export-Prompts (Tab 9).
 *
 * Out-of-Sync = die zugrundeliegenden Quelldaten haben sich nach der
 * letzten Generierung des Prompts geändert. Wir vergleichen einfach
 * `prompt.source_updated_at` mit dem Maximum der `updated_date`-Werte
 * der referenzierten Datensätze.
 */

const PROMPT_TYPES = {
  NUCLEUS: 'nucleus',
  PERSONA: 'persona',
  SEKTOR: 'sektor_anweisung',
  ERSTELLUNGSPAKET: 'erstellungspaket',
};

export const LERNTYP_KEYS = ['minimalist', 'pragmatiker', 'ehrgeizig', 'passioniert'];

function maxTimestamp(records) {
  let max = 0;
  for (const r of records || []) {
    const t = r?.updated_date ? new Date(r.updated_date).getTime() : 0;
    if (t > max) max = t;
  }
  return max;
}

/**
 * Liefert das Maximum der `updated_date`-Werte aller Quellen, die für
 * den jeweiligen Prompt-Typ relevant sind.
 *
 * Mapping (siehe Spec):
 *   - nucleus           → Einheit + Themenfelder + Lernpakete + Lernziele
 *   - persona           → Einheit
 *   - sektor_anweisung  → Einheit (lernpfade_konfiguration steckt in der Einheit)
 *                         + Themenfelder (für Arbeitsphase-Titel)
 *   - erstellungspaket  → das spezifische Quell-Objekt + zugehörige Lernziele
 *                         (bei Lernpaket) bzw. nur die Aufgabe (bei AllgemeineAufgabe)
 */
export function computeSourceMaxTimestamp({ promptType, referenceId, einheit, themenfelder = [], lernpakete = [], lernziele = [], aufgabenbausteine = [], allgemeineAufgaben = [] }) {
  const ts = (rec) => (rec?.updated_date ? new Date(rec.updated_date).getTime() : 0);

  switch (promptType) {
    case PROMPT_TYPES.NUCLEUS:
      return Math.max(
        ts(einheit),
        maxTimestamp(themenfelder),
        maxTimestamp(lernpakete),
        maxTimestamp(lernziele),
      );
    case PROMPT_TYPES.PERSONA:
      return ts(einheit);
    case PROMPT_TYPES.SEKTOR:
      return Math.max(ts(einheit), maxTimestamp(themenfelder));
    case PROMPT_TYPES.ERSTELLUNGSPAKET: {
      // referenceId kann eine Lernpaket-ID oder eine AllgemeineAufgabe-ID sein.
      const lp = lernpakete.find((p) => p.id === referenceId);
      if (lp) {
        const zieleDesPakets = lernziele.filter((z) => z.lernpaket_id === referenceId);
        const aufgabenDesPakets = aufgabenbausteine.filter((a) => a.lernpaket_id === referenceId);
        return Math.max(ts(lp), maxTimestamp(zieleDesPakets), maxTimestamp(aufgabenDesPakets));
      }
      const aa = allgemeineAufgaben.find((a) => a.id === referenceId);
      if (aa) return ts(aa);
      return 0;
    }
    default:
      return 0;
  }
}

/**
 * Liefert true, wenn der gespeicherte Prompt im Vergleich zu den aktuellen
 * Quelldaten veraltet ist. Wenn der Prompt noch nicht generiert wurde
 * (`source_updated_at` ist leer), gilt er nicht als "out of sync" — er
 * existiert schlicht noch nicht.
 */
export function isPromptOutOfSync(prompt, sourceMaxTs) {
  if (!prompt || !prompt.source_updated_at) return false;
  const generatedTs = new Date(prompt.source_updated_at).getTime();
  return sourceMaxTs > generatedTs;
}

/**
 * Workflow-Blocker: Ein Erstellungspaket darf nur generiert werden, wenn
 * die Quelle freigegeben/abgeschlossen ist. Sonst wäre der Prompt
 * verfrüht und würde ggf. unfertige Inhalte an die KI weitergeben.
 *
 *   - Lernpaket          → is_complete === true
 *   - AllgemeineAufgabe  → content_status === 'approved'
 *
 * Andere Prompt-Typen (nucleus, persona, sektor) dürfen jederzeit
 * generiert werden — sie referenzieren nur Strukturdaten.
 */
export function isErstellungspaketBlocked({ referenceId, lernpakete = [], allgemeineAufgaben = [] }) {
  const lp = lernpakete.find((p) => p.id === referenceId);
  if (lp) {
    if (lp.is_complete === true) return null;
    return 'Das Lernpaket ist noch nicht vollständig (is_complete=false).';
  }
  const aa = allgemeineAufgaben.find((a) => a.id === referenceId);
  if (aa) {
    if (aa.content_status === 'approved') return null;
    return 'Die Aufgabe ist noch nicht freigegeben (content_status ≠ approved).';
  }
  return 'Quelle nicht gefunden.';
}

/**
 * Findet einen vorhandenen Prompt anhand der Eindeutigkeit
 * (einheit_id, prompt_type, reference_id).
 */
export function findExistingPrompt(prompts, { einheitId, promptType, referenceId = null }) {
  return prompts.find(
    (p) =>
      p.einheit_id === einheitId &&
      p.prompt_type === promptType &&
      (p.reference_id || null) === (referenceId || null)
  ) || null;
}