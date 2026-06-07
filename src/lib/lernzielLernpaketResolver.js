/**
 * lernzielLernpaketResolver.js
 *
 * Hilfsfunktionen, um zu jedem (Basis-)Lernziel das zugehörige Lernpaket
 * aufzulösen. Wird im KI-Tutor-Prompt (Ebene-2-Aufgaben) verwendet, damit
 * Brian.study weiß, auf welches Lernpaket er einen Schüler verweisen kann,
 * wenn dieser ein bestimmtes Lernziel noch nicht erreicht hat.
 *
 * Quelle der Zuordnung:
 *  - reguläres Lernziel  → Lernziele.lernpaket_id  → Lernpakete.titel_des_pakets
 *  - Basis-Lernziel      → BasisLernziel.basislernpaket_id → Basislernpakete.titel
 *    (Fallback: das übergeordnete Basismodul, falls kein Basislernpaket-Titel)
 *
 * Lernziele ohne Lernpaket-Zuordnung werden mit `lernpaket: null` zurückgegeben –
 * Brian gibt in dem Fall den Hinweis, dass es (noch) kein Lernpaket gibt.
 */

/**
 * Baut eine einheitliche Liste aus regulären + Basis-Lernzielen, jeweils mit
 * aufgelöstem Lernpaket-Titel (oder null).
 *
 * @returns {Array<{ text: string, lernpaket: string|null, quelle: 'einheit'|'basismodul' }>}
 */
export function resolveLernzieleMitLernpaket({
  analyseItems = [],
  lernziele = [],
  basisLernziele = [],
  lernpakete = [],
  basislernpakete = [],
  basismodule = [],
  alleLernziele = [],
  alleBasisLernziele = [],
}) {
  const lpById = new Map((lernpakete || []).map((lp) => [lp.id, lp]));
  const blpById = new Map((basislernpakete || []).map((blp) => [blp.id, blp]));
  const bmById = new Map((basismodule || []).map((bm) => [bm.id, bm]));
  const lzById = new Map((alleLernziele || []).map((lz) => [lz.id, lz]));
  const blzById = new Map((alleBasisLernziele || []).map((lz) => [lz.id, lz]));

  const result = [];

  // ── Primäre Quelle: kuratierte Lernzielanalyse der Aufgabe ───────────────
  // (aufgabe.lernzielanalyse.items) – das ist die Liste, die der Lehrer im
  // Tab „Lernzielanalyse" per Klick übernommen hat.
  if (Array.isArray(analyseItems) && analyseItems.length > 0) {
    analyseItems.forEach((item) => {
      const text = item.text;
      if (!text) return;

      let lernpaket = null;
      let lernpaketId = null;
      if (item.quelle === 'bestehend' && item.lernziel_id) {
        const lz = lzById.get(item.lernziel_id);
        const lp = lz?.lernpaket_id ? lpById.get(lz.lernpaket_id) : null;
        lernpaket = lp?.titel_des_pakets || null;
        lernpaketId = lp?.id || null;
      } else if (item.quelle === 'basismodul' && item.basislernziel_id) {
        const blz = blzById.get(item.basislernziel_id);
        const blp = blz?.basislernpaket_id ? blpById.get(blz.basislernpaket_id) : null;
        const bm = blp?.basismodul_id ? bmById.get(blp.basismodul_id) : null;
        lernpaket = blp?.titel || bm?.basismodul_titel || bm?.titel || item.basismodul_titel || null;
        lernpaketId = blp?.id || null;
      }

      result.push({
        text,
        lernpaket,
        lernpaketId,
        quelle: item.quelle === 'basismodul' ? 'basismodul' : 'einheit',
      });
    });
    return result;
  }

  // ── Fallback: alte Mapping-Tabellen ──────────────────────────────────────
  // Reguläre Lernziele (Einheit)
  (lernziele || []).forEach((lz) => {
    const text = lz.schueler_uebersetzung || lz.formulierung_fachsprache || lz.title;
    if (!text) return;
    const lp = lz.lernpaket_id ? lpById.get(lz.lernpaket_id) : null;
    result.push({
      text,
      lernpaket: lp?.titel_des_pakets || null,
      lernpaketId: lp?.id || null,
      quelle: 'einheit',
    });
  });

  // Basis-Lernziele (Vorwissen aus Basismodulen)
  (basisLernziele || []).forEach((lz) => {
    const text = lz.text;
    if (!text) return;
    const blp = lz.basislernpaket_id ? blpById.get(lz.basislernpaket_id) : null;
    // Fallback: Titel des übergeordneten Basismoduls.
    const bm = blp?.basismodul_id ? bmById.get(blp.basismodul_id) : null;
    result.push({
      text,
      lernpaket: blp?.titel || bm?.titel || null,
      lernpaketId: blp?.id || null,
      quelle: 'basismodul',
    });
  });

  return result;
}