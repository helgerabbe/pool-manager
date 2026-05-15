/**
 * lernpaketAdapter.js
 *
 * Daten-Adapter zwischen der Collection `Lernpakete` und der UI des
 * Lernpfad-Architekten / Material-Pools.
 *
 * Hintergrund: Lernpakete liegen in einer eigenen Collection mit eigener
 * Feldstruktur (`titel_des_pakets`, `geschaetzte_dauer_minuten`, …) und
 * besitzen kein `aufgaben_typ`. Damit der Pool, der MonitorPanel und die
 * Sektor-Pills sie identisch wie reguläre `buendel`-Aufgaben behandeln
 * können, mappen wir sie hier auf das Aufgaben-Shape.
 *
 * Wichtige Mappings:
 *   - id                  → bleibt erhalten (eindeutig im Cockpit-Kontext)
 *   - titel_des_pakets    → titel
 *   - aufgaben_typ        → 'buendel'  (technischer Diskriminator)
 *   - lernpaket_logik     → Default 'standard' (kein test_only, da regulär)
 *   - _source             → 'lernpaket' (Hinweis für Debug / Spezial-UI)
 *
 * Falls die Lernpakete-Entität später ein eigenes Feld `lernpaket_logik`
 * (z. B. „test_only" für Zwischentests) bekommt, wird es hier 1:1
 * durchgereicht und die rote „Zwischentest"-Pille im Pool erscheint
 * automatisch — die UI prüft `lernpaket_logik === 'test_only'`.
 */

export function adaptLernpaketToPoolItem(lp) {
  if (!lp || !lp.id) return null;
  return {
    id: lp.id,
    titel: lp.titel_des_pakets || 'Lernpaket',
    aufgaben_typ: 'buendel',
    lernpaket_logik: lp.lernpaket_logik || 'standard',
    einheit_id: lp.einheit_id,
    themenfeld_id: lp.themenfeld_id,
    sync_status: lp.sync_status,
    content_status: lp.content_status,
    released_at: lp.released_at,
    released_by: lp.released_by,
    // Aggregat-Flag aus der Lernpakete-Entity. Quelle der Wahrheit für
    // „Lernpaket ist vollständig". Wird ausschließlich serverseitig
    // gesetzt (siehe Lernpakete-Schema, Feld `is_complete`).
    is_complete: lp.is_complete === true,
    geschaetzte_dauer_minuten: lp.geschaetzte_dauer_minuten,
    reihenfolge_nummer: lp.reihenfolge_nummer,
    // Diskriminator für später (z. B. abweichendes Verhalten beim Export).
    _source: 'lernpaket',
    // Eindeutiger Marker für die Ampel-Logik: Lernpakete werden NICHT wie
    // reguläre `buendel`-Aufgaben (AllgemeineAufgabe mit
    // verlinkte_lernpaket_ids) bewertet, sondern flach über `is_complete`
    // plus bewusste Lernpaket-Freigabe (`released_at`).
    _isLernpaket: true,
  };
}